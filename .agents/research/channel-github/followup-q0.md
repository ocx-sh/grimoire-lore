---
title: How npmjs.com renders relative README links and images (follow-up q0)
program: product
topic: channel-github
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 5
---

# How npmjs.com renders relative README links and images

## Question

How does npmjs.com render relative README links and images today, measured with a real browser, so that CH-GH-18 npm links can be graded?

## Answer

Not measured. On 2026-11-27 npmjs.com answered every automated client, including a real headless Chromium, with a Cloudflare challenge ("Just a moment...", response header `cf-mitigated: challenge`) that never resolved. The rendered page is therefore unobserved, and CH-GH-18 keeps npm links at SHOULD. What can be measured instead is the input to the renderer: the README that the npm registry stores and serves. That is checkable by an agent without a browser, and it is the verification this follow-up adds to CH-GH-18. Evidence on the renderer itself is a vendor source file (archived) and one community comment, both labelled below. Neither is a measurement.

## Measurements

Scratch directory: `~/.cache/research-lang/exemplars/product/wave2/channel-github-q0/`. No account, login or credential was used and nothing was posted. All commands below are in `run.sh` in that directory. It was rerun end to end on 2026-11-27, and the output below is from that run.

### 1. Plain clients

```
$ curl -s -o /dev/null -w '%{http_code}\n' https://www.npmjs.com/package/typescript
403
$ curl -s -o /dev/null -w '%{http_code}\n' -H 'x-spiferack: 1' https://www.npmjs.com/package/@grimoire-rs/indexer
403
$ curl -sI https://www.npmjs.com/package/typescript | grep -i -E '^(HTTP|cf-mitigated|server)'
HTTP/2 403
cf-mitigated: challenge
server: cloudflare
```

The `x-spiferack: 1` request is the wave-1 attempt to get npm's JSON page data (recorded in `channel-github.md`, Open questions, 2026-11-27, which is the artifact's own record and has no external URL). It fails the same way. The `cf-mitigated: challenge` header names the cause.

### 2. Real browser

Playwright's cached headless Chromium (`chromium_headless_shell-1255`) did not start at first because 15 shared libraries were missing:

```
$ B=~/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell
$ ldd $B | grep -c 'not found'
15
$ ldd $B | grep 'not found' | head -3
	libnspr4.so => not found
	libnss3.so => not found
	libnssutil3.so => not found
```

The libraries were fetched as Ubuntu 24.04 packages and unpacked into the scratch directory, with no system install. The `.deb` files are kept in `debs/` (23 packages: libnspr4, libnss3, libatk1.0-0t64, libatk-bridge2.0-0t64, libatspi2.0-0t64, libdrm2, libgbm1, libx11-6, libxcb1, libxcb-randr0, libxcomposite1, libxdamage1, libxext6, libxfixes3, libxi6, libxrandr2, libxrender1, libxshmfence1, libxau6, libxdmcp6, libexpat1, libwayland-server0, libasound2t64):

```
$ cd debs && apt-get download libnspr4 libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 libdrm2 libgbm1 \
    libx11-6 libxcb1 libxcb-randr0 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
    libxshmfence1 libxau6 libxdmcp6 libexpat1 libwayland-server0 libasound2t64
$ for f in debs/*.deb; do dpkg -x "$f" root; done
$ LD_LIBRARY_PATH=$PWD/root/usr/lib/x86_64-linux-gnu ldd $B | grep -c 'not found'
0
```

The browser script is `t.js`, run with `npm i playwright-core@1.55` and `LD_LIBRARY_PATH=$PWD/root/usr/lib/x86_64-linux-gnu node t.js`:

```js
const {chromium}=require('playwright-core');
(async()=>{
const b=await chromium.launch({executablePath:process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const p=await b.newPage();
const r=await p.goto('https://www.npmjs.com/package/commander',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(20000);
console.log('status', r.status(), 'title', await p.title());
console.log('html_chars', (await p.content()).length, 'cf_challenge_in_html', /challenge-platform|cf-chl/.test(await p.content()));
await b.close();})();
```

Output after a 20 second wait:

```
status 403 title Just a moment...
html_chars 44867 cf_challenge_in_html true
```

`html_chars` is the length of the page's HTML after 20 seconds (44,867 characters, the Cloudflare interstitial, not a package page), and `cf_challenge_in_html true` confirms the challenge script is in it. An earlier run in this session with a 4 second wait gave the same status and title. Passing the challenge would need tooling that hides the automation. That is circumvention of a bot check and outside this commission's limits, so it was not attempted.

### 3. What the registry stores (measurable without a browser)

The registry JSON carries the README text that npmjs.com renders. `relcheck.py` (same directory) counts link and image targets that are not absolute (`http(s):`, `mailto:`, `#`, `/`, `data:`):

```
$ python3 -I relcheck.py @grimoire-rs/indexer
targets 11 relative 9
  ./docs/index.md
  ./docs/how-to/quickstart.md
  ./docs/reference/cli.md
  ./docs/explanation/index-vs-site.md
  ./docs/how-to/customize-branding.md
  ./docs/how-to/add-pages.md
  ./docs/reference/theme-overlay.md
  ./docs/ops/known-limitations.md
  ./CHANGELOG.md
$ python3 -I relcheck.py commander | head -1
targets 97 relative 42
$ curl -s https://registry.npmjs.org/@grimoire-rs%2findexer | python3 -I -c 'import sys,json;d=json.load(sys.stdin);print(d["dist-tags"]["latest"],d["time"]["0.8.0"])'
0.8.0 2026-11-24T18:53:49.611Z
```

