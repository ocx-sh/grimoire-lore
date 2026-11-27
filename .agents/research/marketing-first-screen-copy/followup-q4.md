---
title: How often MKT-PAGE-06's label arm fires on a wrapped line that starts with a stage word
program: product
topic: marketing-first-screen-copy
worker: followup-q4
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 165
---

# How often MKT-PAGE-06's label arm fires on a wrapped line that starts with a stage word

## Question

MKT-PAGE-06's product-attached pattern has a label arm: a line that opens with `status` or a stage word, then `:` or `.`. Wave 1 tested it on 10 in-scope READMEs and it fired only on real status lines. Does it also fire on a wrapped source line that starts with a stage word by chance? This follow-up measures that on a larger corpus.

## Answer

In the first-screen window the false-fire rate was 0 of 165 READMEs and 0 of 1,670 window lines. A rule-of-three 95% upper bound is about 1.8% of READMEs (3/165). Over whole files, outside code fences, the arm fired twice in 20,910 lines: one was a wrapped line (`casey/just`, line 1,929), one was a real list item that defines release stages (`nodejs/node`, line 46). So the failure mode exists, but it is rare and falls outside the window. A one-condition guard removes it: the line before the label line must be blank, a heading, or the file start.

The number is a floor, not an estimate for every repository. The corpus is popular GitHub projects. It has almost no status lines, and in the window it had no true positives either. The arm's recall is therefore measured only on the 17 fleet READMEs (below).

Repair finding: the guard as first written used `IGNORECASE=1`, which only gawk honours. On `mawk` it silently becomes case-sensitive and misses `STATUS: ALPHA.` (measured below). The proposed text now uses `tolower()`.

## Method and measurements

All commands run from `~/.cache/research-lang/exemplars/product/wave2/q4/` (called `$C/q4`), with `C=~/.cache/research-lang/exemplars/product/wave2`. Scripts live in `$C/q4s/`; their full text is in the Appendix, so every definition below can be checked against it.

**Corpus.** I wrote a list of 165 well-known public repositories (developer tools, runtimes, CLIs, frameworks, infrastructure and AI tooling). I downloaded each `README.md` from the default branch with `curl`, with no login and no credential, on 2026-11-27. The sample is a convenience sample and is not random. Two files are under 5 lines (`tokio-rs/axum`, 14 bytes; `biomejs/biome`, 35 bytes), because those READMEs are stubs that point elsewhere. The fetch, per repository `$r`:

```sh
curl -fsSL -m 20 "https://raw.githubusercontent.com/$r/HEAD/README.md" -o readmes/$(echo $r|tr / _).md
```

```
$ ls readmes | wc -l
165
```

**Wave-1 vocabulary and pattern, quoted.** The wave-1 ruleset (`marketing-first-screen-copy.md`, section "MKT-PAGE-06 and -07: pattern and vocabulary", lines 71-74) gives:

```sh
STAGE='alpha|beta|pre-?1\.0|pre-?release|preview|experimental|unstable|skeleton|concept|work in progress|early (access|development)|under (active )?development|no longer (actively )?maintained|unmaintained|archived|deprecated|stabiliz\w*'
grep -i -P "^[^:]+:\d+:[>\s*_]*(status|$STAGE)[*_]*\s*[:.]|\b(this (project|tool|crate|package|extension|app|library|repository)|it|$NAME) (is|are) (still |currently |now )?(in )?(an? )?($STAGE)"
```

The label arm is the part before the `|`: `^[^:]+:\d+:[>\s*_]*(status|$STAGE)[*_]*\s*[:.]`. The `^[^:]+:\d+:` prefix only strips the `file:line:` that `grep -n` adds. The scanner and the awk guard read the file directly, so they drop that prefix and keep the rest.

Check that the scanner's `STAGE` is the wave-1 string. The command extracts the line from the ruleset and compares it with the one in `scan.py`:

```
$ R=/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/marketing-first-screen-copy.md
$ grep -m1 "^STAGE=" $R | sed "s/^STAGE='//; s/'\$//" > /tmp/s_wave1.txt
$ python3 -I -c "import re; m=re.search(r\"^STAGE=r'(.*)'\$\",open('$C/q4s/scan.py').read(),re.M).group(1); w=open('/tmp/s_wave1.txt').read().strip(); print('scan.py STAGE == wave1 STAGE:', m==w)"
scan.py STAGE == wave1 STAGE: True
```

