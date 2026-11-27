---
title: Where a pitch page declares doc_surface (source comment versus built meta tag)
program: product
topic: marketing-first-screen-copy
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 4
---

# Where a pitch page declares doc_surface

## Question

Can the checks read a `// doc_surface: pitch` line in an `.astro` frontmatter fence, or should a pitch declare itself in the built HTML with a `<meta>` tag? (Open questions of `marketing-first-screen-copy.md`; blocks MKT-PAGE-02 on the grimoire.rs page.)

## Answer

**No. No check reads a comment inside an `.astro` frontmatter fence, and CR-3 as written would not change that. The pitch should declare itself in the built HTML with `<meta name="doc-surface" content="pitch">`.** For markdown and MDX sources the source comment remains valid and stays the declaration of record.

All measurements ran on 2026-11-27. `W` is this worktree, `C=$W/skills/docs-quality-reference/checks` (worktree HEAD `9dbe49c`), `S=~/.cache/research-lang/exemplars/product/wave2/mfsc-q1`. The checks know `doc_type` and `doc_tier` only, so tests of the source readers use `doc_type`, whose regex shape the planned `doc_surface` shares.

## Measurements

### 0. Where the code and the fleet pages are (each line number below came from a command)

```
$ grep -n "DECL_RE = \|split_front_matter(lines)\|MAX_DECL_LINE = " $C/doc_declaration.py
49:DECL_RE = re.compile(r"^\s*(<!--|\{/\*|\.\.|%|//)\s*(doc_type|doc_tier)\s*:\s*([A-Za-z][\w-]*)")
51:MAX_DECL_LINE = 12  # 12 lines (wave2-declaration-key.md section 3)
$ sed -n 305p $C/doc_declaration.py
        if p.suffix in (".md", ".mdx", ".rst", ".adoc", ".asciidoc") and p.is_file()
$ grep -n "DOC_SUFFIXES = \|^DECL = " $C/strip_prose.py
31:DOC_SUFFIXES = (".md", ".mdx", ".markdown")
61:DECL = re.compile(r"^\s*(?:<!--|\{/\*|\.\.|%)\s*doc_(type|tier)\s*:\s*([\w-]+)")
```

`split_front_matter` (`doc_declaration.py:84-91`) returns the line after a leading `---` block, and `read_declaration` (`:94-103`) scans `MAX_DECL_LINE` = 12 lines from there. `strip_prose.declaration` (`:201-208`) scans the first 12 raw lines.

The grimoire.rs pitch is `grimoire-rs/grimoire/docs/src/pages/index.astro` (repo HEAD `72d3fce1`, 2026-11-24):

```
$ grep -n '^---$' .../grimoire/docs/src/pages/index.astro
1:---
32:---
$ grep -n "head: \[\|theme-color" .../grimoire/docs/src/pages/index.astro
43:    head: [
47:      { tag: 'meta', attrs: { name: 'theme-color', content: '#161826' } },
$ grep '"astro"\|starlight' .../grimoire/docs/package.json
    "@astrojs/starlight": "0.43.1",
    "astro": "7.4.13",
$ grep -o '<meta name="generator"[^>]*>' .../grimoire/docs/dist/index.html
<meta name="generator" content="Astro v7.4.13"/>
<meta name="generator" content="Starlight v0.43.1"/>
```

Correction to the first version of this file: the fence is lines 1-32, not 1-75; and the `head:` array that already carries `theme-color` is at lines 43-60 of the template props. The ocx pitch is not in `ocx-sh/ocx` (its `website/src/content/docs/index.mdx` is a docs home, "Get started"): it is `ocx-sh/website/site/src/content/docs/index.mdx` (repo HEAD `a9dd6af`, 2026-11-16), which mounts `Landing.astro`.

```
$ sed -n 14p /home/mherwig/dev/ocx-sh/website/site/src/content/docs/index.mdx
{/* doc_type: landing */}
$ python3 -I $S/tools/m1.py $C /home/mherwig/dev/ocx-sh/website/site/src/content/docs/index.mdx
.../website/site/src/content/docs/index.mdx doc_declaration.read_declaration = {'doc_type': (14, '{/*', 'landing'), 'doc_tier': (15, '{/*', 'first-steps')} | strip_prose.declaration = {}
```

