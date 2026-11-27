---
title: Comparative-advertising law and a table that names competitors
program: product
topic: marketing-claims-evidence
worker: followup-q4
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 14
---

# Comparative-advertising law and a table that names competitors

Question: What does comparative-advertising law require of a table that names competitors, such as the ocx drift table?

Scope: the EU Directive 2006/114/EC, the UK regulations that carried it over, the FTC policy and the US Lanham Act. This is a research note for rule text, not legal advice. Deciding whether a given table is lawful stays with the owner.

## Answer

1. **A table that names competitors, or lets a reader identify them, is "comparative advertising" in EU and UK law.** The definition is "any advertising which explicitly or by implication identifies a competitor or goods or services offered by a competitor" ([Directive 2006/114/EC Art. 2(c), UK-hosted copy, fetched 2026-11-27](https://www.legislation.gov.uk/eudr/2006/114/article/2)). Naming is not forbidden. It is permitted "as far as the comparison is concerned" when the Art. 4 conditions hold.
2. **The EU conditions are the checkable part** ([Art. 4, same host, fetched 2026-11-27](https://www.legislation.gov.uk/eudr/2006/114/article/4)):
   - (a) "it is not misleading" under the Directive or under Articles 6 and 7 of Directive 2005/29/EC;
   - (b) "it compares goods or services meeting the same needs or intended for the same purpose";
   - (c) "it objectively compares one or more material, relevant, verifiable and representative features of those goods and services, which may include price";
   - (d) "it does not discredit or denigrate the trade marks, trade names, other distinguishing marks, goods, services, activities or circumstances of a competitor";
   - (f) "it does not take unfair advantage of the reputation of a trade mark, trade name or other distinguishing marks of a competitor";
   - (g) "it does not present goods or services as imitations or replicas of goods or services bearing a protected trade mark or trade name";
   - (h) "it does not create confusion among traders, between the advertiser and a competitor or between the advertiser's trade marks ... and those of a competitor";
   - (e) concerns designations of origin and does not apply to software.
3. **The UK keeps the same list.** Regulation 4 of the Business Protection from Misleading Marketing Regulations 2008 has conditions (a) to (i) with the same content: same needs, objective comparison of "material, relevant, verifiable and representative" features, no discrediting, no unfair advantage, no confusion ([SI 2008/1276 reg. 4, fetched 2026-11-27](https://www.legislation.gov.uk/uksi/2008/1276/regulation/4)). Condition (b) was substituted on 6 April 2025 by SI 2025/381, which moved the cross-reference to the Digital Markets, Competition and Consumers Act 2024 (same page). The regulation number is 4. Measured 2026-11-27 (see Measurements): `/regulation/4` returns HTTP 200 and `/regulation/4A` returns HTTP 404.
4. **The US has no list. It has a truth standard.** FTC policy "encourages the naming of, or reference to competitiors [sic], but requires clarity", and disparagement "is permissible so long as it is truthful and not deceptive" ([16 CFR 14.15, Statement of Policy on Comparative Advertising, 1979-08-13, 44 FR 47328, fetched 2026-11-27](https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-16?part=14&section=14.15)). The private-suit hook is Lanham Act 43(a): liability for a statement that, "in commercial advertising or promotion, misrepresents the nature, characteristics, qualities" of goods ([15 U.S.C. 1125(a)(1)(B)](https://www.law.cornell.edu/uscode/text/15/1125), page undated). A plaintiff needs "an injury to a commercial interest in reputation or sales" flowing "directly from the deception" ([Lexmark v. Static Control, decided 2014-03-25](https://www.law.cornell.edu/supremecourt/text/12-873)). Using a competitor's name to identify it is the nominative use test: the product must be "not readily identifiable without use of the trademark", the user takes only "so much of the mark ... as is reasonably necessary", and must "do nothing that would, in conjunction with the mark, suggest sponsorship or endorsement" ([quoted from New Kids on the Block, 971 F.2d at 308, in Playboy v. Welles (9th Cir. 2002) via FindLaw, fetched 2026-11-27](https://caselaw.findlaw.com/us-9th-circuit/1233126.html)). Nominative use is also written into the dilution statute's exclusion for "any fair use, including a nominative or descriptive fair use" ([15 U.S.C. 1125(c)(3)(A)](https://www.law.cornell.edu/uscode/text/15/1125)).
5. **What this means for agent-written copy.** Both regimes reduce to the same four duties for a table: the compared things serve the same purpose; each cell is true and verifiable on the date shown; the cell does not run down the competitor; the table does not imply the competitor sponsors or equals the advertiser. An agent can check the second one by evidence on disk and the fourth one by wording. It cannot judge the first or the third on its own.

## Applied to the ocx drift table

Source read: `/home/mherwig/dev/ocx-sh/website/site/src/components/landing-content.ts`, 2026-11-27. Measurements, with commands and output, are under "Measurements" below. In short: the `PROBLEM` list has six cards; five name a third-party route (`apt-get`, `brew`, `winget`, `nvm`, `actions/setup-node`) and the Ubuntu and Debian cards share `apt-get`. The file's own comment dates the versions "as of 2026-11-08" and lists the sources it read. The header comment says "no timing or size is claimed" of the example command output; it does not say that of the cards, but the cards state versions and limitations, not timings. So this is a comparison of what each route gives (a version, an end-of-life state, a feature gap). It names competing routes by product name and sets them against ocx implicitly, which meets Art. 2(c).

Three cells were checked against primary or independent data on 2026-11-27:

| Cell | Check | Result |
|---|---|---|
| Ubuntu 24.04, "Node 18 · end of life since 2025" | Ubuntu archive `Sources.gz` for noble; endoflife.date API | Noble ships `nodejs 18.19.1+dfsg-6ubuntu5`; Node 18 EOL 2025-04-30. Holds on both facts. |
| Debian 13, "Node 20 · end of life since April" | packages.debian.org trixie page; endoflife.date API | trixie ships `nodejs 20.19.2+dfsg-1+deb13u3`; Node 20 EOL 2026-04-30. Holds. |
| nvm, "per shell, from .nvmrc · no Windows" | [nvm README on GitHub, fetched 2026-11-27](https://raw.githubusercontent.com/nvm-sh/nvm/master/README.md) | README line 285: "`nvm` also supports Windows in some cases. It should work through WSL ... It should also work with Git Bash (MSYS) or Cygwin. Otherwise, for Windows, a few alternatives exist, which are neither supported nor developed by us" (nvm-windows named). Line 740: "non-WSL Windows, which nvm cannot build on". So "no Windows" is a flat statement where the project's own text is qualified: "no native Windows" is accurate. A reader who knows nvm-windows could call it misleading under condition (a), and "verifiable" under (c) needs the qualification. Suggested wording: "no native Windows (nvm-windows is a separate project)". |

## Measurements

All run 2026-11-27 in `~/.cache/research-lang/exemplars/product/wave2/q4` (scratch; nothing in any existing repository was changed). `curl` is `/usr/bin/curl`, `grep` is `/usr/bin/grep`, because a shell hook on this machine rewrites both.

**M1. The drift table source** (`/home/mherwig/dev/ocx-sh/website/site/src/components/landing-content.ts`):

```
$ sed -n '1,3p' landing-content.ts
// Copy and illustrative data of the landing page, rendered at build time by Landing.astro.
// Every command and output line was run against ocx 0.6.5 (Node v24.22.2, 2026-11-09); digests stay elided to four
// characters each end (`sha256:1e34…e370`), and no timing or size is claimed.
$ grep -n "no timing or size is claimed\|^export const PROBLEM\|Versions as of" landing-content.ts
3:// characters each end (`sha256:1e34…e370`), and no timing or size is claimed.
9: * One card of "the problem": one way a machine gets Node, and the version that way gives. Versions as of
13:export const PROBLEM: readonly { os: string; cmd: string; note: string }[] = [
$ awk '/^export const PROBLEM/{p=1;next} p&&/^\];/{exit} p' landing-content.ts | grep -c "os:"
6
$ grep -n "nvm\|Node 18\|Node 20" landing-content.ts | head
14:  { os: 'Ubuntu 24.04', cmd: 'apt-get install nodejs', note: 'Node 18 · end of life since 2025' },
15:  { os: 'Debian 13', cmd: 'apt-get install nodejs', note: 'Node 20 · end of life since April' },
18:  { os: 'nvm', cmd: 'nvm install', note: 'per shell, from .nvmrc · no Windows' },
```

Lines 9-11 of the same file name the sources read: "packages.ubuntu.com/noble/nodejs, packages.debian.org/trixie/nodejs, formulae.brew.sh/formula/node, winget-pkgs OpenJS.NodeJS.LTS, endoflife.date/nodejs, github.com/actions/setup-node/releases", dated "as of 2026-11-08" (line 9-10). That date is the table's `observed` date used below.

**M2. Node end-of-life dates** (endoflife.date, a third-party aggregator):

```
$ curl -s https://endoflife.date/api/nodejs.json | python3 -I -c 'import json,sys;[print(r["cycle"],r["eol"]) for r in json.load(sys.stdin) if r["cycle"] in ("18","20")]'
20 2026-04-30
18 2025-04-30
```

**M3. What Ubuntu 24.04 and Debian 13 ship** (Ubuntu archive source index, a primary source for the package version; Debian's package page):

```
$ curl -s -o Sources.gz -w 'HTTP %{http_code}\n' http://archive.ubuntu.com/ubuntu/dists/noble/universe/source/Sources.gz
HTTP 200
$ zcat Sources.gz | awk '/^Package: nodejs$/{p=1} p&&/^(Package|Version):/{print} /^$/{p=0}'
Package: nodejs
Version: 18.19.1+dfsg-6ubuntu5
$ curl -sI http://archive.ubuntu.com/ubuntu/dists/noble/universe/source/Sources.gz | grep -i last-modified
Last-Modified: Thu, 25 Apr 2024 15:11:21 GMT
$ for p in noble-updates noble-security; do curl -s -o S-$p.gz -w "$p HTTP %{http_code}\n" http://archive.ubuntu.com/ubuntu/dists/$p/universe/source/Sources.gz; zcat S-$p.gz | awk '/^Package: nodejs$/{p=1} p&&/^(Package|Version):/{print} /^$/{p=0}'; done
noble-updates HTTP 200
noble-security HTTP 200
$ curl -s -o debsrc.html -w 'debian HTTP %{http_code}\n' https://packages.debian.org/trixie/nodejs; grep -o "Package: nodejs ([^)]*)" debsrc.html | head -2
debian HTTP 200
Package: nodejs (20.19.2+dfsg-1+deb13u3)
```

`packages.ubuntu.com/noble/nodejs` (the page the table cites) returned HTTP 504 on this attempt, so the archive index replaced it. The `-updates` and `-security` pockets listed no `nodejs` source, so noble's `nodejs` stays at 18.19.1 as of the fetch. The `noble` index file is dated 2024-04-25 (release time), the pockets were read today.

**M4. nvm and the UK regulation page**:

```
$ curl -s -o nvm.md -w 'nvm README HTTP %{http_code}\n' https://raw.githubusercontent.com/nvm-sh/nvm/master/README.md
nvm README HTTP 200
$ grep -n -i "windows" nvm.md | cut -c1-230     (lines 285-287 and 740 shown; full output has 7 lines)
285:**Note:** `nvm` also supports Windows in some cases. It should work through WSL (Windows Subsystem for Linux) depending on the version of WSL. It should also work with [Git Bash] ([MSYS]) or Cygwin. Otherwise, for Windows, a few alternatives exist, which are neither supported nor developed by us:
287:  - [nvm-windows](https://github.com/coreybutler/nvm-windows)
740:... Where neither has a binary, `nvm install` compiles from source, except on non-WSL Windows, which nvm cannot build on; ...
$ curl -s -o /dev/null -w '/regulation/4A HTTP %{http_code}\n' https://www.legislation.gov.uk/uksi/2008/1276/regulation/4A
/regulation/4A HTTP 404
$ curl -s -o /dev/null -w '/regulation/4 HTTP %{http_code}\n' https://www.legislation.gov.uk/uksi/2008/1276/regulation/4
/regulation/4 HTTP 200
$ curl -s https://www.legislation.gov.uk/uksi/2008/1276/regulation/4 | grep -o -i "2025/381[^<]\{0,80\}" | head -3
2025/381">The Digital Markets, Competition and Consumers Act 2024 (Consequential Amendme
2025/381)
```

**M5. Proposed MKT-CLAIM-02 comparison arm.** Corpora from the wave-1 re-measurement: `S=~/.cache/research-lang/exemplars/product/mkt-claim-02-remeasure`, `fleet2.txt` (2,043 lines, fences and `<style>` stripped) and `exemplars.txt` (5,797 visible-text lines, 26 home pages). `cur.txt` is the 10-line set now in MKT-CLAIM-02. A plain `\bvs\.?\b` arm was tried first and matched "VS Code" (the product) in 3 fleet files and 4 exemplar lines, so the final arm excludes "vs Code" with a negative lookahead (needs `grep -P`, which accepts one pattern, so the arm is a file of its own; a Python `re` lint takes the same text).

```
$ cat arm.txt
\b(better|best|cheaper|faster|simpler) than\b|\bunlike\b|\bvs\b\.?(?!\s*code\b)|\bversus\b|\bcompared (to|with)\b|\balternative to\b
$ for c in fleet2 exemplars; do echo "$c: cur=$(grep -c -i -E -f cur.txt $S/$c.txt) arm_alone=$(grep -c -i -P -f arm.txt $S/$c.txt) arm_not_in_cur=$(grep -i -P -f arm.txt $S/$c.txt | grep -v -i -E -f cur.txt | wc -l)"; done
fleet2: cur=4 arm_alone=4 arm_not_in_cur=4
exemplars: cur=326 arm_alone=27 arm_not_in_cur=16
$ grep -i -P -f arm.txt $S/fleet2.txt | grep -v -i -E -f cur.txt | cut -c1-140
grimoire-rs/indexer/README.md:47:[Index vs. site](./docs/explanation/index-vs-site.md).
ocx-sh/catalog/README.md:12:## Index vs. catalog
ocx-sh/catalog/README.md:25:[Index vs. catalog](./docs/src/content/docs/explanation/index-vs-catalog.md).
ocx-sh/catalog/README.md:95:| [Explanation](./docs/src/content/docs/explanation/index.md) | Index vs. catalog, multi-source model, security
$ grep -i -P -f arm.txt $S/exemplars.txt | grep -v -i -E -f cur.txt | cut -c1-130      (16 lines)
bun:SELECT 100 rows · 100 queries in flight · 100k queries total · localhost PostgreSQL 18.3 · Bun.sql vs postgres.js 3.4.9 ·
bun:Querying Postgres — SELECT 100 rows · 100 queries in flight · 100k queries total · localhost PostgreSQL 18.3 · Bun.sql v
bun:VS Code9,795 files1.24s5.98s
cal:Amazing. I've been sharing it with everyone I know. It's helped me create more events spontaneously, because of how smooth it
cal:Cal.com vs Calendly
nextjs:- **App Router vs Pages Router** — which router a feature belongs to. Docs are split: App Router pages live under `/docs/
plausible:vs Google Analytics   (and vs Matomo, vs Cloudflare Analytics: 6 lines)
plausible:Paid vs free
tailscale:Just paid for @Tailscale. Installed it on our robots; so far so good. Compared to OpenVPN: * Serverless * Always on * Sa  (2 lines)
turso:...Turso vs NeonTurso vs Postgr...
```

Hand classification of the 16 new exemplar lines: 13 are real naming of a competing product (Bun.sql vs postgres.js 2, Cal.com vs Calendly 2, Plausible vs Google Analytics/Matomo/Cloudflare 6, Tailscale "Compared to OpenVPN" 2, Turso vs Neon 1). 3 are not (the "VS Code9,795" glued text, "App Router vs Pages Router", "Paid vs free"). All 4 new fleet hits are false: the repository's own "Index vs. catalog" documentation headings. The arm adds 4 fleet lines (all false, and none in a copy surface: they are READMEs for developers) and 16 exemplar lines (13 real). It is a recall gain on exemplars and a small noise cost on the fleet. Hits flag a sentence for MKT-CLAIM-27's `compared_party` check; they do not fail by themselves. The ocx drift table's own cells contain none of these words (the `PROBLEM` notes name no "vs"), so this arm does not catch the table: MKT-CLAIM-27 (name-keyed grep) does.

**M6. Proposed MKT-CLAIM-05 check.** Scratch `claims.toml` with one row modelled on the drift table's nvm cell (`observed = "2026-11-08"`, the table's date from M1) and one deliberately bad row. `third_party_version = "v0.41.0"` is the nvm release read below, so it is a fixture value, not a claim about what the page printed.

```
$ curl -s https://api.github.com/repos/nvm-sh/nvm/releases/latest | python3 -I -c 'import json,sys;d=json.load(sys.stdin);print(d.get("tag_name"),d.get("published_at"))'
v0.41.0 2026-11-04T21:25:25Z
$ python3 -c 'import datetime as d;print(d.date(2026,11,8)+d.timedelta(days=90))'
2027-02-06
$ python3 -I check05.py claims.toml; echo exit=$?
ok interval drift-nvm-windows 90 days
ok release drift-nvm-windows v0.41.0 == v0.41.0
FAIL interval bad-long 113 days >90
FAIL no third_party_version bad-long
exit=1
```

(`check05.py` reads each `class = "comparison"` row, fails if `refresh_by - observed` exceeds 90 days or `third_party_version` is missing, and, for a GitHub-hosted `source`, fails when the major.minor of the repository's latest release differs from `third_party_version`. With the first fixture value `v0.40.4` the release check failed with `FAIL expired: minor v0.40.4 -> v0.41.0`, which shows the check detects an out-of-date cell.) 2027-02-06 is the date MKT-CLAIM-05 gives for the table: 2026-11-08 plus 90 days.

**M7. Proposed MKT-CLAIM-16 check.** Scratch `c16.toml` with three comparison rows: commercial with no `approved_by`, open-source, commercial with `approved_by`.

```
$ python3 -I check16.py c16.toml; echo exit=$?
NEEDS SIGN-OFF a
exit=1
```

Only row `a` (commercial, unsigned) is flagged. Row `b` (open-source) and row `c` (commercial, signed) pass. As in MKT-CLAIM-16, the `approved_by` field is only a hint; the pull-request review check from that rule is what proves the approver is a different person.

Findings are mechanical: a cell either matches a cited primary source on a stated date or it does not. This supports one new rule and one change.

## Effect on the ruleset

**MKT-CLAIM-04 (change).** In the field table, add to class `comparison` a required field `compared_party` (a list of names exactly as the table prints them) and require that `source` for each compared cell is a URL or repository path of the competitor's own documentation or an independent dataset, never the vendor's marketing copy. Class table row for `comparison`, column "extra fields": `compared_party`, `compared_kind` (`commercial` or `open-source`, used by MKT-CLAIM-16), `third_party_as_of`, `third_party_version` (used by MKT-CLAIM-05). `third_party_as_of` is the date the competitor-side fact was read. Verify: check A fails when `class = "comparison"` lacks either field or when `third_party_as_of` is later than `observed` plus 7 days (the cell was recorded without being read).

**MKT-CLAIM-05 (change, one sentence added, verification added).** Add to the table row for performance and comparison: "A comparison cell that states a fact or limitation of a third-party product (for example, 'no Windows') expires on the next minor release of that product or at 90 days after `observed`, whichever comes first." Rationale: condition (a) and the FTC truth standard are tested on the date the page is read, not the date it was written. The drift table's `observed` date is 2026-11-08 (M1, "Versions as of 2026-11-08"); plus 90 days is 2027-02-06 (M6).
- *Verify:* for every row with `class = "comparison"`, the row carries `third_party_version` (the product's release read on `third_party_as_of`), and (a) `refresh_by` minus `observed` is at most 90 days, and (b) when `source` is a GitHub-hosted file, the major.minor of `https://api.github.com/repos/<owner>/<repo>/releases/latest` `.tag_name` equals that of `third_party_version`. Run in the release pipeline and weekly. Measured in M6: the script below printed `ok` for a 90-day row whose version matched, `FAIL interval ... 113 days >90` and `FAIL no third_party_version` for a bad row, and exited 1. For a compared product with no GitHub releases, (b) falls back to the 90-day limit only (an unmeasured case).

```python
import tomllib,sys,datetime as d,json,urllib.request
rows=tomllib.load(open(sys.argv[1],'rb'))['claim']; bad=0
for r in rows:
    if r['class']!='comparison': continue
    days=(d.date.fromisoformat(r['refresh_by'])-d.date.fromisoformat(r['observed'])).days
    if days>90: print('FAIL interval',r['id'],days,'days >90'); bad=1
    else: print('ok interval',r['id'],days,'days')
    ver=r.get('third_party_version')
    if ver is None: print('FAIL no third_party_version',r['id']); bad=1; continue
    repo=r['source'].split('raw.githubusercontent.com/')[1].rsplit('/',2)[0] if 'raw.githubusercontent.com' in r['source'] else None
    if repo:
        repo='/'.join(repo.split('/')[:2])
        tag=json.load(urllib.request.urlopen('https://api.github.com/repos/'+repo+'/releases/latest'))['tag_name']
        mm=lambda v:v.lstrip('v').split('.')[:2]
        if mm(tag)!=mm(ver): print('FAIL expired: minor',ver,'->',tag,r['id']); bad=1
        else: print('ok release',r['id'],ver,'==',tag)
sys.exit(bad)
```

**MKT-CLAIM-02 (change, measured).** Replace line 10 of the set with the arm in M5, which keeps the old arm inside it: `\b(better|best|cheaper|faster|simpler) than\b|\bunlike\b|\bvs\b\.?(?!\s*code\b)|\bversus\b|\bcompared (to|with)\b|\balternative to\b`. It needs a regex engine with lookahead (Python `re`, `grep -P`); where only ERE exists, drop the lookahead and strip "VS Code" from the line first. Precision note to append (M5, 2026-11-27): the arm adds 4 fleet lines (all false: "Index vs. catalog" headings in READMEs) and 16 exemplar lines (13 real competitor comparisons, 3 false). A hit routes the sentence to the `compared_party` check of MKT-CLAIM-27; it does not fail alone. *Verify:* the commands in M5 re-run on the fleet and exemplar corpora give `fleet2: ... arm_not_in_cur=4` and `exemplars: ... arm_not_in_cur=16`. The arm does not catch the drift table's cells (they contain none of these words): MKT-CLAIM-27 does.

**MKT-CLAIM-27 (NEW, MUST).** Name a third-party product, project or company in a copy surface (table, row, card, chart label, or sentence) only through a `comparison` record that lists it in `compared_party`. The record's cell wording states a fact about that product and its source, with the date read. The wording does not use an evaluative word about the third party ("outdated", "broken", "bad", "legacy", "clunky"), does not use its logo or a style imitating its brand, and does not suggest it endorses, sponsors, or is part of ocx. Compare only products that meet the same need, and show both sides on the same row with the same feature. Where no source can be cited for a cell, delete the cell. An agent never infers a competitor limitation from memory.
- *Rationale:* the EU and UK conditions require comparisons to be "objective", "verifiable", not "discredit or denigrate", and not to suggest connection (above). The FTC allows truthful naming. The US nominative test allows only the name, only as needed, and no suggested sponsorship. A cell from memory fails the first condition without the agent knowing: the nvm cell above is the observed case.
- *Verify:* (1) `grep -n -i -w -f <(yq -r '.claim[] | select(.class=="comparison") | .compared_party[]' claims.toml)` over every copy surface lists only lines covered by a `claim:<id>` marker that resolves to a comparison record (check B and C). (2) The record's `source` returns HTTP 200 (`curl -sIL -o /dev/null -w '%{http_code}'`). (3) `grep -n -i -E '\b(outdated|broken|bad|legacy|clunky|obsolete|dead|worthless)\b'` on each line that holds a compared party prints nothing. (4) No `<img>` whose `src` or `alt` contains a compared party's name or `logo` sits inside the comparison block. Check (3) catches words, not tone: a human decides edge cases.

**MKT-CLAIM-28 (NEW, MUST sign-off, owner decision list).** An agent never adds, removes, or re-orders a compared party, never moves a table from "problem illustration" to "ours versus theirs", and never names a commercial company or a trade-marked product as a rival without the owner's approving review (MKT-CLAIM-16 path). Reason: whether two products "meet the same needs" and whether a compared party is a competitor in the Directive's sense is a legal judgement that needs the real market. The ocx table names open-source and platform tools (apt, brew, winget, nvm, GitHub Actions' setup-node). Whether a non-commercial project is a "competitor" under Art. 2(c) was not found in a source in this round (see gaps).
- *Verify:* a diff of `claims.toml` that changes any `compared_party` value passes only with the sign-off check of MKT-CLAIM-16. The agent's change description lists each party it saw.

**MKT-CLAIM-16 (change, one sign-off class added, verification added).** Add "comparison that names a commercial third party (a company or a trade-marked product it sells)" to the list of sign-off classes, with rows marked `compared_kind = "commercial"` in `claims.toml`. An agent never writes `compared_kind = "open-source"` to avoid sign-off when the party has a commercial owner; the owner's review sees the field.
- *Verify:* the existing pull-request review check of MKT-CLAIM-16 applies unchanged to these rows, plus this lint over `claims.toml`, which fails on a commercial comparison row without `approved_by`. Measured in M7: of three rows (commercial unsigned, open-source, commercial signed) it printed `NEEDS SIGN-OFF a` and exited 1, passing the other two.

```python
import tomllib,sys
SIGN={'security-attestation','security-commitment','ai-capability','price-or-limit','maturity','endorsement'}
bad=0
for r in tomllib.load(open(sys.argv[1],'rb'))['claim']:
    need = r['class'] in SIGN or (r['class']=='comparison' and r.get('compared_kind')=='commercial')
    if need and not r.get('approved_by'): print('NEEDS SIGN-OFF',r['id']); bad=1
sys.exit(bad)
```

**What this does not change.** MKT-CLAIM-06 (method page) already covers a measured comparison. MKT-CLAIM-09 and MKT-CLAIM-10 are unaffected. The drift table's own "no timing or size is claimed" line stays under MKT-CLAIM-10.

## Dated facts

| Fact | Source | Date | Refresh |
|---|---|---|---|
| Directive 2006/114/EC Art. 2(c) definition, Art. 4 conditions | [legislation.gov.uk copy](https://www.legislation.gov.uk/eudr/2006/114/article/4) | adopted 2006-12-12; fetched 2026-11-27 | 6 months, 2027-05-27; the UK-hosted copy may lag later EU amendments |
| UK BPRs 2008 reg. 4; condition (b) substituted by SI 2025/381 | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/2008/1276/regulation/4) | 2025-04-06 amendment; fetched 2026-11-27 | 6 months |
| FTC comparative advertising policy, 16 CFR 14.15 | [eCFR](https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-16?part=14&section=14.15) | 1979-08-13 | 12 months |
| Lanham Act 43(a)(1)(B), 43(c)(3)(A) | [Cornell](https://www.law.cornell.edu/uscode/text/15/1125) | page undated | 6 months |
| Lexmark standing test | [Cornell](https://www.law.cornell.edu/supremecourt/text/12-873) | 2014-03-25 | 24 months |
| Nominative use test, 9th Cir. | [FindLaw, Playboy v. Welles quoting New Kids](https://caselaw.findlaw.com/us-9th-circuit/1233126.html) | 1992 (New Kids), 2002 (Playboy) | 24 months. It is one circuit's test. |
| Node 18 EOL 2025-04-30, Node 20 EOL 2026-04-30 | [endoflife.date](https://endoflife.date/api/nodejs.json) (third-party aggregator) | read 2026-11-27 | per comparison record |
| Ubuntu noble ships nodejs 18.19.1; Debian trixie ships 20.19.2 | [Ubuntu archive Sources.gz](http://archive.ubuntu.com/ubuntu/dists/noble/universe/source/Sources.gz), [packages.debian.org](https://packages.debian.org/trixie/nodejs) | read 2026-11-27 | per comparison record |
| nvm latest release v0.41.0 | [GitHub API](https://api.github.com/repos/nvm-sh/nvm/releases/latest) | published 2026-11-04; read 2026-11-27 | per comparison record |
| nvm README on Windows | [nvm-sh/nvm](https://raw.githubusercontent.com/nvm-sh/nvm/master/README.md) | read 2026-11-27 (master) | per comparison record |

## What could not be determined

- **Case law on the EU "identifies a competitor" threshold and on denigration.** C-381/05 De Landtsheer was not fetched: EUR-Lex returned an empty page and Curia redirected to a host the fetch tool did not follow in the time spent. No CJEU judgment text is quoted here. Missing: the judgment text of C-381/05 and of the later cases on "same needs" (Lidl v Vierzon, C-159/09) read from the Cellar or Curia copy.
- **Whether a free, non-commercial open-source project is a "competitor" under Art. 2(c) or a "trader" under the UK regulations.** No source in this round says. Needed: a CJEU or UK court text on non-commercial software, or the owner's legal adviser.
- **US precedent on stale comparative facts.** No Lanham Act case on a table whose competitor cell was true when written and false when read was found. The rule's "expires with the competitor's release" is a design choice from the FTC truth standard, not a case holding.
- **New Kids on the Block itself.** Justia, OpenJurist and law.resource.org returned HTTP 403 or 404. The test is quoted from the Playboy opinion, which quotes it. The decision date within 1992 is not stated.
- **The cited page for Ubuntu.**  returned HTTP 504 (M3); the archive index answered instead. Both are Ubuntu's own data, but the page the table cites was not read.
- **The other three cards.** brew ("Node 26"), winget ("Node 26 · the current LTS") and  were not re-checked in this round.
- **Whether the table is advertising to consumers or traders.** The Directive covers both. The EU and UK rule text is the same list for either, but UCPD Articles 6 and 7 apply only to consumers. This round did not decide which audience the ocx page has.
- **ocx.sh live page.** Unreachable in wave 1; this round read the source file, not the rendered page.