The awk guard's `S` string is the same list with `stabiliz\w*` written as `stabiliz[[:alnum:]_]*` (POSIX awk has no `\w`) and `pre-?1\.0` written `pre-?1\\.0` (string escaping). `\w` in Python and `[[:alnum:]_]` match the same ASCII characters, and the guard produced the same hits as the scanner in the tests below.

**Wave-1 split, quoted.** The ruleset's audit row (line 117) reads: "Violated on 2 of 2 heroes and on 7 of 10 in-scope pre-1.0 READMEs". Verdict-section item 3 (line 133) says "as 7 of 10 in-scope fleet pre-1.0 READMEs do". The split is quoted from the ruleset and not re-derived here. The fleet scan below produced the same five passing README lines that the ruleset names for its "Pass" list (`grimoire`, `grim-gui`, `grim-mirror`, `indexbot`, `website`), so the pass side of the split is consistent.

**Scanner.** `q4s/scan.py` (full text in the Appendix) applies `LABEL = ^[>\s*_]*(status|STAGE)[*_]*\s*[:.]`, case-insensitive. This is the label arm minus the grep prefix. Modes:

- `window`: drops blank lines, lines matching `SKIP` (HTML wrapper tags `<div`, `<p align`, `</p>`, `<img`, `<picture`, `<source`, `<br`, and badge lines starting `[![`), stops at the first line starting `## `, and holds at most 15 counted lines. Code fences are not excluded here.
- `full`: every non-blank line outside ``` fences.
- A hit is `wrapped` when the previous physical line is non-blank, does not end in `.`, `!`, `?` or `:`, does not begin with `#`, a list marker, `|`, a fence, `<` or `>`, does not end in `-->` or `)`, and is not a numbered item.

Corpus run:

```
$ python3 -I $C/q4s/scan.py window readmes/*.md
window files 165 lines 1670 hits 0 wrapped 0

$ python3 -I $C/q4s/scan.py full readmes/*.md
full files 165 lines 20910 hits 2 wrapped 1
('casey_just.md', 1929, True, 'unstable.', 'e `set lists`<sup>1.53.0</sup>, which is currently')
('nodejs_node.md', 46, False, '* **Alpha**: Under active development where semver-major changes are allowed.', '')
```

The `casey/just` hit is the false positive the question asks about. The source is two physical lines: `...which is currently` then `unstable.` The word "unstable" starts the second line and a period follows it. It is line 1,929 of a long README, far outside any first-screen window. The `nodejs/node` hit is a list item that defines release stages. It is not a wrapped line, and it is also outside the window.

**Wider test of the precondition.** The question underneath: how often does a line that starts with a stage word follow a prose line at all? `q4s/pre.py` (Appendix) counts, outside code fences, non-blank lines that start with `status` or a stage word followed by any character (word boundary), whose previous physical line is non-blank and is not a heading, list item, numbered item, table row, fence, HTML line or blockquote. It then reports how many of those also match the label arm.

```
$ python3 -I $C/q4s/pre.py readmes/*.md
readmes/casey_just.md 1929 LABEL 'unstable.'
lines 20910 stage-word-start after prose 1 of which label arm 1
```

Only 1 of 20,910 lines in the corpus is a line that begins with a stage word after a prose line, and that one fires the arm. The punctuation requirement is not what protects the arm. Such lines are simply rare. When one occurs, a sentence-final word followed by a period fires it.

**Recall check on the fleet.** The 17 fleet READMEs are the glob `/home/mherwig/dev/{ocx-sh,grimoire-rs}/*/README.md`:

```
$ ls /home/mherwig/dev/{ocx-sh,grimoire-rs}/*/README.md
/home/mherwig/dev/grimoire-rs/grim-gui/README.md
/home/mherwig/dev/grimoire-rs/grim-mirror/README.md
/home/mherwig/dev/grimoire-rs/grimoire/README.md
/home/mherwig/dev/grimoire-rs/indexer/README.md
/home/mherwig/dev/grimoire-rs/vscode/README.md
/home/mherwig/dev/ocx-sh/catalog/README.md
/home/mherwig/dev/ocx-sh/conventions/README.md
/home/mherwig/dev/ocx-sh/devcontainer-features/README.md
/home/mherwig/dev/ocx-sh/e2e-index/README.md
/home/mherwig/dev/ocx-sh/grimoire-lore/README.md
/home/mherwig/dev/ocx-sh/index/README.md
/home/mherwig/dev/ocx-sh/indexbot/README.md
/home/mherwig/dev/ocx-sh/ocx-mirror/README.md
/home/mherwig/dev/ocx-sh/ocx/README.md
/home/mherwig/dev/ocx-sh/rules_ocx/README.md
/home/mherwig/dev/ocx-sh/website/README.md
/home/mherwig/dev/ocx-sh/www-setup/README.md

$ python3 -I $C/q4s/scan.py window /home/mherwig/dev/{ocx-sh,grimoire-rs}/*/README.md
window files 17 lines 148 hits 5 wrapped 0
('README.md', 9, False, '> **Status: skeleton.** The window shows the version of the `grim` it finds, or', '')
('README.md', 10, False, 'Status: Unstable. Source only, no releases. The CLI, the `mirror.toml` file', '')
('README.md', 27, False, '> **Status:** stabilizing toward 1.0 — released surfaces are frozen', '')
('README.md', 18, False, '> **Pre-release.** 0.1.0 is the extraction of this bot out of `ocx-sh/index`,', '')
('README.md', 7, False, 'Status: the library shipped as `v0.1.0`. The root site (`site/`), Bunny as code (`infra/bu', '')