Front matter of that file ends at line 11 (`head:` field already present there), so line 14 is inside the 12-line window after it. `strip_prose.declaration` returns `{}` for it because the front matter eats the raw first 12 lines: a second drift between the two readers, besides `//`.

### 1. A `//` line in an `.astro` fence is skipped

Scratch pages, content exactly as stored (`cat` output, `b.astro` abbreviated by `...` only in this document: it has `// c1` to `// c45` on lines 2-46, then the declaration on line 47, `---` on line 48, `<h1>Hi</h1>` on 49; `wc -l` = 49):

```
--- $S/pages/a.astro
---
// doc_type: landing
// doc_tier: first-steps
const a=1;
---
<h1>Hi</h1>
--- $S/pages/b.astro
---
// c1
// c2
...
// c45
// doc_type: landing
---
<h1>Hi</h1>
--- $S/pages/c.astro
---
const a=1;
---
<!-- doc_type: landing -->
<!-- doc_tier: first-steps -->
<h1>Hi</h1>
```

The probe is the file `$S/tools/m1.py` (it imports both modules from the directory given as first argument and prints each reader's result):

```
import sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import doc_declaration, strip_prose
for f in sys.argv[2:]:
    t = Path(f).read_text(encoding="utf-8")
    print(f, "doc_declaration.read_declaration =", doc_declaration.read_declaration(t),
          "| strip_prose.declaration =", strip_prose.declaration(t))
```

```
$ python3 -I tools/m1.py $C pages/a.astro pages/b.astro pages/c.astro
pages/a.astro doc_declaration.read_declaration = {} | strip_prose.declaration = {}
pages/b.astro doc_declaration.read_declaration = {} | strip_prose.declaration = {}
pages/c.astro doc_declaration.read_declaration = {'doc_type': (4, '<!--', 'landing'), 'doc_tier': (5, '<!--', 'first-steps')} | strip_prose.declaration = {'doc_type': 'landing', 'doc_tier': 'first-steps'}
$ python3 -I $C/doc_declaration.py --root . pages/a.astro
pages/a.astro:1: DOC-TYPE-01: no doc_type declaration in the first 12 lines
exit=1
$ python3 -I $C/doc_declaration.py --root . pages/b.astro
pages/b.astro:1: DOC-TYPE-01: no doc_type declaration in the first 12 lines
exit=1
$ python3 -I $C/doc_declaration.py --root . pages/c.astro
exit=0
```

Why `a.astro` fails in each reader differs. `doc_declaration` sees `---` on line 1, treats lines 1-5 as front matter and then reads only the template. `strip_prose` has no front-matter step but its `DECL` lacks `//`. To separate the two causes, a scratch copy of `strip_prose.py` with `//` added to line 61 (`$S/checks-slash/`; `sed -i` on the copy only):

```
$ python3 -I tools/m1.py checks-slash pages/a.astro pages/b.astro
pages/a.astro doc_declaration.read_declaration = {} | strip_prose.declaration = {'doc_type': 'landing', 'doc_tier': 'first-steps'}
pages/b.astro doc_declaration.read_declaration = {} | strip_prose.declaration = {}
```

So CR-3's planned `//` opener would make `strip_prose` read a declaration that sits in lines 2-12 of a fence, but never one past line 12 (the real grimoire.rs fence is 32 lines) and `doc_declaration` never reads any fence content.

### 2. The checker never visits `.astro` files

```
$ python3 -I $C/doc_declaration.py --root pages
exit=0
```

No output over `pages/` holding three `.astro` files: `collect` (`doc_declaration.py:305`) walks `.md .mdx .rst .adoc .asciidoc` only, and `strip_prose.py:31` lists `.md .mdx .markdown`.

### 3. What reaches the built HTML

Correction to the first version: its table said the meta page printed `1` for `grep -c doc_surface`. That was wrong; the meta attribute is spelled `doc-surface`, so that grep prints 0. Re-run below with the sources and raw output.

Scratch pages in `$S/site/src/pages/` (Astro 5.16.0, `package.json`: `{"name":"t","private":true,"type":"module","dependencies":{"astro":"^5.16.0"}}`; `grep '"version"' node_modules/astro/package.json` prints `"version": "5.16.0"`):

```
--- a.astro                         --- c.astro
---                                 ---
// doc_surface: pitch               const a=1;
const a=1;                          ---
---                                 <!-- doc_surface: pitch -->
<html><head><title>T</title></head><body><main><h1>Hi</h1></main></body></html>   (same html line follows the comment in c.astro)
--- m.astro                         --- n.astro
---                                 ---
const a=1;                          const a=1;
---                                 ---
<html><head><title>T</title><meta name="doc-surface" content="pitch"></head><body><main><h1>Hi</h1></main></body></html>   (n.astro: the same line without the meta)
```

```
$ cd $S/site && npx astro build        # astro.config.mjs set to export default {compressHTML:false};
14:14:25 [build] output: "static"
...
14:14:26 ▶ src/pages/a.astro
14:14:26   └─ /a/index.html (+5ms)
14:14:26 ▶ src/pages/c.astro
14:14:26   └─ /c/index.html (+1ms)
14:14:26 ▶ src/pages/m.astro
14:14:26   └─ /m/index.html (+1ms)
14:14:26 ▶ src/pages/n.astro
14:14:26   └─ /n/index.html (+1ms)
14:14:26 [build] 4 page(s) built in 861ms
14:14:26 [build] Complete!        (exit 0)
$ for d in a c m n; do cat dist/$d/index.html; grep -c doc_surface dist/$d/index.html; done
a  <!DOCTYPE html>\n<html><head><title>T</title></head><body><main><h1>Hi</h1></main></body></html>   grep -c = 0
c  <!DOCTYPE html>\n<!-- doc_surface: pitch --><html><head><title>T</title></head>...                  grep -c = 1
m  <!DOCTYPE html>\n<html><head><title>T</title><meta name="doc-surface" content="pitch"></head>...    grep -c = 0 (grep -c 'name="doc-surface"' = 1)
n  <!DOCTYPE html>\n<html><head><title>T</title></head><body>...                                      grep -c = 0
```

The same run with Astro's default `compressHTML` (config file moved aside, `mv astro.config.mjs astro.config.mjs.off`) printed, for each page, `<!DOCTYPE html><html>...` on one line with the same content: a: no declaration; c: `<!DOCTYPE html><!-- doc_surface: pitch --><html>...` (`grep -c doc_surface` 1); m: meta kept in `<head>` (`grep -c 'name="doc-surface"'` 1); n: none. So the default compressor keeps the template comment and the meta; this answers the old "compressHTML" gap for Astro itself.

Same four pages on Astro **7.4.13**, the version grimoire.rs builds with, copied into the grimoire.rs docs project (below) as `src/pages/t{a,c,m,n}.astro`, `npx astro build` exit 0, `grep '"version"' node_modules/astro/package.json` printing `"version": "7.4.13"`:

```
dist/ta.html <!DOCTYPE html><html><head><title>T</title><script type="module" src="/_astro/page.cNngjUgL.js"></script></head>...
dist/tc.html <!DOCTYPE html><!-- doc_surface: pitch --><html><head>...
dist/tm.html <!DOCTYPE html><html><head><title>T</title><meta name="doc-surface" content="pitch"><script ...></script></head>...
dist/tn.html <!DOCTYPE html><html><head><title>T</title><script ...></script></head>...
```

Identical behaviour on v7. The template comment lands before `<html>`, outside `<head>`.

Astro's documentation says the same: "HTML-style comments will be included in browser DOM, while JS ones will be skipped." ([Astro docs, Template syntax](https://docs.astro.build/en/basics/astro-syntax/): the page shows no date; the last commit to its source file `src/content/docs/en/basics/astro-syntax.mdx` in `withastro/docs` is 2024-12-03, per `curl -s "https://api.github.com/repos/withastro/docs/commits?path=src/content/docs/en/basics/astro-syntax.mdx&per_page=1"`; fetched 2026-11-27).

### 4. A real Starlight build of the grimoire.rs pitch with the added head entry

The first version did not run this. Now done: a copy of `grimoire-rs/grimoire/docs` (`src`, `public`, `node_modules`, config; nothing written to the original) sits in `$S/grimdocs`, with one line added to the `head:` array of `src/pages/index.astro`:

```
$ diff .../grimoire/docs/src/pages/index.astro grimdocs/src/pages/index.astro
47a48
>       { tag: 'meta', attrs: { name: 'doc-surface', content: 'pitch' } },
$ cd $S/grimdocs && npx astro build
...
14:13:37 [starlight:pagefind] Found 49 HTML files.
 validating links
· All internal links are valid. ·
14:13:38 [@astrojs/sitemap] `sitemap-index.xml` created at `dist`
14:13:38 [build] 47 page(s) built in 11.33s
14:13:38 [build] Complete!        (exit 0)
$ grep -o '<meta name="doc-surface"[^>]*>' dist/index.html
<meta name="doc-surface" content="pitch"/>
$ grep -o '<meta name="theme-color"[^>]*>' dist/index.html
<meta name="theme-color" content="#161826"/>
```

The head entry renders in the real Starlight 0.43.1 / Astro 7.4.13 build, next to the existing `theme-color`. Starlight documents the field: "You can add additional tags to your page's `<head>` using the `head` frontmatter field." ([Starlight, Frontmatter reference](https://starlight.astro.build/reference/frontmatter/), "Last updated: May 7, 2026" on the page; fetched 2026-11-27; the page's own example is a `title` tag, so the `meta` use rests on the build above, not on the page). The `.mdx` form (`head:` in front matter) was also built (section 5, pages `zz-*`).

### 5. The verification tool (new, in the scratch dir, proposed as the reference for CR-3's built-page reader)

`$S/tools/surface_scan.py`, 82 lines, complete:

```python
#!/usr/bin/env python3
"""Read doc_surface from built HTML (meta tag) and from markdown-family sources (comment).

  surface_scan.py built DIST_DIR            list every built page; exit 1 on a bad or doubled meta
  surface_scan.py built DIST_DIR --need H   also exit 1 if a page with an <h1> in H (relative path) has no meta
  surface_scan.py source FILE...            print the source declaration of each file
  surface_scan.py pair BUILT SOURCE         exit 1 if the two declarations differ
  surface_scan.py list SURFACE DIST_DIR     print the built pages that declare SURFACE
"""
import re, sys
from pathlib import Path

VALID = ("pitch", "home")
META = re.compile(r"<meta\b[^>]*>", re.I)
NAME = re.compile(r"""name\s*=\s*["']?doc-surface["']?(?=[\s/>])""", re.I)
CONTENT = re.compile(r"""content\s*=\s*["']?([\w-]*)""", re.I)
DECL = re.compile(r"^\s*(?:<!--|\{/\*|\.\.|%|//)\s*doc_surface\s*:\s*([\w-]+)")


def built(text: str) -> list[str]:
    out = []
    for m in META.findall(text):
        if NAME.search(m):
            c = CONTENT.search(m)
            out.append(c.group(1) if c else "")
    return out


def source(text: str) -> str | None:
    lines = text.splitlines()
    start = 0
    if lines and lines[0].strip() == "---":  # same rule as doc_declaration.split_front_matter
        for i in range(1, min(len(lines), 40)):
            if lines[i].strip() == "---":
                start = i + 1
                break
    for line in lines[start:start + 12]:
        m = DECL.match(line)
        if m:
            return m.group(1)
    return None


def pages(dist: Path):
    return sorted(p for p in dist.rglob("*.html"))


def main(a: list[str]) -> int:
    if len(a) >= 2 and a[0] == "built":
        dist, need, bad, tally, skipped = Path(a[1]), (a[a.index("--need") + 1] if "--need" in a else None), 0, {}, 0
        for p in pages(dist):
            t = p.read_text(encoding="utf-8", errors="replace")
            v = built(t)
            rel = p.relative_to(dist).as_posix()
            if len(v) > 1 or (v and v[0] not in VALID):
                print(f"{rel}: INVALID {v}"); bad = 1
            elif v:
                print(f"{rel}: {v[0]}"); tally[v[0]] = tally.get(v[0], 0) + 1
            else:
                skipped += 1
                if need == rel and "<h1" in t:
                    print(f"{rel}: has <h1> and no doc-surface meta"); bad = 1
        print(f"pitch={tally.get('pitch', 0)} home={tally.get('home', 0)} skipped_no_doc_surface={skipped}")
        return bad
    if len(a) >= 2 and a[0] == "source":
        for f in a[1:]:
            print(f"{f}: {source(Path(f).read_text(encoding='utf-8'))}")
        return 0
    if len(a) == 3 and a[0] == "pair":
        b, s = built(Path(a[1]).read_text(encoding="utf-8")), source(Path(a[2]).read_text(encoding="utf-8"))
        print(f"built={b} source={s}")
        return 0 if (s is None or b == [s]) else 1
    if len(a) == 3 and a[0] == "list":
        for p in pages(Path(a[2])):
            if built(p.read_text(encoding="utf-8", errors="replace")) == [a[1]]:
                print(p)
        return 0
    print(__doc__); return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

Runs against the real builds:

```
$ python3 -I tools/surface_scan.py built /home/mherwig/dev/grimoire-rs/grimoire/docs/dist --need index.html
index.html: has <h1> and no doc-surface meta
pitch=0 home=0 skipped_no_doc_surface=49
(exit 1)                                   # today's grimoire.rs: MKT-PAGE-02 violated
$ python3 -I tools/surface_scan.py built grimdocs/dist --need index.html     # before the scratch pages were added
index.html: pitch
pitch=1 home=0 skipped_no_doc_surface=48
(exit 0)
$ python3 -I tools/surface_scan.py built /home/mherwig/dev/ocx-sh/website/site/dist --need index.html
index.html: has <h1> and no doc-surface meta
pitch=0 home=0 skipped_no_doc_surface=13
(exit 1)                                   # today's ocx pitch: same violation
```

Scratch Starlight pages for the two-reader, drift and hero cases (`$S/grimdocs/src/content/docs/`; each has `description` because the collection schema requires it; first build without it failed with `description**: **description: Required`):

```
zz-pitch.mdx    head: meta doc-surface=pitch ; body line 1: {/* doc_surface: pitch */}
zz-home.md      head: meta doc-surface=home  ; body: <!-- doc_surface: home -->   Plain description and a command.
zz-drift.mdx    head: meta doc-surface=home  ; body: {/* doc_surface: pitch */}   (source and built disagree)
zz-herohome.mdx head: meta doc-surface=home  ; body: {/* doc_surface: home */} <div class="hero tagline">Ship faster</div>
```

```
$ python3 -I tools/surface_scan.py built grimdocs/dist --need index.html     # after the scratch pages were added
index.html: pitch
tm.html: pitch
zz-drift.html: home
zz-herohome.html: home
zz-home.html: home
zz-pitch.html: pitch
pitch=3 home=3 skipped_no_doc_surface=51
(exit 0)
$ python3 -I tools/surface_scan.py source grimdocs/src/content/docs/zz-*
.../zz-drift.mdx: pitch
.../zz-herohome.mdx: home
.../zz-home.md: home
.../zz-pitch.mdx: pitch
$ python3 -I tools/surface_scan.py pair grimdocs/dist/zz-pitch.html     grimdocs/src/content/docs/zz-pitch.mdx
built=['pitch'] source=pitch      exit=0
$ ... pair grimdocs/dist/zz-home.html      .../zz-home.md
built=['home'] source=home        exit=0
$ ... pair grimdocs/dist/zz-drift.html     .../zz-drift.mdx
built=['home'] source=pitch       exit=1
$ ... pair grimdocs/dist/zz-herohome.html  .../zz-herohome.mdx
built=['home'] source=home        exit=0
$ for p in $(python3 -I tools/surface_scan.py list home grimdocs/dist); do echo -n "$p: "; grep -c 'class="[^"]*hero' $p; done
grimdocs/dist/zz-drift.html: 0
grimdocs/dist/zz-herohome.html: 1
grimdocs/dist/zz-home.html: 0
$ for f in grimdocs/src/content/docs/zz-home.md grimdocs/src/content/docs/zz-herohome.mdx; do echo -n "$f: "; grep -c -E '^hero:|template: *splash|<(Hero|Landing)\b|class="[^"]*hero' $f; done
grimdocs/src/content/docs/zz-home.md: 0
grimdocs/src/content/docs/zz-herohome.mdx: 1
```

## Why meta, not the template comment, and what stays

The template HTML comment survives the build in Astro 5 and 7 (section 3) but sits before `<html>`, is invisible to any DOM attribute reader, and only survives while no minifier downstream strips comments (not measured for the fleet deploy pipeline). A `<meta name="doc-surface">` is one element every HTML parser reads and it renders nothing. For `.md` and `.mdx` sources the source comment is already read by `doc_declaration.py` (after front matter, first 12 lines) and stays valid; section 1's ocx example shows `{/* doc_type: landing */}` at line 14 read correctly. Both pitches can also carry the meta, so the built-page audit (MKT-PAGE-03, -06, CR-4) has one reader.

## Effect on the ruleset

Verification commands use `surface_scan.py`, which is today a scratch tool (section 5). Until CR-3 ships a built-HTML reader in `checks/`, an agent copies it from this file. Each rule's check exits non-zero on failure.

- **MKT-PAGE-01: change.** New text: "Apply marketing first-screen rules only to a page declared `doc_surface: pitch` and to the first screen of the repository-root README of a repository that publishes a release or a package. A page is declared pitch by either reader: the source comment (markdown or MDX source) or the built `<meta name="doc-surface" content="pitch">` (any source). Never scope such a rule to `doc_type: landing`." Severity unchanged (MUST). Verification, runs today: (a) `grep -n 'doc_type: landing' <rule file>` prints nothing; (b) `python3 -I surface_scan.py built dist` prints `pitch=N home=M skipped_no_doc_surface=K`, the skip count over both readers' built side, and exits 0 (a bad or doubled meta value exits 1); for source files `python3 -I surface_scan.py source <files>` prints each file's declaration or `None`. Measured: on the patched grimoire.rs build the line is `pitch=1 home=0 skipped_no_doc_surface=48`, exit 0; on the unpatched one `pitch=0 home=0 skipped_no_doc_surface=49`. The README release-or-package test is unchanged.
- **MKT-PAGE-02: change.** New text: "Declare a product site's pitch with `doc_surface: pitch` in the source comment when the page source is markdown or MDX (first 12 lines after any front matter), and, for every pitch whatever its source, with `<meta name=\"doc-surface\" content=\"pitch\">` in the built `<head>` (Starlight: the `head:` field of the page's front matter, or the `head` prop of `StarlightPage`). Never place the declaration in an `.astro` frontmatter fence: no check reads it and the build drops it. Declare `home` on docs entry pages the same way. Give a section hub no declaration." Severity MUST. Verification, runs today after the build: `python3 -I surface_scan.py built dist --need index.html` exits 1 when the built `/` has an `<h1>` and no `doc-surface` meta, or any meta has a value other than `pitch` or `home`, or a page has two. Measured exits: grimoire.rs unpatched 1, patched 0; ocx website `dist` 1 (it declares nothing today). The "`.astro` placement is untested" caveat is replaced by sections 1-4.
- **MKT-PAGE-11: change (scope).** Scope text: "`home` pages are those declared `doc_surface: home` by the source comment (markdown or MDX) or the built meta." Verification, runs today: built side `for p in $(python3 -I surface_scan.py list home dist); do grep -c 'class="[^"]*hero' $p; done` must print only `0`; source side `grep -c -E '^hero:|template: *splash|<(Hero|Landing)\b|class="[^"]*hero' <home source>` must print 0. Measured: `zz-home.html` and its source print 0, `zz-herohome.html` prints 1 and its source prints 1 (the failing case); `zz-drift.html` (built home) prints 0. Severity SHOULD unchanged. The tagline-stack part stays blocked on CR-1.
- **NEW MKT-PAGE-12 (SHOULD):** "Make the built `<meta name=\"doc-surface\">` and the source declaration of the same route name the same value; do not edit one without the other." Rationale: two declarations drift (section 5, `zz-drift`). Verification: `python3 -I surface_scan.py pair <built html of the route> <source file of the route>` exits 0 when equal or when the source has no declaration, 1 on mismatch. Measured: `zz-pitch` 0, `zz-home` 0, `zz-herohome` 0, `zz-drift` 1 (`built=['home'] source=pitch`). Applies to markdown and MDX sources only; an `.astro` page has no source declaration to compare.
- **CR-3: change.** Request: (a) add `doc_surface` to `DECL_RE` in `doc_declaration.py` and `DECL` in `strip_prose.py` together; (b) add a built-HTML reader for `<meta name="doc-surface">` over a `dist/` directory, since `.astro` sources are never visited (reference implementation: `built` and `list` modes of `surface_scan.py`, section 5); (c) keep the `//` opener but document it as valid only outside any `---` fence; (d) make `strip_prose.declaration` skip a leading front matter block like `doc_declaration.split_front_matter` (the ocx website pitch has its declaration on line 14 and `strip_prose` reads `{}`, section 0). Verification: (1) behavioural: `python3 -I $S/tools/m1.py $C <ocx website index.mdx>` must print the same `doc_type` value from both readers (today `landing` versus `{}`: fails); (2) `python3 -I $C/doc_declaration.py --root . $S/pages/a.astro` must exit 1 with the DOC-TYPE-01 message, documenting the fence rule (today true); (3) after the change, `python3 -I <built reader> $S/grimdocs/dist` must print the `pitch=`/`home=` summary of section 5.
- **CR-4: confirm.** The built route is the same path the meta check reads, so one reader serves both. Verification: `surface_scan.py built dist` and the DOC-TYPE-10..12 checks take the same `dist` directory.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| HTML comments in Astro templates reach the DOM; JS comments are skipped | https://docs.astro.build/en/basics/astro-syntax/ | page undated; source file last commit 2024-12-03 (GitHub API); fetched 2026-11-27 |
| Starlight `head` frontmatter field adds tags to one page's head | https://starlight.astro.build/reference/frontmatter/ | "Last updated: May 7, 2026" (source file commit 2026-05-07); fetched 2026-11-27 |
| `doc_declaration.py` skips a leading `---` block and walks no `.astro`; `strip_prose.py` has no `//` opener and no front-matter skip | files in this worktree, HEAD `9dbe49c` | measured 2026-11-27 |
| Template comment and meta survive the build on Astro 5.16.0 (both `compressHTML` settings) and 7.4.13 | scratch builds, `$S/site`, `$S/grimdocs` | measured 2026-11-27 |
| The added `head` meta entry renders in a real Starlight 0.43.1 / Astro 7.4.13 build of the grimoire.rs docs | `$S/grimdocs/dist/index.html` | measured 2026-11-27 |
| grimoire.rs builds with Astro 7.4.13 and Starlight 0.43.1 | `grimoire-rs/grimoire/docs/package.json` and `dist/index.html` generator tags (repo HEAD `72d3fce1`, 2026-11-24) | read 2026-11-27 |

## What could not be determined

- A Starlight build of the ocx website pitch (`ocx-sh/website/site`) with `doc_surface` in its `index.mdx` was not run; the same mechanism was measured on grimoire.rs and on scratch `.mdx` pages of grimoire.rs's project, which has the same Starlight major line (0.42 versus 0.43). Missing: nothing but time; the mdx `head:` field is already used in that file.
- Whether a minifier or CDN step in the fleet's deploy pipeline strips HTML comments: not measured. The meta tag does not depend on the answer.
- The Starlight docs page documents `head` with a `title` example only; the `meta` case rests on the builds above.
- `surface_scan.py` was run on Linux with Python 3 and `-I`; no Windows run.
