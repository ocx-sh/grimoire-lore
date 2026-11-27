---
title: README lines above the fold on GitHub, crates.io and npm
program: product
topic: marketing-first-screen-copy
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 12
---

# README lines above the fold on GitHub, crates.io and npm

Question: how many rendered README lines does GitHub show above the fold on desktop and on mobile, and do crates.io and npm render the same opening?

Repair note: the first version of this file said no browser could run. That was wrong. The Playwright headless shell runs once the missing shared libraries are unpacked, without root, into a scratch directory. This version measures.

## Answer

**Answered for GitHub and crates.io. Not answered for npmjs.com (Cloudflare challenge, not bypassed).**

1. **GitHub shows zero README lines above the fold on both desktop (1440x900) and mobile (390x844), on 4 of 4 repositories measured.** The README starts 993 to 2182 px below the top of the page on desktop and 1266 to 1348 px on mobile. What fills the first viewport is the repository name, the About description, topics, the file list and the sidebar. At 1920x1080, serde shows 2 README lines and ripgrep shows 0. This is one unauthenticated headless run per case, so the numbers are indicative. The sign of the result (the README is below the fold) is robust, because the file list alone is longer than the viewport. Measurement in section "Measurements".
2. **crates.io shows the README opening above the fold, under the manifest `description`.** On ripgrep at 1440x900 the README heading sits 359 px from the top and about 16 text lines are fully inside the fold (13 at 390x844). The manifest `description` sits in the header card above it, plain text, with keywords. So GitHub and crates.io do not show the same opening: crates.io leads with the manifest description and then the README, while GitHub leads with the About text and the file list and then the README.
3. **npm: markup not inspected on the website.** npmjs.com answered `curl` with HTTP 403 and a Cloudflare challenge, and a headless browser load timed out at 45 s. I did not try to bypass the challenge. The README text npm renders is available through the CLI (`npm view <pkg> readme`), which returns the packaged Markdown source. What npm's page shows above the fold stays unmeasured.
4. **No platform documents a fold, a line count or a viewport rule for READMEs.** GitHub's README page states a size limit only: "When your README is viewed on GitHub, any content beyond 500 KiB will be truncated." ([GitHub Docs, About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes); the page shows no date, and the source file `content/repositories/.../about-readmes.md` in github/docs was last committed 2026-09-03, [GitHub API commit listing](https://api.github.com/repos/github/docs/commits?path=content/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes.md&per_page=1), fetched 2026-11-27). The page says nothing about lines or the visible portion. The npm page ([npm Docs, About package README files](https://docs.npmjs.com/about-package-readme-files), last edited 4 November 2025 per the page footer as read by the fetch tool, fetched 2026-11-27) was fetched and read in full for length, line count, truncation and above-the-fold: it mentions none of them. The Cargo page ([Cargo reference, manifest](https://doc.rust-lang.org/cargo/reference/manifest.html), no page date; its source file was last committed 2026-07-17 as a directory move, [GitHub API](https://api.github.com/repos/rust-lang/cargo/commits?path=src/doc/src/reference/manifest.md&per_page=1), fetched 2026-11-27) mentions none of them either.
5. **GitHub's README location order and Outline.** GitHub says the README shown is "chosen from locations in the following order": `.github`, the root directory, then `docs`, and "GitHub will automatically generate a table of contents based on section headings" ([GitHub Docs, About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes), no page date, fetched 2026-11-27). A repository with a `.github/README.md` therefore shows that file, not the root README. MKT-PAGE-01's "repository-root README" is the right scope only when no `.github/README.md` exists.
6. **Both registries show a frozen copy.** npm: "The `README.md` file will only be updated on the package page when you publish a new version of your package." ([npm Docs, About package README files](https://docs.npmjs.com/about-package-readme-files), last edited 2025-11-04, fetched 2026-11-27). crates.io: the `readme` field is "the path to a file in the package root ... This file will be transferred to the registry when you publish. crates.io will interpret it as Markdown and render it on the crate's page" ([Cargo reference, manifest](https://doc.rust-lang.org/cargo/reference/manifest.html), fetched 2026-11-27). A README edit on `main` does not change either registry page until the next publish. The `readme` field may also be `false` or name another file, and `description` "should be plain text (not Markdown)" and crates.io "will display this with your package" (same Cargo page).

## Measurements

All commands run on 2026-11-27 in `~/.cache/research-lang/exemplars/product/wave2/q2/repair/` (a throwaway directory). Kernel line: `Linux ocx.sh 6.8.0-149-generic ... x86_64` (native Linux, not WSL).

### Why the browser failed first, and how it was made to run

```
$ ~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome --version
/home/mherwig/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome: error while loading shared libraries: libnspr4.so: cannot open shared object file: No such file or directory
$ ldd ~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome | grep 'not found'
	libnspr4.so => not found
	libnss3.so => not found
	libnssutil3.so => not found
	libsmime3.so => not found
	libatk-1.0.so.0 => not found
	libatk-bridge-2.0.so.0 => not found
	libcups.so.2 => not found
	libxcb.so.1 => not found
	libasound.so.2 => not found
	libgbm.so.1 => not found
	libX11.so.6 => not found
	libXext.so.6 => not found
	libcairo.so.2 => not found
	libpango-1.0.so.0 => not found
	libXcomposite.so.1 => not found
	libXdamage.so.1 => not found
	libXfixes.so.3 => not found
	libXrandr.so.2 => not found
	libatspi.so.0 => not found
$ ls -d /mnt/c/Program\ Files*
(eval):4: no matches found: /mnt/c/Program Files*
$ ls /mnt
$ which google-chrome chromium chromium-browser microsoft-edge firefox
google-chrome not found
chromium not found
chromium-browser not found
microsoft-edge not found
firefox not found
```

This machine has no `/mnt/c` (it is not a WSL host), so there is no Windows browser either. Then, without root, the libraries were downloaded and unpacked into the scratch directory:

```
$ apt-get download libnspr4 libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 libxcb1 libasound2t64 libatspi2.0-0t64
Fetched 2,970 kB in 0s (8,266 kB/s)
$ for d in debs/*.deb; do dpkg -x $d root; done
$ LD_LIBRARY_PATH=$PWD/root/usr/lib/x86_64-linux-gnu ldd ~/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell | grep 'not found'
$ LD_LIBRARY_PATH=$PWD/root/usr/lib/x86_64-linux-gnu .../chrome-headless-shell --version
Google Chrome for Testing 159.0.8154.6
```

Nothing is installed system-wide. Caveat: no system fonts are installed, so glyphs render as boxes in the screenshots. Vertical layout depends on line height and row count, not on glyph shapes, but text wrapping inside the README can differ from a real desktop, so a README's line count is the least reliable number here. The README's start position is the reliable one.

### GitHub, unauthenticated, `m3.mjs` (Playwright, `waitUntil: load`, 4 s settle, scrollY 0)

Counting rule: a text line counts when its client rectangle lies fully inside the viewport height (rectangles from `Range.getClientRects()` over all text nodes of `article.markdown-body`, deduplicated by `round(top/6)`).

```
$ LD_LIBRARY_PATH=$PWD/root/usr/lib/x86_64-linux-gnu node m3.mjs
github desktop https://github.com/astral-sh/uv {"scrollY":0,"readmeTopDocY":2182,"firstTextTopDocY":2186,"textLinesFullyInFold":0,"docH":8540}
github mobile https://github.com/astral-sh/uv {"scrollY":0,"readmeTopDocY":1348,"firstTextTopDocY":1352,"textLinesFullyInFold":0,"docH":9742}
github desktop https://github.com/BurntSushi/ripgrep {"scrollY":0,"readmeTopDocY":1608,"firstTextTopDocY":1611,"textLinesFullyInFold":0,"docH":11548}
github mobile https://github.com/BurntSushi/ripgrep {"scrollY":0,"readmeTopDocY":1324,"firstTextTopDocY":1327,"textLinesFullyInFold":0,"docH":18025}
github desktop https://github.com/serde-rs/serde {"scrollY":0,"readmeTopDocY":993,"firstTextTopDocY":997,"textLinesFullyInFold":0,"docH":2586}
github mobile https://github.com/serde-rs/serde {"scrollY":0,"readmeTopDocY":1266,"firstTextTopDocY":1270,"textLinesFullyInFold":0,"docH":4110}
github desktop https://github.com/evanw/esbuild {"scrollY":0,"readmeTopDocY":1690,"firstTextTopDocY":1950,"textLinesFullyInFold":0,"docH":2804}
github mobile https://github.com/evanw/esbuild {"scrollY":0,"readmeTopDocY":1301,"firstTextTopDocY":1437,"textLinesFullyInFold":0,"docH":3011}
```

Desktop viewport 1440x900, mobile 390x844 with `isMobile: true`. The screenshots `shot_github_desktop_serde.png` and `shot_github_mobile_ripgrep.png` were read: the first viewport holds the header, repository name, branch bar, file list and the About sidebar (desktop), or the About block, topics and the start of the file list (mobile). The 1080 px check, `m4.mjs`:

```
github-1080 desktop1080 https://github.com/serde-rs/serde {"firstReadmeElementTopDocY":993,"textLinesFullyInFold":2,"viewportH":1080,"rootClass":"markdown-body entry-content container-lg"}
github-1080 desktop1080 https://github.com/BurntSushi/ripgrep {"firstReadmeElementTopDocY":1608,"textLinesFullyInFold":0,"viewportH":1080,"rootClass":"markdown-body entry-content container-lg"}
```

### crates.io, same harness (`m4.mjs`)

```
crates desktop https://crates.io/crates/ripgrep {"firstReadmeElementTopDocY":359,"textLinesFullyInFold":16,"viewportH":900,"rootClass":"wrapper svelte-7jwjy8"}
crates mobile https://crates.io/crates/ripgrep {"firstReadmeElementTopDocY":402,"textLinesFullyInFold":13,"viewportH":844,"rootClass":"wrapper svelte-7jwjy8"}
```

The desktop screenshot `shot2_crates_desktop_ripgrep.png` was read: header card with "ripgrep v16.0.0" and the manifest description, keyword chips, tabs (Readme, Code, Versions ...), then the README heading "ripgrep (rg)" and about 16 text lines of the README, with Metadata and Install in the sidebar. The same script run on `crates.io/crates/serde` matched a wrong element (`rootClass` empty, 1 line) and is discarded; only ripgrep is reported for crates.io. One crate is a thin sample.

### Fetched markup, fixed

The earlier curl block left `$UA` undefined and elided output. Now with `UA` defined, the crate version resolved from the API, and the full head output:

```
$ UA='Mozilla/5.0 (X11; Linux x86_64) research-lang-followup'
$ curl -s -A "$UA" https://crates.io/api/v1/crates/ripgrep | python3 -I -c 'import json,sys;d=json.load(sys.stdin)["crate"];print({k:d[k] for k in("max_stable_version","max_version","newest_version","updated_at")})'
{'max_stable_version': '16.0.0', 'max_version': '16.0.0', 'newest_version': '16.0.0', 'updated_at': '2026-11-22T23:02:08.647074Z'}
$ curl -sL -A "$UA" -o cr.html -w "%{http_code} %{content_type} %{size_download}\n" https://crates.io/api/v1/crates/ripgrep/16.0.0/readme
200 text/html 32220
$ head -c 400 cr.html
<h2 id="user-content-ripgrep-rg">ripgrep (rg)<a href="#user-content-ripgrep-rg" aria-label="Link to heading 'ripgrep (rg)'" rel="nofollow noopener noreferrer"></a></h2>
<p>ripgrep is a line-oriented search tool that recursively searches the current
directory for a regex pattern. By default, ripgrep will respect gitignore rules
and automatically skip hidden files/directories and binary files. (To d
$ curl -sL -A "$UA" -o gh.html -w "gh %{http_code} %{size_download}\n" https://github.com/BurntSushi/ripgrep
gh 200 374585
$ grep -o '<article class="markdown-body[^>]*>' gh.html
<article class="markdown-body entry-content container-lg" itemprop="text">
$ curl -sL -A "$UA" -o npm.html -w "npm %{http_code} %{size_download}\n" https://www.npmjs.com/package/express
npm 403 5587
$ grep -o '<title>[^<]*</title>' npm.html
<title>Just a moment...</title>
```

16.0.0 is the crate's `max_stable_version`, `max_version` and `newest_version` on 2026-11-27 (updated 2026-11-22), so it is the current version. The crates.io fragment starts at the README's first element with no wrapper, and uses the `user-content-` heading-anchor prefix that GitHub also uses. The `/api/v1/crates/<name>/<version>/readme` route is vendor behaviour, not a documented contract. npm's own browser-facing page is not reachable by automated clients.

### MKT-PAGE-12 verification, now run

```
$ HOME=$PWD/h npm view express version
5.3.0
$ HOME=$PWD/h npm view express readme > npm_express.md; readme_window npm_express.md
npm_express.md:1:<a href="https://expressjs.com/">
npm_express.md:6:</a>
npm_express.md:8:**Fast, unopinionated, minimalist web framework for [Node.js](https://nodejs.org).**
$ readme_window npm_express.md | grep -i -c -F "web framework"
1
$ HOME=$PWD/h npm view esbuild version
0.28.2
$ HOME=$PWD/h npm view esbuild readme > npm_esbuild.md; readme_window npm_esbuild.md
npm_esbuild.md:1:# esbuild
npm_esbuild.md:3:This is a JavaScript bundler and minifier. See https://github.com/evanw/esbuild and the [JavaScript API documentation](https://esbuild.github.io/api/) for details.
$ readme_window npm_esbuild.md | grep -i -c -P "<MKT-PAGE-06 pattern, STAGE list, NAME=esbuild>"
0
$ curl -sL -A "$UA" https://crates.io/api/v1/crates/ripgrep/16.0.0/readme | head -c 2000 | grep -i -c -F "line-oriented search tool"
1
```

`readme_window` is the function defined in marketing-first-screen-copy.md, run unchanged (it keeps `<a ...>` and `</a>` lines, which is why express lines 1 and 6 show). The MKT-PAGE-06 pattern is the one in that file's "MKT-PAGE-06 and -07: pattern and vocabulary" section. Results: the npm check runs and returns data. express (major 5) correctly needs no stage line, and its npm opening carries the noun "web framework". esbuild (0.28.2, major 0) has no stage sentence in its npm README opening, so the check reports a miss, which shows it can fail. The npm path was run with a temporary `HOME` (`$PWD/h`) so no npm config on this machine was read or changed. The `curl` path for crates.io was run on ripgrep, noun "line-oriented search tool", with the version taken from the API above.

## Effect on the ruleset

| Rule | Effect | Text |
|---|---|---|
| First screen definition, README row | **change** | Replace the last sentence of the README row ("This is a proxy taken from both dives, not a rendered measurement") with: "This is a source-line proxy, not a platform fold. On github.com the README starts below the first desktop (1440x900) and mobile (390x844) viewport on the 4 repositories measured on 2026-11-27, and the above-the-fold text is the repository name, About description and topics; on crates.io the manifest `description` sits above the README. A logo or badge block can use up the real fold. When `.github/README.md` exists, GitHub shows it instead of the root README, and the window reads that file." **Verification:** the label is checkable with `grep -n -F 'source-line proxy' <rule file>` (must print one line) and `grep -n -F '.github/README.md' <rule file>` (one line). The facts behind it are reproducible: `node m3.mjs` as in "Measurements" prints `readmeTopDocY` larger than the viewport height (900 or 844) for each repository while the claim holds, and `test -f .github/README.md && echo "window reads .github/README.md"` picks the file for the check. |
| MKT-PAGE-01 (README scope) | **change** | Add after "repository-root README": "(`.github/README.md` when it exists, because GitHub shows that file first)". **Verification:** `test -f .github/README.md \|\| test -f README.md` picks the file; `gh api repos/<o>/<r>/contents/.github/README.md --silent && echo present` shows whether the `.github` copy exists. |
| MKT-PAGE-03, -06, -09, -10 (README arms) | **confirm** | The window they read is the Markdown the registries render, and on crates.io the opening is above the fold. No text change. On GitHub the first README line is below the fold, so the GitHub About description is the above-the-fold text. MKT-POS-08 already requires the About to start with the recorded sentence ([marketing-positioning-record.md](../marketing-positioning-record.md), MKT-POS-08); that check gains weight and needs no new MKT-PAGE rule. |
| MKT-PAGE-12 (NEW) | **new**, SHOULD | **Rule:** When a repository publishes a package whose manifest points at a README (`readme` in `Cargo.toml`, the README in the npm tarball), make the published README opening carry the same category noun and the same maturity line as the repository README, and re-publish when either changes. **Rationale:** crates.io and npm render the packaged file and update it only on publish, so a README fix on `main` does not reach those pages until the next release ([npm Docs](https://docs.npmjs.com/about-package-readme-files), last edited 2025-11-04; [Cargo reference](https://doc.rust-lang.org/cargo/reference/manifest.html), fetched 2026-11-27). On crates.io the opening is above the fold, so a stale opening is what a visitor sees first. **Verification (both run on 2026-11-27, see "MKT-PAGE-12 verification, now run"):** npm: `npm view <pkg> readme > r.md; readme_window r.md \| grep -i -c -F "$N"` must print at least 1, and the MKT-PAGE-06 pattern must match when the version has major 0. crates.io: `V=$(curl -s https://crates.io/api/v1/crates/<crate> \| python3 -I -c 'import json,sys;print(json.load(sys.stdin)["crate"]["max_stable_version"])'); curl -sL https://crates.io/api/v1/crates/<crate>/$V/readme \| head -c 2000 \| grep -i -c -F "$N"` must print at least 1. When `Cargo.toml` sets `readme = false` or names another file, check that file. |

## Dated facts

| Fact | Source | Date |
|---|---|---|
| GitHub truncates README content beyond 500 KiB; README location order `.github`, root, `docs`; Outline from headings; no statement on visible lines | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes | no page date; source file last committed 2026-09-03; fetched 2026-11-27 |
| npm renders README as GFM via GitHub's API; page updates only on publish; no statement on length or fold | https://docs.npmjs.com/about-package-readme-files | last edited 2025-11-04 (fetch-tool reading of the page footer; the footer date is rendered by script and `curl` shows only "Last edited by"); fetched 2026-11-27 |
| crates.io renders the file named by `readme` as Markdown; `description` is plain text and displayed with the package; no statement on length or fold | https://doc.rust-lang.org/cargo/reference/manifest.html | no page date; source file last committed 2026-07-17 (a move); fetched 2026-11-27 |
| github.com repository page: README starts below the first viewport on 4 of 4 repos, desktop and mobile | Playwright measurement above (vendor behaviour, one unauthenticated run, no fonts) | 2026-11-27 |
| crates.io crate page: manifest description above the README; README opening above the fold | Playwright measurement above and screenshot (vendor behaviour, 1 crate) | 2026-11-27 |
| crates.io README is served as an HTML fragment at `/api/v1/crates/<name>/<version>/readme`; ripgrep current version 16.0.0 | `curl` output above (vendor behaviour, not a documented contract) | 2026-11-27 |
| npmjs.com returns HTTP 403 with a Cloudflare challenge to an unauthenticated `curl`; headless load times out | `curl` output above | 2026-11-27 |

## What could not be determined

- **What npmjs.com shows above the fold.** The site challenges automated clients (403, then a 45 s load timeout in the headless browser). Reading the page needs a challenge-passing browser session, which this study did not try to create or bypass. `npm view <pkg> readme` gives the Markdown source only.
- **A line count that holds for real users.** The measurement used one unauthenticated headless shell, no installed fonts, and three viewports (1440x900, 390x844, 1920x1080). A signed-in GitHub layout, a different browser zoom or a different window height changes the numbers. The agreed reference viewports are my choice, not the owner's; the owner can set others by editing the `vps` array in `m3.mjs`.
- **crates.io beyond one crate.** Only ripgrep was measured successfully on crates.io. The element selector failed on serde.
- **Whether the GitHub mobile app (as opposed to the mobile website) collapses the README.** Not documented, not measured.