$ python3 -I $C/q4s/scan.py full /home/mherwig/dev/{ocx-sh,grimoire-rs}/*/README.md
full files 17 lines 1256 hits 6 wrapped 0
('README.md', 9, False, '> **Status: skeleton.** The window shows the version of the `grim` it finds, or', '')
('README.md', 10, False, 'Status: Unstable. Source only, no releases. The CLI, the `mirror.toml` file', '')
('README.md', 27, False, '> **Status:** stabilizing toward 1.0 — released surfaces are frozen', '')
('README.md', 60, False, 'Pre-1.0. The end-to-end loop was proven against live GitHub repositories on', '')
('README.md', 18, False, '> **Pre-release.** 0.1.0 is the extraction of this bot out of `ocx-sh/index`,', '')
('README.md', 7, False, 'Status: the library shipped as `v0.1.0`. The root site (`site/`), Bunny as code (`infra/bu', '')
```

The scanner prints only the basename; the glob order (grimoire-rs first, then ocx-sh) maps the lines to `grim-gui:9`, `grim-mirror:10`, `grimoire:27`, `indexbot:18`, `website:7`, and `indexer:60` in the full run. The guard output below confirms the file names. All five window hits are real status lines. None is wrapped. The same precondition check on the fleet:

```
$ python3 -I $C/q4s/pre.py /home/mherwig/dev/{ocx-sh,grimoire-rs}/*/README.md
/home/mherwig/dev/grimoire-rs/indexer/README.md 154 nolabel 'preview is the release output, not an approximation. Edits under'
lines 1256 stage-word-start after prose 1 of which label arm 0
```

So the fleet also has one wrapped stage-word start (`indexer` line 154, "preview"), and it does not fire the arm because no `:` or `.` follows the word.

## Proposed guard and its check

The guard keeps a label-arm hit only when the physical line before it is blank, a heading, or the file start. `q4s/lab.sh` (Appendix, gawk) is the first version; `q4s/lab2.sh` (Appendix) is the portable version with `tolower()` and is the one to publish.

Guard on the false positive and on the five fleet status READMEs:

```
$ sh $C/q4s/lab.sh readmes/casey_just.md
$ echo "exit=$?"
exit=0
$ for r in grimoire-rs/grim-gui grimoire-rs/grim-mirror grimoire-rs/grimoire ocx-sh/indexbot ocx-sh/website; do sh $C/q4s/lab.sh /home/mherwig/dev/$r/README.md | cut -c1-120; done
/home/mherwig/dev/grimoire-rs/grim-gui/README.md:9:> **Status: skeleton.** The window shows the version of the `grim` it
/home/mherwig/dev/grimoire-rs/grim-mirror/README.md:10:Status: Unstable. Source only, no releases. The CLI, the `mirror.
/home/mherwig/dev/grimoire-rs/grimoire/README.md:27:> **Status:** stabilizing toward 1.0 — released surfaces are froze
/home/mherwig/dev/ocx-sh/indexbot/README.md:18:> **Pre-release.** 0.1.0 is the extraction of this bot out of `ocx-sh/ind
/home/mherwig/dev/ocx-sh/website/README.md:7:Status: the library shipped as `v0.1.0`. The root site (`site/`), Bunny as
```

The false positive gives empty output. The five fleet lines are the same five that the scanner printed in window mode.

Guard over all 17 fleet READMEs and all 165 corpus READMEs (whole file, so it includes the `indexer:60` line the window excludes):

```
$ for f in /home/mherwig/dev/{ocx-sh,grimoire-rs}/*/README.md; do sh $C/q4s/lab.sh $f; done | cut -c1-110
/home/mherwig/dev/ocx-sh/indexbot/README.md:18:> **Pre-release.** 0.1.0 is the extraction of this bot out of `
/home/mherwig/dev/ocx-sh/website/README.md:7:Status: the library shipped as `v0.1.0`. The root site (`site/`),
/home/mherwig/dev/grimoire-rs/grim-gui/README.md:9:> **Status: skeleton.** The window shows the version of the
/home/mherwig/dev/grimoire-rs/grim-mirror/README.md:10:Status: Unstable. Source only, no releases. The CLI, th
/home/mherwig/dev/grimoire-rs/grimoire/README.md:27:> **Status:** stabilizing toward 1.0 — released surfaces
/home/mherwig/dev/grimoire-rs/indexer/README.md:60:Pre-1.0. The end-to-end loop was proven against live GitHub

$ for f in readmes/*.md; do sh $C/q4s/lab.sh $f; done | cut -c1-110
readmes/nodejs_node.md:46:* **Alpha**: Under active development where semver-major changes are allowed.
```

Six of six fleet hits kept (recall unchanged), and on the corpus the guard removes the one wrapped hit and keeps the `nodejs/node` list item. The guard is looser than the scanner's `wrapped` flag in one way: it drops a hit whose previous line is a list item or a table row, where the scanner's flag would not. The `nodejs/node` line passes anyway because its previous line is blank.

Untested placement, now tested with a synthetic file (the wrapped case, then a clean label line):

```
$ printf 'Some prose that is\nunstable. More text.\n\nStatus: alpha.\n' > $C/q4s/synth.md
$ sh $C/q4s/lab.sh $C/q4s/synth.md
/home/mherwig/.cache/research-lang/exemplars/product/wave2/q4s/synth.md:4:Status: alpha.
```

Line 2 (`unstable. More text.`) is dropped; line 4 (`Status: alpha.`) is kept.

Portability. The first guard used `IGNORECASE=1`, a gawk extension. Here are both guards on an uppercase status line, once under gawk and once under `mawk` (the Debian/Ubuntu default `awk` package alternative):

```
$ readlink -f $(which awk); awk --version | head -1
/usr/bin/gawk
GNU Awk 5.2.1, API 3.2, PMA Avon 8-g1, (GNU MPFR 4.2.1, GNU MP 6.3.0)
$ printf 'STATUS: ALPHA.\n' > $C/q4s/up.md
$ sed "s/^awk /mawk /" $C/q4s/lab.sh > $C/q4s/lab_mawk.sh; sh $C/q4s/lab_mawk.sh $C/q4s/up.md; echo "exit=$?"
exit=0
$ sed "s/^awk /mawk /" $C/q4s/lab2.sh > $C/q4s/lab2_mawk.sh; sh $C/q4s/lab2_mawk.sh $C/q4s/up.md
/home/mherwig/.cache/research-lang/exemplars/product/wave2/q4s/up.md:1:STATUS: ALPHA.
```

Under `mawk` the `IGNORECASE` guard prints nothing for `STATUS: ALPHA.` (a silent miss). The `tolower()` guard prints the line. On all 182 files (165 corpus, 17 fleet) `lab.sh` and `lab2.sh` under gawk give byte-identical output:

```
$ for f in readmes/*.md /home/mherwig/dev/{ocx-sh,grimoire-rs}/*/README.md; do sh $C/q4s/lab.sh $f; done | md5sum
8bb17a92cbbc7301d89ae1100accbe6c  -
$ for f in readmes/*.md /home/mherwig/dev/{ocx-sh,grimoire-rs}/*/README.md; do sh $C/q4s/lab2.sh $f; done | md5sum
8bb17a92cbbc7301d89ae1100accbe6c  -
```

## Effect on the ruleset

| Rule | Effect | Text |
|---|---|---|
| MKT-PAGE-06 | **confirm** the label arm as it stands for the first-screen window | Measured false-fire rate 0 of 165 READMEs (about 1.8% upper bound at 95%). No severity change. |
| MKT-PAGE-06 | **change** the label arm, adding the wrap guard | Replace the label arm (the part of the `grep -i -P` pattern before the first `\|`, including its `^[^:]+:\d+:` prefix) with the `tolower()` awk below, run on the extracted window file. Add to the Verification column: "A label-arm hit counts only when the physical line before it is blank, starts with `#`, or does not exist (`FNR==1`). A hit on a line that continues a sentence ('...which is currently' then 'unstable.') is a wrapped line and does not count." Keep the sentence arm as the existing `grep -i -P` with only its second alternative. Label-arm command: the `lab2.sh` awk shown in the block directly below this table (Appendix has the same text). Do not use `IGNORECASE`: it is gawk-only. |
| MKT-PAGE-09 | confirm | Not touched. The grade-word arm has a separate lookaround and no wrapped-line measurement was made for it. |
| NEW | none | The guard is a repair of an existing pattern, not a new rule. |

