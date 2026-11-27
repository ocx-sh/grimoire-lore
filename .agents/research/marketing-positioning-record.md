---
title: Positioning record and drift
topic: marketing-positioning-record
program: product
sub_program: marketing
date: 2026-11-27
revised: 2026-11-27
model: opus
id_family: MKT-POS
consolidates:
  - marketing-positioning-record/positioning-brief-fields.md
  - marketing-positioning-record/positioning-canonical-sentence.md
  - marketing-positioning-record/positioning-alternatives-comparison.md
grounding:
  - product-audit/messaging-inventory.md
  - product-audit/config-inventory.md
  - product-audit/exemplar-landing-pages.md
  - product-audit/exemplar-readmes.md
---

# Positioning record and drift

## Verdict

1. **One record per product, one file, machine-readable: `.agents/positioning.toml`.** The brief-fields dive proposed a prose brief at `.agents/positioning.md` with YAML frontmatter. The canonical-sentence dive proposed a data file, `positioning.toml`, at the repo root, with the prose brief "above it, not parsed". Two files are two sources, and two sources are what produced 61 one-liners for 17 repos ([messaging-inventory.md §4](product-audit/messaging-inventory.md)). So I merged them. The file is TOML because Python's standard-library `tomllib` parses it, so the drift check needs no extra dependency. TOML also matches the sibling `claims.toml` ([claims-evidence-record.md §7](marketing-claims-evidence/claims-evidence-record.md)). The file lives under `.agents/` because no single client owns that location, and the fleet already keeps plans, ADRs and specs there. Prose fields such as audience, attributes and do-not-say become TOML strings and tables in the same file.
2. **The record holds the output of positioning, never the positioning work.** Dunford calls fill-in-the-blank statements "not only pointless but potentially dangerous" ([Lenny's Newsletter, 2021-01-26](https://www.lennysnewsletter.com/p/positioning)). Audience, category, alternatives and style are owner decisions. An agent may copy them from existing repo text into a draft marked `unreviewed`. It never invents them.
3. **No Moore seven-slot sentence is stored.** The brief-fields dive made "all seven slots in one sentence" a MUST. The canonical-sentence dive needs a short sentence that fits a manifest and a meta description. Those two needs conflict. Resolution: the record's separate fields already are the seven slots (audience, need through the alternative, product, category, benefit, alternative, differentiator). A missing slot is therefore a missing field, and the schema check catches it. The public `sentence` is a different thing: one sentence that names the category noun and the object noun, with no list and no unrecorded claim word.
4. **Verbatim where the text can be generated; nouns elsewhere.** The exemplar corpus does not support verbatim reuse: only 5 of 22 products reuse one sentence across About, README and meta, and only 3 of 22 carry one category noun on all four surfaces ([canonical-sentence §4.2](marketing-positioning-record/positioning-canonical-sentence.md)). I still require byte equality on four surfaces: manifest description, README tagline, home meta description and og:description. Equality costs nothing once those surfaces are generated from or checked against the record. It is also the cheapest check against an agent that writes a new tagline in every file. Title, hero h1, docs-home lead and GitHub About only need the nouns, which follows exemplar practice.
5. **The canonical sentence carries no enumerated list.** Grimoire's sentence embeds 4 of the 8 artifact kinds (`grimoire-rs/grimoire/Cargo.toml:21` against `src/oci/artifact_kind.rs:82`). The best-reused sentence in the fleet therefore carries a wrong 4-item list on 3 source surfaces (`Cargo.toml:21`, `README.md:7`, `docs/src/pages/index.astro:37-38`, which also renders the live meta). Across the family, 6 of the 8 surfaces that list kinds are wrong: three show 4 kinds and three show 5 ([canonical-sentence §4.4](marketing-positioning-record/positioning-canonical-sentence.md)). A list must be generated from its code source, or replaced by a count plus a link.
6. **A missing or stale record freezes the product identity, not all work.** One dive said "refuse and ask" (P-1). The other said "write an unreviewed draft" (rule 11). With no human in the loop, a refusal never ends. Resolution: the agent drafts the record and writes `ASK-OWNER` in every field it cannot source. It may make every other edit. It may not change the sentence, the category noun or the object noun on any surface until the owner sets `status = "reviewed"`.
7. **Naming the alternative is required in the record and recommended on the README.** The brief-fields dive made a README mention a MUST. The alternatives dive made it a SHOULD. Exemplar practice decides the question: 6 of 40 upstream READMEs name an alternative, and uv, Bun and Deno move comparisons to their docs ([alternatives §3](marketing-positioning-record/positioning-alternatives-comparison.md)). So `alternatives` is a MUST field in the record. On the README, a bare name or link is a SHOULD. A factual claim about an alternative never appears without a comparison record.
8. **Comparison facts use the MKT-CLAIM evidence record and its refresh default, not a separate 13-field row with a 12-month window.** No cited law sets a staleness window ([alternatives, Findings 1](marketing-positioning-record/positioning-alternatives-comparison.md)). The alternatives dive's 12 months (6 for version facts) and MKT-CLAIM-05's comparison default (90 days, or the next minor release of the subject or any compared product, whichever is first) are both project judgement. I use the MKT-CLAIM-05 default, so one default per class keeps the lint simple. It also fits the fleet's only comparison, which states versions that move at the competitor's release cadence (brew, winget, Debian; `landing-content.ts:9-18`). The rule's MUST binds only that `refresh_by` exists and that the lint fails when it passes. The window is a labelled project default. From the alternatives dive's row I keep two fields. Each enforces something the MKT-CLAIM schema does not, because MKT-CLAIM-04 holds both sides' versions in one `subject_version` field. The two fields are `competitor_version` (the competitor's exact version, never `latest`) and `competitor_strength` (the fairness test). Both go to MKT-CLAIM as field requests (open question 9).
9. **Loading is part of the rule, not an afterthought.** For a README edit, 0 of 7 fleet briefs reach the agent ([brief-fields §2](marketing-positioning-record/positioning-brief-fields.md)). For Claude Code, the catalog rule that carries this set must be path-scoped to every governed surface. Otherwise every rule below sits idle on the most-edited surface. For the other clients grim installs into, path-scoped loading was not checked. So the set also puts one pointer line in `AGENTS.md`. Whether each of those clients reads that line was not checked either (open question 2).
10. **Out of territory, one line each.** One `<h1>` per page is owned by ux (topic-map row h1-count). Where the maturity line sits is owned by MKT-PAGE (page-hero-status). Method and benchmark evidence are owned by MKT-CLAIM (MKT-CLAIM-06). GitHub topics, homepage and social preview are owned by channels. Only the About description string is governed here.
11. **Documented gap: the owner gate cannot be told apart from an agent that commits as the owner.** MKT-POS-04 depends on only the owner flipping `status`. Its git check compares commit authors with a list held outside the repository. In this fleet, agent sessions commit under the owner's git identity: the session git user is the owner. The check then passes for an agent flip. The prohibition is still a MUST, but nothing mechanical enforces it. A signed-commit or required-reviewer gate would close the gap, and it needs a research round.

## The record

The schema, as decided. Field names are part of the contract: published rules cite them. Keys not in the MKT-POS-02 required list are optional. An absent optional key means empty: no parent, no trend-word ban, no sources, no exemptions, no attributes.

```toml
# .agents/positioning.toml  (at most 80 lines; one per product repository)
status      = "reviewed"            # reviewed | unreviewed ; only the owner writes "reviewed"
reviewed    = 2026-11-27            # a draft holds the draft date here and in review_by
review_by   = 2027-05-27            # default reviewed + 6 months
owner       = "<name or role>"
product     = "grim"
parent      = ""                    # optional: "owner/repo" of the family record; empty = family root
style       = "big-fish-small-pond" # head-to-head | big-fish-small-pond | new-game

sentence    = "Package manager for AI-agent config, installed into each coding agent in the format it reads."
category    = "package manager"
object      = "AI-agent config"
forbidden   = ["AI artifacts", "AI-config packages", "AI-agent configuration"]
forbidden_allow = []                # optional: path globs exempt from the forbidden scan; owner adds them
trend_words = { hero = "banned", list = ["agentic", "AI-native"] }   # optional

audience    = "<role or behaviour + context>"
non_target  = ["<who should not use it, as a checkable condition>"]
audience_evidence = "<issue link, quote, usage figure, or 'none yet'>"
maturity    = "<status wording MKT-PAGE places beside hero claims>"

[sources]                           # required while status = "unreviewed": field = "path:line" it was copied from
audience = "README.md:6"

[[alternatives]]                    # first entry = what the audience does today
name = "hand-copied files per client"
kind = "behaviour"                  # behaviour | tool | nothing
url  = ""

[[attributes]]                      # optional
text  = "pinned by digest in a lockfile"
claim = "mech-lockfile"             # MKT-CLAIM record id, or "unproven" (never on a surface)

[lists.artifact_kinds]
source  = "src/oci/artifact_kind.rs"
extract = "awk '/pub enum ArtifactKind/,/^}/' src/oci/artifact_kind.rs | grep -E '^    [A-Z][a-z]+,?$'"

[[do_not_say]]
text      = "drift detection"
pattern   = "(?i)drift (detection|check)"
reason    = "grim status is a report, not a gate"
instead   = "grim status reports differences"
lift_when = "grim status exits non-zero on drift"
```

The optional `awareness` and `switching` tables were removed with MKT-POS-19 (retired).

## The ruleset

Severity: MUST, SHOULD or CONSIDER. "Governed surface" means one of these: README tagline line and first screen; manifest `description` (`Cargo.toml`, `package.json`, `pyproject.toml`, VS Code `package.json`); home `<title>`, `<meta name="description">`, `og:description` and hero h1; the docs-home lead sentence; the GitHub About description. "The record" means `.agents/positioning.toml`. "The reference check" means `positioning_check.py` in the next section.

| ID | Rule | Rationale | Verification | Sev |
|---|---|---|---|---|
| MKT-POS-01 | Keep exactly one positioning record per product repository, at `.agents/positioning.toml`, at most 80 lines. Remove positioning fields (tagline, target users, competitive matrix) from `product-context.md` and other rule files, and replace them with a one-line pointer to the record. | Today positioning sits in 7 `product-context.md` files in 7 of 17 directories, plus one unloaded spec, and none of them is the single source. 6 of the files sit under `.claude/rules/`, which the audit counts as 6 variants (config-inventory.md line 221). The 7th is `ocx-sh/devcontainer-features/.agents/product-context.md`. Command, from `/home/mherwig/dev`, run 2026-11-27: `find ocx-sh grimoire-rs -name product-context.md -not -path '*/node_modules/*' -not -path '*/target/*' -not -path '*/.agents/worktrees/*'` prints 7. | `test -f .agents/positioning.toml && [ $(wc -l < .agents/positioning.toml) -le 80 ]`; `grep -n -i -E '^#+ .*(positioning\|tagline\|target users\|competitive)' .claude/rules/*.md AGENTS.md CLAUDE.md 2>/dev/null` prints only lines that point at the record. | MUST |
| MKT-POS-02 | Fill every required field: `status`, `reviewed`, `review_by`, `owner`, `style`, `sentence`, `category`, `object`, `forbidden`, `audience`, `non_target`, `alternatives` (at least 1), `maturity`. `lists` and `do_not_say` must exist, even when empty. Every other key is optional, and an absent optional key means empty. | A date comparison and a field check are mechanical. Prose briefs carry no review date: 0 of 7 fleet briefs have a `review_by`, and 0 of 7 have a category noun or a do-not-say list (brief-fields §2 tally). `style` is required because it is an owner decision (Verdict 2), and MKT-POS-03 can then mark it `ASK-OWNER`. | `python3 -I positioning_check.py fields` exits 0. | MUST |
| MKT-POS-03 | Read the record before writing or editing any governed surface. If no record exists, draft one from existing repo text with `status = "unreviewed"`. Set `reviewed` and `review_by` to the draft date. For each other required field, either cite the line you copied it from as `sources.<field> = "path:line"`, or write `ASK-OWNER`. Report the `ASK-OWNER` fields to the owner. Never invent an audience, a category, an alternative or a differentiator. | 12 of 17 fleet directories have no audience text to copy (brief-fields §2). Without the record, an agent writes "developers and teams". | Dry run in a repo with no record: the session's first write is `.agents/positioning.toml` with `status = "unreviewed"`, not a copy file. `python3 -I positioning_check.py sourced` exits 0. For every required field from `owner` on, the value contains `ASK-OWNER`, or `sources.<field>` names a `path:line` that exists. | MUST |
| MKT-POS-04 | Never change the product sentence, the category noun or the object noun on any surface while `status` is not `reviewed` or `review_by` is earlier than today. Never set `status = "reviewed"` and never move `review_by` yourself. | Positioning facts decay. Dunford's cadence is "every 6 months and after major events" (secondary notes, [Commoncog, updated 2025-01-07](https://commoncog.com/obviously-awesome/)). The owner flip is the only human gate this design keeps. Verdict 11 records that no check enforces it against an agent that commits as the owner. | Drift check (MKT-POS-11) exits 1 when `status != "reviewed"` or `review_by < $(date +%F)` and the diff changes a governed surface's sentence or noun. Owner check: `git log --format=%ae -G '^(status\|review_by)[[:space:]]*=' -- .agents/positioning.toml \| sort -u` prints only addresses in the CI variable `POSITIONING_OWNERS`. That variable is set in CI settings, outside the repository, so a repository edit cannot extend it. Limit: an agent that commits under an owner address passes this check (Verdict 11). | MUST |
| MKT-POS-05 | Write `audience` as one segment: a role or a behaviour, plus its context. Write `non_target` as conditions a reader can check. If the owner wants a broader audience, record the reason in the file. | The fleet names an audience on 1 of 17 headline surfaces (messaging-inventory.md §6). Moore and Dunford both narrow the audience. Ehrenberg-Bass argues the other way, which is why an override with a reason is allowed. | Mechanical floor only: reject `audience` matching `^(developers\|engineers\|teams\|everyone\|anyone)( and (developers\|teams))?\.?$` (case-insensitive). The floor catches the measured default, nothing more. It passes "software developers who build things". Whether the text names one segment is a reading heuristic and not a mechanical check: pass "Platform engineers who pin CLI tools across CI and laptops"; fail "developers and teams". | MUST |
| MKT-POS-06 | Make the first `alternatives` entry what the audience does today without the product. That can be a behaviour ("a curl-and-chmod script per tool"), a tool, or doing nothing. It is never "other tools". Name a competitor on a public surface only if it is in this list. | Dunford derives every later field from the alternative ([Commoncog](https://commoncog.com/obviously-awesome/)). An agent defaults to naming famous competitors and skips the incumbent habit. | `python3 -I -c "import tomllib;a=tomllib.load(open('.agents/positioning.toml','rb'))['alternatives'][0]['name'];assert a.strip().lower() not in ('other tools','competitors','alternatives','')"`. Each competitor name on a surface (from the comparison arm of the MKT-CLAIM-02 patterns) appears in `alternatives[*].name`. | MUST |
| MKT-POS-07 | Write `sentence` as one sentence that contains `category` and `object`, contains no enumerated list of three or more items, no word from `trend_words.list` when `hero = "banned"`, and no objective-claim word (MKT-CLAIM-02 patterns) unless an `attributes` entry carries its claim id. | A list inside the sentence spreads to every copy of it (grimoire: 4 of 8 kinds on 3 source surfaces, Verdict 5). A sentence without the object noun tells a searcher nothing ("OCX lore, a Grimoire package index."). | `python3 -I positioning_check.py sentence` exits 0, then the MKT-CLAIM-02 pattern file runs over the sentence. The list test fails on `item, item, and item`, `item, item and item` and longer lists, with items of up to 3 words. Seeded fails in `selftest`: both 3-item forms, the grimoire `Cargo.toml:21` sentence, and `The simple package manager` (no object noun). Pass: "Package manager for AI-agent config, installed into each coding agent in the format it reads." Known false fail: an appositive of two short clauses ("config, installed and pinned"). Rewrite such a sentence. | MUST |
| MKT-POS-08 | Apply the surface match table. Manifest `description`, the README tagline line, the home `<meta name="description">` and the home `og:description` equal `sentence` after whitespace, case and trailing-period normalisation. The meta description may add one more sentence. The GitHub About starts with `sentence`. Home `<title>`, hero h1 and the docs-home lead each contain the product name or `category` or `object`. When the h1 is a slogan with neither noun, the `<title>` or the subhead carries `category`. | 61 distinct one-liners for 17 repos (messaging-inventory.md §4). Exemplars agree on the noun in About (18 of 22) and meta (15 of 22) and use the h1 for a slogan (7 of 22 have the noun in it) (canonical-sentence §4.2). Google builds title links from the title and headings and may rewrite a title that disagrees with them ([Google title links, undated, fetched 2026-11-27](https://developers.google.com/search/docs/appearance/title-link)). | Drift check (MKT-POS-11). It reads the README's first prose line of 5 or more words; the manifest field; `<title>`, `name="description"`, `og:description` and every `<h1>` from the built `dist/index.html` (not the live site); and the About text via `gh repo view <slug> --json description -q .description`. It compares the normalised strings and the nouns, and exits 1 on any mismatch. | MUST |
| MKT-POS-09 | Never use a `forbidden` variant of the category or object noun on a governed surface or in docs prose. Add a rejected term to `forbidden` when you find it. Never add a `forbidden_allow` entry yourself: propose it to the owner. | One Grimoire family uses four object nouns: "AI-agent config", "AI-agent configuration", "AI artifacts" and "AI-config packages" (canonical-sentence §4.4). A blank `forbidden` entry passed to `grep -F -f` matches every line, so the reference check drops blank entries. The scan covers governed surfaces and docs prose, not agent config. `grimoire-rs/grimoire/.claude/skills/meta-maintain-config/SKILL.md:153` uses "AI artifacts" about agent config, and the scan does not reach it. | `python3 -I positioning_check.py forbidden` exits 0. It scans the `SURFACES` globs (README files, `CHANGELOG.md`, manifests, `docs/`, `site/`, `website/` prose, `dist/index.html`) and skips files that match `forbidden_allow`. Measured 2026-11-27 with the three Grimoire terms: on `grimoire-rs/grimoire` it reports `catalog/README.md:3`, `docs/src/content/docs/introduction.md:3` and `concepts.md:3`; on `grimoire-rs/vscode` it reports `README.md:8`, `README.md:11` and `package.json:4`. Optional prose gate: a Vale `substitution` rule generated from `forbidden` ([Vale docs, undated](https://docs.vale.sh/checks/substitution)), then `vale --minAlertLevel=warning docs README.md` reports 0. | MUST |
| MKT-POS-10 | Never type an enumerated list of the product's kinds, clients, platforms or modules into a surface. Render it from its `[lists.*]` source, or write "N <things>" with N generated, plus a link. Use the count form in About and meta. | 2 of 8 Grimoire surfaces that list kinds match the 8-member enum, and both of those are hand copies that are correct only by luck (canonical-sentence §4.4). | For each `[lists.<name>]` entry, the drift check runs `extract`, pulls the items or the count from each surface, and asserts set equality (or N equality). Seeded failure: an About with 5 of 8 kinds must exit 1. | MUST |
| MKT-POS-11 | Run the drift check in CI on every change to a governed surface, the record, or a `[lists.*]` source, after the site build. It fails on: a missing required field, a stale or unreviewed record with a changed identity (MKT-POS-04), a sentence or noun mismatch, a forbidden variant, a list mismatch, or a `do_not_say` pattern hit. | The fleet's checks pin other things. `landing_check.py` checks router-card hrefs and `landing.test.ts` checks the ocx h1 literal. No check links the tagline to the head, the README or the manifest (canonical-sentence §2). A prototype found two real gaps on grimoire.rs (§4.5). | The CI job exists and lists the record among its path triggers. A seeded fault in each of the six classes makes it exit 1, and the clean tree exits 0. | MUST |
| MKT-POS-12 | For Claude Code, path-scope the rule that carries this set to every governed surface, with each glob as its own `paths:` item: `README.md`, `**/README.md`, `CHANGELOG.md`, `Cargo.toml`, `package.json`, `pyproject.toml`, `.agents/positioning.toml`, plus the repository's docs-home file and site head and landing source. For the other clients, add this line to the repository's `AGENTS.md`: "Before editing README.md, CHANGELOG.md, a manifest description or the site head, read `.agents/positioning.toml`." | Claude Code loads a path-scoped rule when Read, Write or Edit touches a matching file ([Claude Code memory docs, fetched 2026-11-27](https://code.claude.com/docs/en/memory)). No fleet brief lists a README glob, so 0 of 7 load for a README edit (brief-fields §2). For the other clients grim installs into, path-scoped loading was not checked. `AGENTS.md` is the location no single client owns ([agents.md, undated](https://agents.md/)), but whether each client reads it was not checked either (open question 2). The line costs one line and its presence is checkable. | `python3 -I positioning_check.py globs <rule file> <docs-home file> <site head file>` exits 0. The check loops over every required glob, `CHANGELOG.md` included, and fails on each glob that is not its own `paths:` item. A count of matching lines is not used, because one README line plus one `**/README.md` line would pass it. `grep -c -F '.agents/positioning.toml' AGENTS.md` is at least 1. Load check: the `InstructionsLoaded` hook (same docs page) logs the rule on a README edit. | MUST |
| MKT-POS-13 | Write each product-specific ban as a `do_not_say` entry with `pattern`, `reason`, `instead` and `lift_when`. Never remove an entry or meet its `lift_when` yourself; report that it looks met. | The fleet's only do-not-say list has the right shape (reason plus replacement for each item) but sits in a spec no session loads (`grimoire-rs/grimoire/.agents/specs/design_brief_landing_page.md:101-118`; config-inventory.md smell 4). | Schema: every entry has the four keys. The drift check runs each `pattern` over the governed surfaces and the docs, and any hit exits 1. | MUST |
| MKT-POS-14 | Put each factual statement about a named alternative (a version, a feature present or absent, a number, availability) in an MKT-CLAIM record of class `comparison`. The record carries `competitor_version` (exact; never `latest`, `current`, `stable` or empty), `subject_version`, `observed`, `refresh_by` and `competitor_strength`. Render `observed`, both versions and the `competitor_strength` text on the same built page as the statement. Never put a word from the denigration list in a sentence that names a competitor. `refresh_by` must exist, and the lint must fail once it passes. Then re-run the comparison or delete the sentence; never add an "as of" hedge. The window is the MKT-CLAIM-05 project default: 90 days, or the next minor release of the subject or any compared product, whichever is first. | EU Directive 2006/114/EC Art. 4(c) requires "material, relevant, verifiable and representative" features and Art. 4(d) forbids denigration ([OJ L 376, in force 2007-12-12](http://publications.europa.eu/resource/celex/32006L0114)). UCPD Art. 7(1) covers misleading omission ([OJ L 149, 2005](http://publications.europa.eu/resource/celex/32005L0029)). 16 CFR 14.15 requires that "bases of comparison" be "clearly identified" ([eCFR, statement of 1979-08-13](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-14/section-14.15)). The FTC needs a reasonable basis before dissemination ([1984 statement](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)). None of these texts sets a staleness window, so the 90 days is project judgement (Verdict 8). The ban-word scan is the checkable form of Art. 4(d). The rendered `competitor_strength` is the checkable form of the omission risk and of the PostHog fairness policy (vendor policy, [handbook](https://posthog.com/handbook/marketing)). Upstream, 2 of 12 README comparison units show a date (alternatives §3). Law rows: refresh_by 2027-05-27. | `grep -n -E '^\s*competitor_version\s*=\s*"(latest\|current\|stable\|)"' claims.toml` prints nothing, and every `class = "comparison"` record has the field (MKT-CLAIM lint check A, once the field request lands). For each comparison record, `grep -c -F "<observed>" dist/<page>.html` is at least 1, and both version strings and the `competitor_strength` string each appear in that file. MKT-CLAIM-05 lint check D fails when `refresh_by < today`. `python3 -I positioning_check.py denigration .agents/positioning.toml dist/<page>.html` exits 0. It reads each sentence of the built page that names an `alternatives` entry of kind `tool`. A whole-page grep is not a proximity check. `grep -n -i -E 'as of (writing\|now\|today)' dist/<page>.html` prints nothing. | MUST |
| MKT-POS-15 | Generate the home meta description, og:description and any rendered tagline from `sentence` at build time. Static manifests that cannot read the record (`Cargo.toml`) stay hand-written and are guarded by MKT-POS-11. | Generation prevents drift, while a check only detects it. Grimoire already renders tiles from `docs/src/data/landing.ts` but types its tagline by hand in three files (canonical-sentence §2). | `grep -rn "positioning.toml" <site config or data module>` shows the read. After a change to `sentence` alone, the build plus MKT-POS-11 passes with no other edit. | SHOULD |
| MKT-POS-16 | In a component repo (extension, GUI, plugin, index site), set `parent` and use the parent's `category`/`object` nouns and a superset of its `forbidden` list. Use a noun of your own only after the owner records why in `noun_reason`. | grim-gui calls itself "application", "front end" and "shell"; the VS Code listing calls the object "AI artifacts" (messaging-inventory.md §4). | Runs only when `parent` is non-empty: `gh api repos/<parent>/contents/.agents/positioning.toml -H 'Accept: application/vnd.github.raw' > /tmp/p.toml`, then a `tomllib` comparison: `object` is equal and `forbidden` is a superset, or the child record carries a `noun_reason` key. An empty or absent `parent` marks a family root, and the check is skipped. Whether a repository is a component is an owner decision. | SHOULD |
| MKT-POS-17 | Name the audience (from `audience`) in the README's first 10 lines. Name `alternatives[0].name` in the README as a bare name or link, either in the first screen or in a section titled "Alternatives", with no factual claim attached. | 6 of 40 upstream READMEs name an alternative. just, lazygit and gh do so with no claim attached, and uv, Bun and Deno move comparisons to docs (alternatives §3). Fleet: audience in 1 of 17 READMEs, alternative in 0 of 18 (exemplar-readmes.md smell 5). | `head -10 README.md \| grep -i -c -F "<audience phrase>"` is at least 1. The audience phrase is `audience` up to its first " who ", " that " or comma. `grep -i -c -F "$(python3 -I -c "import tomllib;print(tomllib.load(open('.agents/positioning.toml','rb'))['alternatives'][0]['name'])")" README.md` is at least 1. Any README sentence with that name and a comparison verb needs a claim id (MKT-POS-14). | SHOULD |
| MKT-POS-18 | Keep one docs page that says when not to use the product. Put each `non_target` entry on it as a bullet, 3 to 7 bullets in total, each naming a better fit or "no tool here does this". Link it from the README in one line. | Exemplars state limits on dated, versioned pages (ripgrep's "Why shouldn't I use ripgrep?", uv pip compatibility, Bun, Deno, Ruff FAQ; alternatives §3). Omitting material information is a misleading-omission risk (UCPD Art. 7(1)). No study shows a conversion effect, so this is a SHOULD. What makes it checkable is the binding to `non_target`, which the owner reviews. Whether each bullet can be falsified stays a reading check: pass "You need a portable POSIX tool: use grep"; fail "Not for everyone". | `grep -rl -i -E '^#+.*(when not\|not (to )?use\|limitations\|shouldn.t use)' docs` returns exactly 1 page. Each `non_target` string appears on that page (`grep -c -F`). The bullet count is 3 to 7. `README.md` contains a link to that page's path. | SHOULD |
| MKT-POS-19 | **Retired 2026-11-27.** It optionally recorded `awareness` per surface and `switching` forces and opened problem-aware surfaces with the problem. | Its only sources were reader's notes of Schwartz on archive.org and the jobstobedone.org site. No primary text was fetched, and the check was a two-line reading heuristic. See Revision log. | None. | retired |

Dropped from the dives, each with the reason:
- Moore sentence field: replaced by the fields themselves (Verdict 3).
- Competitor logo ban (PAC-09): the trademark law behind it was not fetched, and an unverified law gets no rule.
- Method linkage (PAC-04, PAC-13, PAC-14): owned by MKT-CLAIM (MKT-CLAIM-05 for refresh, MKT-CLAIM-06 for the method page).
- One `<h1>` (P-10): owned by ux.
- `status_claim` placement (brief rule 17): owned by MKT-PAGE. The `maturity` field stays in the record as its source.
- Attributes with proof (brief rule 13): merged into the `attributes.claim` binding of MKT-POS-07.
- "Reviewed older than one release" (P-13): `[lists]` sources are re-checked on every run, so release-driven drift fails MKT-POS-11 directly.
- Awareness stage and JTBD switching forces (brief rules 14, 15): retired with MKT-POS-19 for want of a primary source.

## Reference checks

`positioning_check.py` implements the mechanical parts of MKT-POS-02, 03, 07, 09, 12 and 14. Run it from the repository root. `python3 -I positioning_check.py selftest` runs the seeded cases. It passed on 2026-11-27, and the fleet measurements in MKT-POS-09 and the Applied table were taken with this file.

```python
# positioning_check.py - reference checks for MKT-POS-02, 03, 07, 09, 12, 14.
# Usage: python3 -I positioning_check.py <check> [args]; exit 1 on any finding.
import json, pathlib, re, sys, tomllib, fnmatch

REQ = ('status reviewed review_by owner style sentence category object '
       'forbidden audience non_target alternatives maturity').split()
# Optional keys; absent means empty: parent, trend_words, sources, forbidden_allow, attributes.

def fields(d):                                   # MKT-POS-02
    return [k for k in REQ if not d.get(k)] + [k for k in ('lists', 'do_not_say') if k not in d]

def sourced(d, root='.'):                        # MKT-POS-03
    bad, src = [], d.get('sources', {})
    for k in REQ[3:]:                            # status, reviewed, review_by are set, not sourced
        if 'ASK-OWNER' in json.dumps(d.get(k, '')):
            continue
        p, _, n = src.get(k, '').rpartition(':')
        f = pathlib.Path(root, p)
        if not (p and n.isdigit() and f.is_file()
                and 1 <= int(n) <= len(f.read_text(errors='replace').splitlines())):
            bad.append(k)
    return bad

LIST = re.compile(r"[\w'-]+(?: [\w'-]+){0,2}, [\w'-]+(?: [\w'-]+){0,2},? (?:and|or) [\w'-]+", re.I)

def sentence(d):                                 # MKT-POS-07 (claim words: run the MKT-CLAIM-02 file too)
    s, e = d['sentence'], []
    if re.search(r'[.!?] ', s): e.append('more than one sentence')
    e += ['missing ' + k for k in ('category', 'object') if d[k].lower() not in s.lower()]
    if LIST.search(s): e.append('list of 3+ items')
    tw = d.get('trend_words', {})
    if tw.get('hero') == 'banned':
        e += ['trend word ' + w for w in tw.get('list', []) if w.lower() in s.lower()]
    return e

SURFACES = ['README.md', '*/README.md', 'CHANGELOG.md', 'Cargo.toml', 'package.json', 'pyproject.toml',
            'docs/**/*.md', 'docs/**/*.mdx', 'docs/**/*.astro', 'site/**/*.md*', 'website/**/*.md*',
            'dist/index.html']

def forbidden(d, root='.'):                      # MKT-POS-09
    terms = [t.lower() for t in d.get('forbidden', []) if t.strip()]   # a blank entry never matches all
    allow, hits = d.get('forbidden_allow', []), []
    for g in SURFACES:
        for f in pathlib.Path(root).glob(g):
            rel = f.relative_to(root).as_posix()
            if not f.is_file() or '/node_modules/' in rel or any(fnmatch.fnmatch(rel, a) for a in allow):
                continue
            for i, line in enumerate(f.read_text(errors='replace').splitlines(), 1):
                hits += [f'{rel}:{i}: {t}' for t in terms if t in line.lower()]
    return hits

GLOBS = ['README.md', '**/README.md', 'CHANGELOG.md', 'Cargo.toml', 'package.json',
         'pyproject.toml', '.agents/positioning.toml']

def globs(rule_text, extra=()):                  # MKT-POS-12: every glob is its own `paths:` item
    fm = rule_text.split('---')[1] if rule_text.startswith('---') else ''
    items = {m.group(1) for m in re.finditer(r"(?m)^\s*-\s*['\"]?([^'\"\n]+?)['\"]?\s*$", fm)}
    return [g for g in [*GLOBS, *extra] if g not in items]

BAN = re.compile(r'\b(bloated|slow|clunky|ancient|outdated|legacy|dead|broken|painful|terrible|worse)\b', re.I)

def denigration(html, names):                    # MKT-POS-14: same sentence as a competitor name
    text = re.sub(r'<[^>]+>', ' ', html)
    return [s.strip()[:120] for s in re.split(r'(?<=[.!?])\s+', text)
            if any(n.lower() in s.lower() for n in names) and BAN.search(s)]

def selftest():
    b = dict(status='reviewed', reviewed='x', review_by='y', owner='o', style='new-game', sentence='s',
             category='package manager', object='AI-agent config', forbidden=['AI artifacts'], audience='a',
             non_target=['b'], alternatives=[{'name': 'c'}], maturity='m', lists={}, do_not_say=[])
    S = lambda s, **kw: sentence({**b, 'sentence': s, **kw})
    assert S('Package manager for AI-agent config, installed into each coding agent in the format it reads.') == []
    for s in ('Package manager for AI-agent config: skills, rules, and agents.',     # 3 items, Oxford comma
              'Package manager for AI-agent config: skills, rules and agents.',      # 3 items, no Oxford comma
              'Package manager for AI-agent config — skills, rules, agents, and MCP servers, installed '
              'into every coding agent you use',                                     # grimoire Cargo.toml:21
              'Package manager for AI-agent config for Claude Code, Cursor or OpenAI Codex CLI.'):
        assert 'list of 3+ items' in S(s), s
    assert 'missing object' in S('The simple package manager')                       # ocx Cargo.toml:19
    assert S('Package manager for AI-agent config. Fast.') == ['more than one sentence']
    assert S('Agentic package manager for AI-agent config',
             trend_words={'hero': 'banned', 'list': ['agentic']}) == ['trend word agentic']
    assert fields(b) == [] and fields({k: v for k, v in b.items() if k != 'style'}) == ['style']
    assert fields({k: v for k, v in b.items() if k != 'lists'}) == ['lists']
    me = pathlib.Path(__file__).name
    dr = {**b, 'status': 'unreviewed', 'audience': 'ASK-OWNER', 'non_target': ['ASK-OWNER'],
          'sources': {k: me + ':1' for k in ('owner style sentence category object forbidden '
                                              'alternatives maturity').split()}}
    root = pathlib.Path(__file__).parent
    assert sourced(dr, root) == []
    assert sourced({**dr, 'audience': 'developers'}, root) == ['audience']
    assert sourced({**dr, 'sources': {**dr['sources'], 'maturity': me + ':99999'}}, root) == ['maturity']
    assert denigration('apt ships Node 18. Our legacy mode is opt-in.', ['apt']) == []
    assert denigration('<p>apt ships ancient Node.</p> ocx is new.', ['apt']) == ['apt ships ancient Node.']
    fm = '---\npaths:\n  - "README.md"\n  - \'**/README.md\'\n  - CHANGELOG.md\n  - README.md.bak\n---\nbody\n'
    assert globs(fm) == ['Cargo.toml', 'package.json', 'pyproject.toml', '.agents/positioning.toml']
    assert globs('no frontmatter') == GLOBS
    print('selftest ok')

if __name__ == '__main__':
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'selftest':
        selftest(); sys.exit(0)
    if cmd == 'globs':
        out = globs(pathlib.Path(args[0]).read_text(), args[1:])
    elif cmd == 'denigration':
        rec = tomllib.load(open(args[0], 'rb'))
        names = [a['name'] for a in rec['alternatives'] if a.get('kind') == 'tool']
        out = denigration(pathlib.Path(args[1]).read_text(errors='replace'), names)
    else:
        rec = tomllib.load(open('.agents/positioning.toml', 'rb'))
        out = {'fields': fields, 'sourced': sourced, 'sentence': sentence, 'forbidden': forbidden}[cmd](rec)
    print('\n'.join(out) if out else 'ok')
    sys.exit(1 if out else 0)
```

## Applied to the OCX and Grimoire fleet

Paths are relative to `/home/mherwig/dev`. Commands ran on 2026-11-27.

| Rule | State | Evidence |
|---|---|---|
| 01 | **violated** | No `positioning.toml` exists: `find ocx-sh grimoire-rs -maxdepth 3 -name 'positioning*'` prints nothing. Positioning is spread over 7 `product-context.md` files plus one spec (MKT-POS-01 rationale gives the `find` command; `grimoire-rs/grimoire/.agents/specs/design_brief_landing_page.md:101-118`). |
| 02 | **violated** | In each of the 7 files, `grep -c -i review_by` and `grep -c -i -E 'do not say\|do-not-say'` give 0, and no heading names a category. ocx: `ocx-sh/ocx/.claude/rules/product-context.md:175` says "Run quarterly or after any scope-shifting merge", with no date a checker can compare. |
| 03 | new commitment | `grep -n -i -E '^#+ .*(target users\|who it is for\|consumers\|audience)'` finds an audience section in 5 repos: `ocx-sh/ocx/.claude/rules/product-context.md:51`, `grimoire-rs/grimoire/.claude/rules/product-context.md:69`, `grimoire-rs/grim-mirror/.claude/rules/product-context.md:54`, `grimoire-rs/grim-gui/.claude/rules/product-context.md:40` and `ocx-sh/devcontainer-features/.agents/product-context.md:14`. catalog has only `## Consumers` (`ocx-sh/catalog/.claude/rules/product-context.md:20`). The other 12 directories need `ASK-OWNER`. ocx's own audience is ambiguous and goes to the owner. `product-context.md:53` gives "Automation tools" as primary and `:54` gives "Platform/infra engineers" as secondary, while the landing addresses engineers. |
| 05 | **violated** in 16 of 17; satisfied in 1 | `ocx-sh/devcontainer-features/README.md:6`: "It is for developers who work in dev containers or Codespaces, and for platform teams that standardise those containers". |
| 07 | **violated** | `grimoire-rs/grimoire/Cargo.toml:21` embeds a 4-item list (skills, rules, agents, MCP servers) against `ArtifactKind::ALL: [Self; 8]` at `grimoire-rs/grimoire/src/oci/artifact_kind.rs:82`, and the reference check's list test fails it (seeded case). It also carries the universal "every coding agent you use", which `README.md:23-24` itself limits. `ocx-sh/ocx/Cargo.toml:19` "The simple package manager" has no object noun. `ocx-sh/grimoire-lore/package.json:5` (which is also the live lore.ocx.sh meta) "OCX lore, a Grimoire package index." names no contents (messaging-inventory.md smell 8). |
| 08 | **violated** (ocx); mostly satisfied (grimoire) | ocx: README `ocx-sh/ocx/README.md:7` says "package manager", while the meta description at `ocx-sh/website/site/src/content/docs/index.mdx:3` says "binary distribution platform". The h1 at `Landing.astro:39-41` is a slogan; the `<title>` (`index.mdx:2`) carries the category, so the slogan clause passes. grimoire: `Cargo.toml:21`, `README.md:7-8` and `docs/src/pages/index.astro:37-38` carry one sentence (the README adds a leading "A", which normalisation must allow). The h1 and title at `index.astro:45-46,77` carry the object noun, so they pass. |
| 09 | **violated** | `python3 -I positioning_check.py forbidden`, with the three Grimoire terms, reports "AI artifacts" at `grimoire-rs/vscode/package.json:4`, `grimoire-rs/vscode/README.md:8` and `README.md:11`. It reports "AI-agent configuration" at `grimoire-rs/grimoire/docs/src/content/docs/introduction.md:3` and `concepts.md:3`, and "AI-config packages" at `grimoire-rs/grimoire/catalog/README.md:3`. Live index meta: `curl -sL -m 30 -A "Mozilla/5.0 (X11; Linux x86_64) research" https://index.grimoire.rs/ \| grep -o -i -E '<meta[^>]*name="description"[^>]*>'`, run 2026-11-27T12:30Z, returns "Browse and search AI-config packages (skills, rules, agents, MCP servers and bundles), installable with the grim package manager.", and `og:description` carries the same text. |
| 10 | **violated** | Kind counts are 4 at `grimoire/Cargo.toml:21`, `README.md:7` and the site meta; 5 in the grimoire About, the grimoire-vscode About and the live index meta (row 09); 8 at `vscode/package.json:4` and `indexer/src/config.ts:187-190`, which are both hand-typed. 2 of 8 match the enum. |
| 11 | **violated** | No drift check exists. `grimoire-rs/grimoire/docs/landing_check.py` checks cards; `ocx-sh/website/site/src/landing.test.ts` pins the h1 literal (canonical-sentence §2). |
| 12 | **violated** | `python3 -I positioning_check.py globs <file>` reports all 7 required globs missing in each of the 4 path-scoped briefs: `ocx-sh/ocx/.claude/rules/product-context.md` (frontmatter lines 1-18), `grimoire-rs/grimoire/.claude/rules/product-context.md` (1-13), `grimoire-rs/grim-mirror/.claude/rules/product-context.md` (1-12) and `grimoire-rs/grim-gui/.claude/rules/product-context.md` (1-7). The catalog and index files have no frontmatter (line 1 is a heading), so they load every session but carry no positioning fields (brief-fields §2). `ocx-sh/devcontainer-features/.agents/product-context.md` is not a rule and never loads (config-inventory.md smell 6). No `AGENTS.md` names the record. |
| 13 | **violated** (right shape, wrong place) | `design_brief_landing_page.md:101-118`: six items, each with a reason and a replacement, but in an unloaded spec and with no `lift_when` on the dated item "12 packages". |
| 14 | partly satisfied, partly **violated** | Satisfied: `ocx-sh/website/site/src/components/landing-content.ts:2-3,9-11` dates the rows (2026-11-08), names the source pages and states "no timing or size is claimed". The denigration scan over `ocx-sh/website/site/dist/index.html` (2026-11-16 build), with apt, brew, winget and nvm as `tool` alternatives, exits 0. Violated: the date is never rendered. `grep -c -E "2026-11-0[89]\|Nov(ember)? [89], 2026" ocx-sh/website/site/dist/index.html` gives 0 on that build, while "no Windows" does render. The row `landing-content.ts:18` "nvm … no Windows" names no nvm version. refresh_by under the MKT-CLAIM-05 default: 2027-02-06. |
| 15 | new commitment | grimoire `docs/src/data/landing.ts` already single-sources the tiles; the tagline joins it. |
| 16 | **violated** | grim-gui uses three nouns: `grimoire-rs/grim-gui/README.md:5-7` ("shell"), `src-tauri/Cargo.toml:6` ("front end") and the GitHub About ("application"). vscode uses "AI artifacts" (row 09). |
| 17 | **violated** | Audience appears in 1 of 17 READMEs. 0 of 18 fleet READMEs name an alternative (exemplar-readmes.md smell 5, `grep -n -i -E 'asdf\|mise\|homebrew\|brew\|nix\|alternative\|compared\|unlike\| vs '`). |
| 18 | new commitment | No fleet docs site has a when-not-to-use page. |
| 06, 04 | new commitment | No record exists, so there is nothing to satisfy or violate yet. |
| 19 | retired | Not applied. |

## AI-agent failure modes

Ranked by how often each bites in this fleet's measured history. Mechanism in bold.

**Copy written without a source (generative drift)**
1. The agent writes a fresh, plausible tagline per file. Measured result: 61 one-liners for 17 repos, 11 for ocx. Caught by MKT-POS-08 and MKT-POS-11.
2. The agent types an enumerated list from memory. It knows 4 or 5 kinds, not 8. Caught by MKT-POS-10, and inside the sentence by MKT-POS-07.
3. The agent picks a near-synonym of the noun to vary the prose ("artifacts", "configuration"). Caught by MKT-POS-09.
4. The agent edits the README tagline and leaves the manifest and site head untouched. Caught by MKT-POS-11; prevented by MKT-POS-15.

**Guidance that never loads (context gap)**
5. The agent edits a README with no positioning in context, because rule globs omit it. Caught by MKT-POS-12.
6. The agent assumes `.claude/rules/` reaches every client. Caught by MKT-POS-01 (`.agents/` location) together with the `AGENTS.md` line of MKT-POS-12. Whether each client reads that line is unverified.

**Invented decisions (hallucinated authority)**
7. The agent fills the audience with "developers and teams" and the alternative with "other tools". Caught by MKT-POS-05 (floor only), MKT-POS-06 and MKT-POS-03.
8. The agent writes a Moore fill-in-the-blank statement and treats it as the positioning. Caught by Verdict 3 and MKT-POS-03.
9. The agent sets `status = "reviewed"` or moves `review_by` to make the check pass. MKT-POS-04's author check catches this only when the agent commits under an address that is not in `POSITIONING_OWNERS`. It misses an agent that commits as the owner (Verdict 11).

**Competitor facts from training data (staleness)**
10. The agent states a competitor's current version or feature set from memory, writes "faster than X", or adds "as of writing" in place of a date. Caught by MKT-POS-14 together with MKT-CLAIM-05.
11. The agent lists only the product's own wins. Caught by MKT-POS-14 (`competitor_strength` rendered on the page).
12. The agent writes when-not-to-use bullets that are really marketing ("not for teams that don't value quality"). MKT-POS-18 binds the bullets to `non_target`, which the owner reviews. Whether a bullet can be falsified is a reading check.

**Wrong surface reuse**
13. The agent copies the 299-character About client list into og:description. Caught by MKT-POS-08 (meta = sentence plus at most one sentence) and MKT-POS-10.
14. The agent keeps the h1 identical to the meta description and loses the slogan, or drops the category everywhere because the h1 is a slogan. Caught by MKT-POS-08 (slogan clause).

## What an agent must ask a human

- The audience segment, the `non_target` list, and any override that broadens the audience.
- `category`, `object` and `style`. These are the positioning decision itself. For ocx: "package manager" or "binary distribution platform", and consumer or publisher direction. For Grimoire: "package manager" or the "lockfile" framing in the hero.
- Renaming a noun across a product family. It changes search terms, URLs and listings.
- Whether a repository is a component of a family, which sets `parent`.
- Flipping `status`, setting `review_by`, removing or lifting a `do_not_say` item, and adding a `forbidden_allow` exemption.
- The addresses in the CI variable `POSITIONING_OWNERS`.
- Which competitors to name publicly, and whether a named comparison is lawful in the owner's markets. National transposition and trademark law were not researched.
- The wording of any when-not-to-use reason that affects adoption, such as a missing platform.
- Whether trend words ("AI", "agentic") may lead the hero.
- Writing the GitHub About field on a live repository. The write publishes immediately, so the agent reports the proposed text as an owner action.

## Decay

| Rule | Moving fact | Source and date | Refresh |
|---|---|---|---|
| 04 | Review cadence of 6 months | Secondary notes, [Commoncog, updated 2025-01-07](https://commoncog.com/obviously-awesome/); not on Dunford's own site | Re-check the source yearly; per-record `review_by` is 6 months |
| 12 | Path-scoped rule loading on Read/Write/Edit; `InstructionsLoaded` hook | [Claude Code memory docs](https://code.claude.com/docs/en/memory), undated page, fetched 2026-11-27 | 6 months, or on a Claude Code release that changes rule loading. For each other grim client, check that client's docs for path scoping and `AGENTS.md` reading (open question 2) |
| 08 | Google: no meta-description length limit; title-link sources | [snippet](https://developers.google.com/search/docs/appearance/snippet) and [title-link](https://developers.google.com/search/docs/appearance/title-link) pages, undated, fetched 2026-11-27 | 12 months (re-fetch both pages) |
| 08 | GitHub About has no stated length limit; the 350-character figure comes only from a third-party blog | [GitHub REST](https://docs.github.com/en/rest/repos/repos#update-a-repository), undated; [SlateGit, 2026-08-03](https://slategit.com/blog/github-repo-description-character-limit-what-fits), unverified | 12 months. Never write the 350 figure into a rule |
| 08 | Manifest description semantics (Cargo, npm, PyPA, VS Code) | Pages linked in canonical-sentence §5, undated, fetched 2026-11-27 | 12 months |
| 14 | EU 2006/114/EC Art. 4; UCPD Arts 6-7; 16 CFR 14.15; FTC 1984 statement | Primary texts fetched 2026-11-27 (alternatives "Law rows") | refresh_by 2027-05-27 (fetch + 6 months) |
| 14 | Each comparison record | Competitor and subject release cadence | MKT-CLAIM-05 project default: `observed` + 90 days, or the next minor release of the subject or any compared product |
| 10 | Each `[lists.*]` source | The code | Every CI run (no calendar) |

## Open questions

Another research round:
1. How does the drift check read and write the GitHub About field in CI? `gh repo view` needs a token on a public repository, and a write needs admin scope. Should a workflow generate About from the record, or only check it? (Seam with channels, `channel-github`.)
2. Does each of grim's target clients (Cursor, Codex, Copilot, opencode and others) support path-scoped rule loading, and does each read `AGENTS.md`? MKT-POS-12 now ships the `AGENTS.md` line as the fallback, but its effect in each client is unverified.
3. How do national transpositions of 2006/114/EC (for example German UWG §6), UK BPRs 2008 and Lanham Act §43(a) treat a named-competitor table in a README? Do they make MKT-POS-14 stricter?
4. Does verbatim reuse across the four generated surfaces measurably change search snippets or answer-engine citations compared with noun-only reuse? This seam is with marketing-discoverability. Without evidence, Verdict 4 stays an agent-control decision, not a reader-effect claim.

Owner decisions:
5. The ocx category noun and direction: consumer ("same tools on every machine") or publisher ("turn a registry into a distribution platform").
6. The Grimoire hero: keep the "lockfile" h1 under the "package manager" category, or move the category into the h1.
7. The Grimoire object noun for the whole family. "AI-agent config" is the proposal, with "AI artifacts" and "AI-config packages" forbidden.
8. Whether the grimoire-lore catalog itself gets a record. Its live meta names no contents.
9. MKT-CLAIM field requests: add `competitor_version` (the competitor's exact version, split out of `subject_version`) and `competitor_strength` to class `comparison`. Confirm the MKT-CLAIM-05 comparison default over the alternatives dive's 12 months.
10. Docs-home lead: the MKT-PAGE dive (page-surface-scope) wants the canonical sentence verbatim there; this file requires only the nouns. Whichever consolidation lands second must align with the first.

## Sub-artifacts

- [positioning-brief-fields.md](marketing-positioning-record/positioning-brief-fields.md): the record's fields measured against Dunford, Moore, Schwartz and JTBD; fleet brief inventory; loading mechanics; the missing-brief protocol. Its summary line "6 of 17 directories" disagrees with its own §2 tables (7 files, 7 of 17 directories); this record uses 7.
- [positioning-canonical-sentence.md](marketing-positioning-record/positioning-canonical-sentence.md): the surface match table, the exemplar agreement measurement (22 products), Grimoire noun and list drift, platform facts per surface, and the prototype drift check.
- [positioning-alternatives-comparison.md](marketing-positioning-record/positioning-alternatives-comparison.md): comparative-advertising law (EU, US), the upstream comparison-unit measurement (40 READMEs), when-not-to-use placement, and staleness.

## Key sources

1. https://commoncog.com/obviously-awesome/ (Dunford components and cadence; secondary notes, updated 2025-01-07)
2. https://www.lennysnewsletter.com/p/positioning (Dunford on component order and against statement templates, 2021-01-26)
3. https://www.aprildunford.com/post/a-product-positioning-exercise (messaging document references the positioning, 2019-10-17)
4. https://www.fletchpmm.com/newsletter/how-to-write-an-h1 (H1 reference point and tests; vendor content, 2026-04-07)
5. https://code.claude.com/docs/en/memory (path-scoped rule loading; fetched 2026-11-27)
6. https://agents.md/ (location that no single client owns)
7. https://developers.google.com/search/docs/appearance/snippet (meta description, no limit)
8. https://developers.google.com/search/docs/appearance/title-link (title and h1 agreement)
9. http://publications.europa.eu/resource/celex/32006L0114 (Directive 2006/114/EC Art. 4)
10. http://publications.europa.eu/resource/celex/32005L0029 (UCPD Arts 6, 7)
11. https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-14/section-14.15 (FTC comparative advertising)
12. https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation (reasonable basis before dissemination)
13. https://github.com/BurntSushi/ripgrep/blob/master/README.md ("Why shouldn't I use ripgrep?")
14. https://pnpm.io/benchmarks (dated, versioned, regenerated comparison; vendor data, 2026-11-26)
15. https://posthog.com/handbook/marketing (fairness rule for competitor copy; vendor policy, undated)

## Revision log

2026-11-27, after an adversarial check. No ID was renumbered; one was retired.

- MKT-POS-07: the list regex only caught 4 or more items, so `a, b, and c` passed. Replaced it with the `LIST` pattern in the reference check, which fails both 3-item forms. Added seeded fail cases, and documented the appositive false fail.
- MKT-POS-07: `trend_words` was read but undefined when absent. The check now treats an absent key as empty.
- MKT-POS-14, Verdict 8, open question 9: the field name was split between `competitor` and `competitor_version`. It is now `competitor_version` everywhere, because MKT-CLAIM-04 already holds the competitor's name in `definition` and both versions in `subject_version`.
- MKT-POS-14: the ban-word grep scanned the whole page, so it was not a proximity check. Replaced it with the per-sentence `denigration` scan, which exits 0 on the ocx built page.
- MKT-POS-14, Verdict 8, Decay: 90 days was unsourced judgement inside a MUST. It is now labelled the MKT-CLAIM-05 project default, aligned to that rule's "next minor release" trigger instead of "next major". The MUST binds only that `refresh_by` exists and is enforced.
- MKT-POS-14: moved the generic sub-clauses ("state attributes, not judgements"; "strength next to the competitor") to the rationale. They stay in the rule only in checkable form: the ban-word scan and the rendered `competitor_strength` string. Dropped the two-sentence reading heuristic.
- MKT-POS-04, Verdict 11, failure mode 9: "status flip only by the owner" had no owner identity. Added a `git log -G` author check against the CI variable `POSITIONING_OWNERS`. Recorded as a gap that it cannot separate an agent that commits as the owner.
- MKT-POS-03: "count equals the fields with no source" had no computable right-hand side. Replaced it with a per-field test (the value contains `ASK-OWNER`, or `sources.<field>` names a `path:line` that exists), and added the `[sources]` table to the schema.
- MKT-POS-02, MKT-POS-16, schema: `style` is now a required field. `parent`, `trend_words`, `sources`, `forbidden_allow` and `attributes` are optional, and absent means empty. MKT-POS-16 runs only when `parent` is non-empty.
- MKT-POS-12: `grep -c` counted lines, not globs, and never tested `CHANGELOG.md`. Replaced it with a per-glob loop (`globs`). Scoped the MUST's load claim to Claude Code, and added a tested `AGENTS.md` pointer line for the other clients, whose loading is unverified.
- MKT-POS-17: the `instead of` grep passed any README. The check now looks for the `alternatives[0].name` string, and the audience phrase is now computable. Dropped the Stack Overflow 2025 citation, a question the 2026 survey did not repeat, from the rationale, the Decay table and Key sources.
- MKT-POS-05: the regex rejects only literal words. The verification now says it is a floor, and segment quality is a reading heuristic. Severity is unchanged because the floor is mechanical.
- MKT-POS-09: a blank `forbidden` entry matched every line, and the scan had no scope. The check now drops blank entries, scans only governed surfaces and docs prose, and honours an owner-approved `forbidden_allow` list. Fleet hits were measured with it.
- MKT-POS-18: the generic "say when not to use" advice is now bound to the record. Each `non_target` entry must appear on the page, and falsifiability moved to the rationale.
- MKT-POS-19: retired. It had no fetched primary source and only a two-line reading heuristic. The `awareness` and `switching` tables were removed from the schema.
- MKT-POS-01: reconciled the count to 7 `product-context.md` files in 7 of 17 directories, with the `find` command. The audit's "6 variants" counts only `.claude/rules/`, and the brief-fields summary line is wrong against its own table.
- Verdict 5: "wrong list on 5 surfaces" is now the measured figure: a 4-item list on 3 source surfaces, and 6 of 8 listing surfaces wrong.
- Applied rows 02, 03, 09, 12: added `file:line` evidence and the dated `curl` command for the live index meta. Row 09's vscode README lines are now 8 and 11, as measured.
- MKT-POS-06, 07, 14, Verdict 10, dropped list, failure mode 10: cross-references now use the consolidated MKT-CLAIM IDs (MKT-CLAIM-02 patterns, MKT-CLAIM-05 refresh, MKT-CLAIM-06 method). The old IDs were the claims dive's CLAIM-03, -06, -07, -12 and -14.