This confirms the wave-1 figure of 9 relative links in `@grimoire-rs/indexer` 0.8.0 (published 2026-11-24, source [registry.npmjs.org/@grimoire-rs%2findexer](https://registry.npmjs.org/@grimoire-rs%2findexer), fetched 2026-11-27). It also shows that a widely used package, `commander`, ships 42 relative targets, so relative links are common practice. The count says nothing about how npmjs.com displays them.

## Evidence on the renderer

| Source | Date | What it says | Weight |
|---|---|---|---|
| [npm/marky-markdown on GitHub](https://github.com/npm/marky-markdown), fetched 2026-11-27 | Banner: "This repository was archived by the owner on Apr 3, 2024. It is now read-only." Last commit date not shown on the page. | Features: "Converts relative GitHub links to their absolute equivalents." and "Converts relative GitHub images sources to their GitHub raw equivalents." Description: "marky-markdown is the thing that parses package READMEs on http://www.npmjs.com". | npm's own source and README, a vendor claim. Archived, and the page does not say whether npmjs.com still runs it. Not a measurement of today's site. |
| [npm Docs, About package README files](https://docs.npmjs.com/about-package-readme-files), fetched 2026-11-27 | Page footer: "Last edited by mkantor on November 4, 2025" | Says the README "will be rendered on the package's page" and is rendered as GitHub Flavored Markdown through GitHub's API. Says nothing about relative links or images. | Vendor documentation. Confirms the gap is documentary. |
| [pastelsky/tsdocs issue 9, "Relative links in readme can be broken"](https://github.com/pastelsky/tsdocs/issues/9), fetched 2026-11-27 | Issue opened 2023-12-19, still open; comment by WorldMaker dated 2024-01-01 | "If it helps, what npm's site seems to do is rewrite relative links to repository (GitHub) links." The commenter says they do not know npm's algorithm. | One community comment, observed behaviour from late 2023. Anecdote, not a measurement. |

All three point the same way (npm tends to rewrite relative links to GitHub URLs), none is a measurement of 2026-11-27, and none says where the rewritten link points (default branch or release tag).

## Effect on the ruleset

| Rule | Effect | Text |
|---|---|---|
| CH-GH-18 (npm link clause) | confirm, rationale clause added, verification added | Severity unchanged: images MUST, PyPI links MUST, npm / crates.io / Marketplace links SHOULD. Add to the rationale: "npm's archived renderer source (npm/marky-markdown, archived 2024-04-03) and one community comment from 2024-01-01 say npm rewrites relative links to GitHub URLs. Rendering is unmeasured because npmjs.com blocks automated clients with a Cloudflare challenge, so absolute URLs remain the only form that does not depend on the rewrite." |
| CH-GH-18 (npm verification) | new verification | Run `python3 -I relcheck.py <package-name>` against the registry copy after release, or `python3 -I relcheck.py README.md` on the file before release. Output is `targets N relative M` plus the relative targets. Pass: `relative 0`. Fail: any listed target. Tested on 2026-11-27: `@grimoire-rs/indexer` prints `relative 9` (fail), and a three-link scratch file with one `./x.md` link prints `targets 3 relative 1`. Ship `relcheck.py` as the skill's script. |
| CH-GH-18 (npm image MUST) | confirm | Absolute `https` image URLs remove any dependency on a rewrite, on the repository being public, and on the path existing on the default branch. No evidence here argues for relaxing it. The same `relcheck.py` run covers images, because it matches `![...](...)` as well. |

No new rule and no promotion. Promoting npm links to MUST needs a rendered page.

## Dated facts

- 2026-11-27: `curl` to `https://www.npmjs.com/package/typescript` returned 403 with `cf-mitigated: challenge`; the same with `x-spiferack: 1` on `@grimoire-rs/indexer`.
- 2026-11-27: headless Chromium (build 1255) on `https://www.npmjs.com/package/commander` returned status 403, title "Just a moment...", 44,867 characters of challenge HTML after 20 seconds.
- 2026-11-27: the registry README of `@grimoire-rs/indexer` 0.8.0 (published 2026-11-24) has 9 relative targets of 11; `commander` has 42 of 97.
- 2024-04-03: `npm/marky-markdown` archived by its owner ([GitHub page](https://github.com/npm/marky-markdown), fetched 2026-11-27).
- 2024-01-01: WorldMaker's comment in [pastelsky/tsdocs issue 9](https://github.com/pastelsky/tsdocs/issues/9) on npm rewriting relative links.
- 2025-11-04: last edit of the npm docs page [About package README files](https://docs.npmjs.com/about-package-readme-files).

## What could not be determined

- How npmjs.com renders a relative link or image today. Missing: a browser session that the Cloudflare check accepts, meaning a human-operated desktop browser. Headless automation is rejected.
- Whether npmjs.com still uses marky-markdown or a successor.
- The target of a rewritten link (`blob/HEAD`, `blob/<tag>` or `blob/master`), which decides whether it tracks the release or the default branch.

To close it, the owner can open `https://www.npmjs.com/package/@grimoire-rs/indexer` in a normal browser and paste the `href` of the "docs/index.md" link and the `src` of one image from the developer tools. Two values grade CH-GH-18 for npm.