Label-arm command to put in the ruleset code block (identical to `lab2.sh`, run on the extracted window file):

```sh
awk 'BEGIN{S="alpha|beta|pre-?1\\.0|pre-?release|preview|experimental|unstable|skeleton|concept|work in progress|early (access|development)|under (active )?development|no longer (actively )?maintained|unmaintained|archived|deprecated|stabiliz[[:alnum:]_]*"} (tolower($0) ~ "^[>[:space:]*_]*(status|" S ")[*_]*[[:space:]]*[:.]") && (FNR==1 || prev ~ /^[[:space:]>]*$/ || prev ~ /^#/) {print FILENAME":"FNR":"$0} {prev=$0}' README.md
```

## Dated facts

- 165 `README.md` files fetched from `raw.githubusercontent.com`, default branch, 2026-11-27. No page carries a date that matters here; the measurement describes the files as fetched that day.
- Corpus counts, run 2026-11-27: window 0 hits in 1,670 lines; full 2 hits in 20,910 lines (1 wrapped); stage-word starts after prose: 1.
- Fleet READMEs (17), local copies read 2026-11-27: 5 label-arm hits in the window, 6 in the whole file, 0 wrapped; 1 stage-word start after prose that does not fire the arm.
- Wave-1 ruleset text quoted from `marketing-first-screen-copy.md` as on disk on 2026-11-27 (lines 58, 71-74, 117, 133).
- Tool versions: GNU Awk 5.2.1 (`/usr/bin/gawk`), `mawk` at `/usr/bin/mawk`, Python 3 (run with `-I`).

## What could not be determined

- Whether a wrapped stage word is rarer or commoner in READMEs that have a real status line near the top. The popular-project corpus has almost none, so the conditional rate is untested. A corpus of READMEs that carry status lines (for example, repositories that use repostatus.org badges) would answer it.
- Rendered window behaviour. The 15-line window is a source-line proxy (a separate open question shared with channels), so the 0-of-165 figure holds for that proxy only.
- READMEs in languages other than English, and READMEs reflowed by editors at 72 columns. The corpus has hard-wrapped files (`just` is one), but I did not stratify by wrap width.
- The corpus was assembled by hand from names I could think of, which biases it toward large, popular projects. A random-sample endpoint without a credential was not available to me.
- The `mawk` run proves only the `IGNORECASE` difference. I did not test BSD awk or `busybox awk`.

## Appendix: script texts (verbatim, as run)

`$C/q4s/scan.py`:

```python
import re,sys,glob,os
STAGE=r'alpha|beta|pre-?1\.0|pre-?release|preview|experimental|unstable|skeleton|concept|work in progress|early (access|development)|under (active )?development|no longer (actively )?maintained|unmaintained|archived|deprecated|stabiliz\w*'
LABEL=re.compile(r'^[>\s*_]*(status|%s)[*_]*\s*[:.]'%STAGE,re.I)
SKIP=re.compile(r'^\s*(</?div|<p\s+align|</p>|<img|<picture|</picture>|<source|<br|\[!\[)',re.I)
mode=sys.argv[1]  # window|full
tot=0;files=0;hits=[]
for p in sorted(sys.argv[2:]):
    lines=open(p,encoding='utf-8',errors='replace').read().split('\n')
    files+=1;k=0;incode=False
    for i,l in enumerate(lines):
        if l.strip().startswith('```'): incode=not incode
        if mode=='window':
            if re.match(r'^## ',l,re.I): break
            if not l.strip() or SKIP.match(l): continue
            k+=1
            if k>15: break
        else:
            if incode or not l.strip(): continue
        tot+=1
        if LABEL.search(l):
            prev=lines[i-1] if i>0 else ''
            wrapped=bool(prev.strip()) and not re.search(r'[.!?:]\s*$|^\s*(#|[-*+]\s|\||```|<|>)|-->|\)$',prev.strip()) and not re.match(r'^\s*(#|[-*+]\s|\d+\.|\||```|<)',prev)
            hits.append((os.path.basename(p),i+1,wrapped,l.strip()[:90],prev.strip()[-50:]))
print(mode,'files',files,'lines',tot,'hits',len(hits),'wrapped',sum(h[2] for h in hits))
for h in hits: print(h)
```

`$C/q4s/pre.py` (written in this repair pass):

```python
import re,sys
STAGE=r'alpha|beta|pre-?1\.0|pre-?release|preview|experimental|unstable|skeleton|concept|work in progress|early (access|development)|under (active )?development|no longer (actively )?maintained|unmaintained|archived|deprecated|stabiliz\w*'
LABEL=re.compile(r'^[>\s*_]*(status|%s)[*_]*\s*[:.]'%STAGE,re.I)
START=re.compile(r'^[>\s*_]*(status|%s)\b'%STAGE,re.I)   # line starts with stage word, any punctuation
NONPROSE=re.compile(r'^\s*(#|[-*+]\s|\d+\.|\||```|<|>)')
n=m=tot=0
for p in sorted(sys.argv[1:]):
    L=open(p,encoding='utf-8',errors='replace').read().split('\n');inc=False
    for i,l in enumerate(L):
        if l.strip().startswith('```'): inc=not inc
        if inc or not l.strip(): continue
        tot+=1
        prev=L[i-1] if i else ''
        if START.match(l) and prev.strip() and not NONPROSE.match(prev):
            n+=1; hit=bool(LABEL.search(l)); m+=hit
            print(p,i+1,'LABEL' if hit else 'nolabel',repr(l.strip()[:70]))
print('lines',tot,'stage-word-start after prose',n,'of which label arm',m)
```

`$C/q4s/lab.sh` (gawk-only):

```sh
# label arm, wrap-safe: a stage-label line counts only when the physical line before it is blank, a heading, or the file start
awk 'BEGIN{IGNORECASE=1;S="alpha|beta|pre-?1\\.0|pre-?release|preview|experimental|unstable|skeleton|concept|work in progress|early (access|development)|under (active )?development|no longer (actively )?maintained|unmaintained|archived|deprecated|stabiliz[[:alnum:]_]*"} ($0 ~ "^[>[:space:]*_]*(status|" S ")[*_]*[[:space:]]*[:.]") && (FNR==1 || prev ~ /^[[:space:]>]*$/ || prev ~ /^#/) {print FILENAME":"FNR":"$0} {prev=$0}' "$1"
```

`$C/q4s/lab2.sh` (portable, to publish):

```sh
# portable variant: tolower() instead of gawk-only IGNORECASE
awk 'BEGIN{S="alpha|beta|pre-?1\\.0|pre-?release|preview|experimental|unstable|skeleton|concept|work in progress|early (access|development)|under (active )?development|no longer (actively )?maintained|unmaintained|archived|deprecated|stabiliz[[:alnum:]_]*"} (tolower($0) ~ "^[>[:space:]*_]*(status|" S ")[*_]*[[:space:]]*[:.]") && (FNR==1 || prev ~ /^[[:space:]>]*$/ || prev ~ /^#/) {print FILENAME":"FNR":"$0} {prev=$0}' "$1"
```
