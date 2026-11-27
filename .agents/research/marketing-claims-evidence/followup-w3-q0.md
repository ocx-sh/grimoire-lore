---
title: Held-out precision and recall of the 15-line MKT-CLAIM-02 set
program: product
topic: marketing-claims-evidence
worker: followup-w3-q0
wave: 3
date_researched: 2026-11-27
model: sonnet
sources_fetched: 19
---

# Held-out precision and recall of the 15-line MKT-CLAIM-02 set

Question (from `product-resume/wave3/marketing-claims-evidence/q0.md`): what precision and recall does the 15-line MKT-CLAIM-02 set, exactly as the consolidation now states it, reach on a held-out set of at least 15 software product home pages that neither wave was written from?

## Answer

Answered. On 19 home pages that appear nowhere in wave 1 or wave 2, the 15-line set hit 287 lines. 167 of them are real claim lines (58.2 % precision, strict label). It missed 164 real claim lines, so recall is 167 of 331 (50.5 %). The in-sample figures of the consolidation (89.6 % for lines 1 to 10, 90.7 % for lines 11 to 15, 74.9 % recall) do not carry over to new pages as a whole. One part does carry over. The five wave-2 arms (lines 11 to 15) catch 33 hit lines that lines 1 to 10 miss, and 27 of those 33 are real (81.8 %). The precision loss comes from three arms: line 5 (outcome words, `secure` above all), line 9 (AI words) and line 15 (`agentic`). Without lines 5, 9 and 15 the set has 176 hits at 74.4 % strict precision. The one-reader precision is a range, not 58.2 % alone: 58.2 % (frozen labels), 61.7 % after ten false hits that I would now label real, 66.6 % with borderline calls (see "Label mistakes found afterwards"). Every measurement behind a figure in this file is printed with its command and output under "Repair measurements" (tests R1 to R9).

One reader labelled every line, before the set ran. No second rater was available, and none was simulated. Three label readings are reported, because the borderline and testimonial calls move the number by 8 to 16 points (table "Whole set").

| Reading | Counted as a real claim | Hits | Real | Precision | Real claim lines | Recall |
|---|---|---|---|---|---|---|
| Strict | the 331 lines labelled with a flag-free claim class | 287 | 167 | 58.2 % | 331 | 50.5 % |
| Strict plus borderline | strict plus 57 lines marked `B` | 287 | 191 | 66.6 % | 388 | 49.2 % |
| Everything labelled | the above plus 116 quoted testimonial lines | 287 | 214 | 74.6 % | 504 | 42.5 % |

Recall is an upper bound in the same sense as in followup-q0: the denominator is what one reader found by reading 2,788 lines, and a line the reader overlooked is in neither the numerator nor the denominator.

## Method

**Excluded hosts, listed before choosing pages.** I extracted every `https?://` host from `marketing-claims-evidence.md`, all nine files in `marketing-claims-evidence/`, and `product-audit/exemplar-landing-pages.md`:

```
cat marketing-claims-evidence.md marketing-claims-evidence/*.md product-audit/exemplar-landing-pages.md | grep -o -E 'https?://[A-Za-z0-9.-]+' | sed -E 's#https?://##;s#^www\.##' | sort -u
```

The output is: 1password.com, aicpa-cima.com, api.github.com, archive.ubuntu.com, asa.org.uk, astral.sh, astro.build, biomejs.dev, bun.sh, cal.com, caselaw.findlaw.com, clickhouse.com, clutch.co, deno.com, doc.rust-lang.org, docs.astral.sh, docs.npmjs.com, dri.es, ecfr.gov, elastic.co, endoflife.date, eur-lex.europa.eu, example.test, fair.io, federalregister.gov, fly.io, ftc.gov, github.blog, github.com, gov.uk, grimoire.rs, hashicorp.com, hn.algolia.com, infoworld.com, iso.org, keygen.sh, law.cornell.edu, legal.g2.com, legislation.gov.uk, lewissilkin.com, linear.app, mdxjs.com, mintz.com, mise.jdx.dev, neon.com, news.ycombinator.com, nextjs.org, nngroup.com, ocx.sh, openai.com, opensource.org, opentofu.org, packages.debian.org, parkerpoe.com, percona.com, plausible.io, posthog.com, publications.europa.eu, publications.europa.eu, raw.githubusercontent.com, redis.io, rfc-editor.org, sentry.io, spdx.github.io, spdx.org, spec.org, stripe.com, supabase.com, survey.stackoverflow.co, svelte.dev, tailscale.com, tailwindcss.com, tauri.app, theregister.com, turso.tech, twitter.com, vanta.com, vercel.com, vite.dev, w3.org, webarchive.library.unt.edu, web.archive.org, webgate.ec.europa.eu, zed.dev. The 26 wave-1 and wave-2 exemplar home pages are the hosts of that list that are product sites (posthog, supabase, astro, tailwind, bun, deno, uv and ruff on docs.astral.sh, astral.sh, mise, zed, tauri, biome, vite, turso, cal, plausible, sentry, linear, vercel, stripe, fly, tailscale, svelte, neon). Next.js and htmx were dropped in wave 1 and are excluded as well. Selection check, run after choosing, over the 11 files that existed before this follow-up (the consolidation, its nine sub-artifacts other than this one, and `product-audit/exemplar-landing-pages.md`; this file is left out because it names the hosts). Command and output, run 2026-11-27:

```
$ F=(marketing-claims-evidence.md $(ls marketing-claims-evidence/*.md | grep -v followup-w3-q0) product-audit/exemplar-landing-pages.md); echo "files: ${#F[@]}"
$ for h in railway.com netlify.com grafana.com temporal.io prisma.io drizzle.team resend.com clerk.com convex.dev upstash.com mongodb.com cursor.com warp.dev raycast.com docker.com gitlab.com postman.com datadoghq.com cloudflare.com; do echo "$h $(cat "${F[@]}" | grep -c -i -F $h)"; done | paste -sd" "
files: 11
railway.com 0 netlify.com 0 grafana.com 0 temporal.io 0 prisma.io 0 drizzle.team 0 resend.com 0 clerk.com 0 convex.dev 0 upstash.com 0 mongodb.com 0 cursor.com 0 warp.dev 0 raycast.com 0 docker.com 0 gitlab.com 0 postman.com 0 datadoghq.com 0 cloudflare.com 0
```

The same loop over the bare product names printed 0 for 15 of 19 and nonzero for four: mongodb 2, cursor 1, docker 1, cloudflare 2. I read all six lines. They are a list of vendors that changed licence (`claims-licence-openness.md`, MongoDB), a Cargo dependency name (`docker_credential`), a list of coding clients in the consolidation (Cursor), and a comparison of Plausible against Cloudflare analytics (`followup-q4.md`). None of them is a home page or a line from one, so the four pages are held out.

**Pages.** I chose 20 developer-product home pages from products I knew existed, before reading any of them. One refused the fetch. Each page was fetched once with `curl -sL -m 30 -A 'Mozilla/5.0 (X11; Linux x86_64)'` on 2026-11-27 (a browser user-agent string; nothing was logged in or posted). I first gave "bot agents are blocked at some of these sites" as the reason. That was an assumption, and I tested it afterwards (command and output under "Repair measurements", test R7): all 19 pages return HTTP 200 under both the default `curl/8.5.0` user agent and the browser string, so the browser string was not needed for any of them. The one site that blocks is render.com, and it blocks the browser string (403) and serves the default curl agent (200). I did not re-fetch render.com's content, so the 19-page set is unchanged. Scratch directory: `~/.cache/research-lang/exemplars/product/wave2/mce-w3q0/`.

| Page | URL | HTTP | Bytes |
|---|---|---|---|
| railway | https://railway.com/ | 200 | 208,010 |
| netlify | https://www.netlify.com/ | 200 | 197,757 |
| grafana | https://grafana.com/ | 200 | 683,809 |
| temporal | https://temporal.io/ | 200 | 217,128 |
| prisma | https://www.prisma.io/ | 200 | 553,340 |
| drizzle | https://orm.drizzle.team/ | 200 | 460,102 |
| resend | https://resend.com/ | 200 | 588,642 |
| clerk | https://clerk.com/ | 200 | 1,191,676 |
| convex | https://www.convex.dev/ | 200 | 288,697 |
| upstash | https://upstash.com/ | 200 | 632,715 |
| mongodb | https://www.mongodb.com/ | 200 | 1,232,018 |
| cursor | https://cursor.com/ | 200 | 583,523 |
| warp | https://www.warp.dev/ | 200 | 299,456 |
| raycast | https://www.raycast.com/ | 200 | 352,532 |
| docker | https://www.docker.com/ | 200 | 405,141 |
| gitlab | https://about.gitlab.com/ | 200 | 225,020 |
| postman | https://www.postman.com/ | 200 | 477,196 |
| datadog | https://www.datadoghq.com/ | 200 | 280,932 |
| cloudflare | https://www.cloudflare.com/ | 200 | 1,334,667 |
| render (dropped) | https://render.com/ | 403 | 5,368 (a block page; not used) |

All page text below is vendor copy, read 2026-11-27, and is quoted only as the object of measurement. No claim on these pages was checked for truth, and none is asserted here.

**Visible text.** The extractor is the one followup-q0 used (`mkt-claim-02-remeasure/scripts/text.py`, a stdlib `HTMLParser` that drops `script`, `style`, `svg`, `pre`, `noscript` and `template`): `python3 -I text.py html/*.html > all.txt` gave 6,207 lines. To make hand labelling possible I dropped lines of fewer than three words with no digit, and exact duplicate lines per page, which left 2,788 lines (`cand.txt`, sha256 `e7e3a0bae162b38d5c0278fc7a296478bff387cf26678f73c751e72385e993a0`). The dropped lines are navigation labels and repeats; a claim of one or two words with a digit (`99.8%`, `310B`) stays. A claim of one or two words without a digit (for example "Zero Lock-in") is outside the held-out set, which biases recall upward. Drizzle's home page embeds a 766-line changelog, which contributes 14 hits and 8 real lines.

**Label definition.** A line is a real claim when it states a checkable fact, figure, price, limit, status, comparison, certification, adopter, ranking or guarantee about the product, or an outcome word the rule's own class would gate. Class letters are those of followup-q0: N number or count, P price, limit or free, C compliance or comparison, S social proof or adopter or ranking, M maturity or AI label, O outcome word, Q absolute or guarantee, plus T for a quoted testimonial line (kept separate, because MKT-CLAIM-20 gates it rather than MKT-CLAIM-02). Flag `B` marks a borderline call. A claim split over two display lines (`$0.30` then `/ million requests`) is labelled on the line that holds the figure.

**Labels before the run.** I read the 2,788 lines in four passes and wrote four label files (`labels_part1.txt` to `labels_part4.txt`), 506 entries. They were merged and frozen before any pattern ran: `sort -n -u` gave `labels_frozen.txt` (504 distinct claim lines; two lines carried two labels, and the sort kept the first: 701 `P`, 2107 `M`), sha256 `bd4c0248f16377a5558769c93470f576a0da1eeb0b371dee11238e6cf6fa845c`, 2026-11-27T13:38:33Z. No label was changed afterwards. Where I later found a label mistake (see "Label mistakes found afterwards"), I report it as a sensitivity and leave the frozen file alone.

**The set.** `rev.txt` is the MKT-CLAIM-02 block as the consolidation states it. Its sha256 is `05e58b95737c79c44022984edd9fccb9cb8d6426821a0c6fd8f0d20c3a76ff8a`, which equals the digest the consolidation gives. Each of its 15 lines was run on its own and then all together with `grep -a -n -i -E`. The `-a` flag is needed: two lines contain control characters, and without it GNU grep prints only `binary file matches`. The consolidation's own commands lack `-a`, so a rerun on a page with a control character would lose hits.

```
cd ~/.cache/research-lang/exemplars/product/wave2/mce-w3q0
sed 's/^[a-z]*://' cand.txt > txt.txt        # 2788 lines, same line numbers as cand.txt
while IFS= read -r arm; do i=$((i+1)); printf '%s\n' "$arm" > arm$i.pat
  /usr/bin/grep -a -n -i -E -f arm$i.pat txt.txt | cut -d: -f1 > hits$i.txt; done < ../mce-rev/rev.txt
/usr/bin/grep -a -n -i -E -f ../mce-rev/rev.txt txt.txt | cut -d: -f1 > hits_all.txt     # 287 lines
/usr/bin/grep -a -n -P -i '\b(better|best|cheaper|faster|simpler) than\b|\bunlike\b|\bvs\b\.?(?!\s*code\b)|\bversus\b|\bcompared (to|with)\b|\balternative to\b' txt.txt | cut -d: -f1 > hits_cmp.txt   # 20 lines
python3 -I score.py
```

`score.py` output, unedited:

```
arm1     hits= 43 strict= 29 border=  3 testi=  4 false=  7
arm2     hits= 29 strict= 14 border=  6 testi=  3 false=  6
arm3     hits=  8 strict=  6 border=  0 testi=  0 false=  2
arm4     hits= 42 strict= 35 border=  1 testi=  0 false=  6
arm5     hits= 79 strict= 37 border=  6 testi= 11 false= 25
arm6     hits= 13 strict= 13 border=  0 testi=  0 false=  0
arm7     hits= 14 strict= 13 border=  0 testi=  0 false=  1
arm8     hits=  4 strict=  3 border=  0 testi=  1 false=  0
arm9     hits= 38 strict=  7 border=  6 testi=  2 false= 23
arm10    hits=  2 strict=  1 border=  0 testi=  1 false=  0
arm11    hits=  2 strict=  1 border=  0 testi=  0 false=  1
arm12    hits= 21 strict= 20 border=  0 testi=  1 false=  0
arm13    hits= 19 strict= 17 border=  1 testi=  0 false=  1
arm14    hits=  0 strict=  0 border=  0 testi=  0 false=  0
arm15    hits= 22 strict=  4 border=  3 testi=  2 false= 13
union    hits=287 strict=167 border= 24 testi= 23 false= 73
cmp      hits= 20 strict= 11 border=  0 testi=  2 false=  7
labelled lines 504 {'B': 57, 'S': 331, 'T': 116}
missed 290 {'B': 33, 'S': 164, 'T': 93}
strict: precision 167/287 = 58.2%  recall 167/331 = 50.5%
strict+border: precision 191/287 = 66.6%  recall 191/388 = 49.2%
all incl testimonials: precision 214/287 = 74.6%  recall 214/504 = 42.5%
```

## Results

### Per arm

Hits count lines. A line that two arms hit counts once in each arm and once in the union. "Strict", "border" and "testi" are the real hits under the three readings. "False" is a hit with no label. Precision is strict divided by hits, with strict plus border in brackets.

| Arm | Covers | Hits | Strict | Border | Testimonial | False | Precision, strict (strict+border) |
|---|---|---|---|---|---|---|---|
| 1 | percent and `×` | 43 | 29 | 3 | 4 | 7 | 67.4 % (74.4 %) |
| 2 | units `x ms MB GB seconds minutes` | 29 | 14 | 6 | 3 | 6 | 48.3 % (69.0 %) |
| 3 | counts with a noun | 8 | 6 | 0 | 0 | 2 | 75.0 % |
| 4 | prices, free tier, unlimited | 42 | 35 | 1 | 0 | 6 | 83.3 % (85.7 %) |
| 5 | outcome words | 79 | 37 | 6 | 11 | 25 | 46.8 % (54.4 %) |
| 6 | compliance words | 13 | 13 | 0 | 0 | 0 | 100 % |
| 7 | social-proof phrases | 14 | 13 | 0 | 0 | 1 | 92.9 % |
| 8 | maturity grades | 4 | 3 | 0 | 1 | 0 | 75.0 % |
| 9 | AI words (widened) | 38 | 7 | 6 | 2 | 23 | 18.4 % (34.2 %) |
| 10 | `better than`, `unlike` | 2 | 1 | 0 | 1 | 0 | 50.0 % |
| 11 | compact units | 2 | 1 | 0 | 0 | 1 | 50.0 % |
| 12 | `+`-suffix counts | 21 | 20 | 0 | 1 | 0 | 95.2 % |
| 13 | limits and free phrases | 19 | 17 | 1 | 0 | 1 | 89.5 % (94.7 %) |
| 14 | trust phrasing | 0 | 0 | 0 | 0 | 0 | none |
| 15 | labels | 22 | 4 | 3 | 2 | 13 | 18.2 % (31.8 %) |
| union | all 15 lines | 287 | 167 | 24 | 23 | 73 | 58.2 % (66.6 %) |
| PCRE comparison words (reading check, C16) | `vs`, `versus`, `compared to` | 20 | 11 | 0 | 2 | 7 | 55.0 % |

Arm 14 had no hit on any of the 19 pages, so nothing was measured for it. Arms 1 to 4, 6 to 8, 10 to 14 together have 176 hits and 74.4 % strict precision (80.7 % with borderline). Lines 5, 9 and 15 produce 49 of the 73 false hits (arm 5 has 25, arm 9 has 23, arm 15 has 13, and arms 9 and 15 overlap on `agentic` lines); the other 12 arms have the other 24.

### Lines 1 to 10 against lines 11 to 15

| Group | Hits | Strict | Strict precision | Strict plus border |
|---|---|---|---|---|
| Arms 1 to 10 (wave 1, the arms followup-q0 measured at 89.6 %) | 254 | 140 | 55.1 % | 63.8 % |
| Arms 11 to 15 | 64 | 42 | 65.6 % | 71.9 % |
| Arms 11 to 15, only the lines that arms 1 to 10 do not hit | 33 | 27 | 81.8 % | 87.9 % |
| All 15 | 287 | 167 | 58.2 % | 66.6 % |

The output is `extra2.py`. Arms 11 to 15 raise recall from 140 of 331 (42.3 %) to 167 of 331 (50.5 %). The 81.8 % figure is held out: those arms were written from the wave-1 exemplars, not from these pages.

### Misses by label class

A miss is a real claim line that no arm hit. The "owner arms" column names the arms whose class the line belongs to. `Q` has no owner arm: the consolidation handles absolutes by a reading check on headline lines only.

| Class | Owner arms | Strict real lines | Hit | Missed |
|---|---|---|---|---|
| N number or count | 1, 2, 3, 11, 12 | 80 | 48 | 32 |
| P price, limit, free | 4, 13, 14 | 86 | 51 | 35 |
| O outcome word | 5 | 38 | 25 | 13 |
| C compliance or comparison | 6, 10 | 29 | 16 | 13 |
| S social proof, adopter, ranking | 7, 14 | 50 | 19 | 31 |
| M maturity or AI label | 8, 9, 15 | 10 | 5 | 5 |
| Q absolute or guarantee | none | 38 | 3 | 35 |
| Total | | 331 | 167 | 164 |

Every missed line is printed verbatim in appendix A1 (strict, 164), A2 (borderline, 33) and A3 (testimonials, 93). The 73 false hits are in A4. Reasons I could attribute by reading the missed lines:

- **Free phrased outside the set (P).** "Get started free", "Create free account", "Try Docker Sandboxes free", "The ORM is free, always", "GET STARTED FREE", "free and always will be". Line 4 needs `free (tier|plan|trial|forever)` and line 13 needs `get free`, `try free`, `for free`. A glued extraction string, "Get free trialSign in", also fails the trailing `\b`. Of the 35 missed P lines, 16 contain the word "free".
- **Figure on one line, noun or unit on the next (N, P).** `310B`, `400B`, `540M`, `15M`, `1.3M`, `100,000`, `1 million`. These are `<number>` and `<caption>` pairs, so no arm sees a number with a unit. In a source file the two may be on one line; in rendered text they are not.
- **Glued tokens (N).** `13xfaster`, `1Mdeveloper hours`, `200databases`: no word boundary after the number. Same cause as the previous item, from the extractor, so this half of the miss may not occur on a source-level lint.
- **Absolutes in body copy (Q).** "ACID transactions so concurrent writes never corrupt your data", "Guarantee millisecond response times at scale", "The same gates, no exceptions.", "Scale it for decades.", "Infinite lifespan", "Build invincible applications". 35 of 38 are missed. The consolidation reads universal quantifiers on headline lines only.
- **Rankings and analyst placement (S).** "named a Leader in the 2026 Gartner Magic Quadrant" (datadog 7 strict lines, grafana 2, mongodb 1), "Forrester Wave", "named as 34th on AI 100", "Product Hunt 4.8★ (82)". None of arms 7 and 14 has a ranking phrase.
- **Adopter narrative (S).** "Salesforce migrated their monolith to Temporal", "Twilio left their homegrown systems for Temporal Cloud", "League of Legends launches to 100 million users", "Docker uses Warp to reduce onboarding time". The subject is a named company and the verb is not one of the arm's trust verbs.
- **Comparison pages (C).** Nine grafana links of the form "Datadog vs. Grafana Cloud" are missed by lines 1 to 15 and caught by the PCRE comparison word `vs`. Under C16 that arm routes them to MKT-CLAIM-30. So they are caught if the reading check is run, and missed by the 15-line set.

### The "agentic" and "intelligent" cost

Hits whose only matching arms are 9 and 15: 40 lines on 14 of 19 pages, 24 of them false and 14 real or borderline, 2 testimonial (test R5 under "Repair measurements": `python3 -I extra.py` and `python3 -I extra2.py`, raw output there). Without these 40 lines the set has 247 hits at 64.8 % strict precision (71.7 % with borderline). By C15, a hit whose only line-9 match is `agentic` or `intelligent` takes an `[[allow]]` entry, so the false ones cost an entry, not a failed build. 24 entries over 19 pages is about 1.3 per page. Most of the 24 false hits use the words as a category name ("agentic software engineering", "the intelligent data platform") and not as a claim about one feature. MKT-CLAIM-18 still needs a call site for each use as a label.

### Mock interface text

Fifteen false hits are text drawn inside a product mock-up or a scripted widget: Netlify "Visitors 48,210 12% this week" and "Pageviews 312,904 8% this week"; Docker's three region rows ("San Francisco6.4M18%"); Prisma "boot 7msp50 3.8ms" and "feat-authbooted 7ms"; Warp "[ fig. t4 · the factory ]8 × 28 · live", the four benchmark rows ("Claude Fable 5pass1.00x", "GPT-5.6 Solpass0.94x", "Gemini 3.6 Flashfail0.89x", "1.00x"), "prompts tunedpass+3.2%" and "3 agents"; Upstash "Cost$0.02". Five more demo figures (Cloudflare's latency rows, Netlify's uptime, Warp's counters) were labelled `B` and counted as borderline real hits, which is a call that could go the other way. A lint on a page source cannot tell a demo figure from a claim by pattern. The two outcomes are an `[[allow]]` entry per figure or a rule that a figure inside a labelled demo is exempt. I did not test the second.

### Line 5, word by word

Each alternative of line 5 run alone on the held-out text, wrapped as `\b(<word>)\b`, case-insensitive, with the frozen labels. Command, from `mce-w3q0/` (script `line5.py` in the repair scratch directory, which loops `re.compile(r'\b(' + w + r')\b', re.I).search` over `txt.txt`); the words with no hit (`lightweight`, `smallest`, `cheaper`, `cheapest`, `safest`, `unhackable`) print `hits=  0` in the raw run and are omitted here:

```
$ python3 -I ../mce-w3q0-repair/line5.py
fast           hits= 17 S=  7 B=2 T=3 F=  5
faster         hits= 26 S= 16 B=2 T=4 F=  4
fastest        hits=  3 S=  2 B=0 T=1 F=  0
instant(ly)?   hits=  5 S=  4 B=0 T=1 F=  0
blazing\w*     hits=  1 S=  1 B=0 T=0 F=  0
lightning\w*   hits=  1 S=  1 B=0 T=0 F=  0
smaller        hits=  1 S=  0 B=0 T=0 F=  1
scalable       hits=  1 S=  0 B=0 T=0 F=  1
reliable       hits=  8 S=  4 B=0 T=2 F=  2
secure         hits= 21 S=  7 B=2 T=0 F= 12
```

`secure` is the noisy word: it is a verb or part of a product name ("Secure Sandboxes", "Secure your email communication using DKIM and SPF") in 12 of 21 hits.

### Label mistakes found afterwards

I read the 73 false hits after the run, and the free-phrase misses. Twelve lines are ones I would label real if I labelled again: 164, 180 ("/mo billed annually", the unit half of a price I labelled on the number line), 204 ("Unlimited CASB & DLP"), 264 ("Start building for free"), 600, 669, 1572, 1710, 2138 and 2558 are false hits (10 lines); 106 ("Both pre.dev and clerk.com are free to get started!") and 1997 ("Get started free") are not hit by any arm and carry no label (2 lines). The earlier draft counted all twelve as false hits and gave 179 of 287 (62.4 %). That was wrong: only ten are hits. The check is test R8 under "Repair measurements" (`falsehits.txt` lookup and `new13score.py`-style count): flipping the ten gives 177 real of 287 hits, 61.7 %; the strict denominator then grows by the twelve to 343, and recall is 177 of 343 (51.6 %). The frozen numbers above stay the reported ones. The direction is that my labelling was stricter on hit lines than on lines no arm hit; I had not seen the hits, so this is inconsistency, not hit-shaped labelling. The same effect could hide in the other direction (misses I did not label), which a second rater would find.

## Candidate additions, tested on the same pages

These were built after reading the misses, so their numbers on these 19 pages are in-sample. Where possible the arm was also run on the 26 wave-1 exemplar pages (`mkt-claim-02-remeasure/exemplars.txt`), which it was not derived from. Output of `cand.py`, run from `mce-w3q0/` as `python3 -I cand.py` (the script runs each pattern of `cand_arms.txt` with Python `re`, case-insensitive, over `txt.txt` for the held-out columns and over `exemplars.txt` for `exemplar26`):

```
$ python3 -I cand.py
free       total= 54 (S42 B2 T1 F9)  new-vs-set= 25 (S18 B0 T1 F6)  exemplar26 lines=55
magnitude  total= 10 (S7 B0 T0 F3)  new-vs-set=  7 (S4 B0 T0 F3)  exemplar26 lines=0
absolute   total= 47 (S24 B1 T5 F17)  new-vs-set= 42 (S21 B1 T3 F17)  exemplar26 lines=35
analyst    total= 12 (S11 B0 T0 F1)  new-vs-set= 12 (S11 B0 T0 F1)  exemplar26 lines=7
adopter    total= 57 (S27 B1 T9 F20)  new-vs-set= 39 (S14 B0 T7 F18)  exemplar26 lines=52
```

The two `free` figures differ by one line because the arm in `cand.py` is `\bfree\b`, and the rule text uses `(^|[^[:alnum:]-])free\b`, which does not match a hyphen before the word. The one line is held-out line 1350 (Drizzle changelog: "... plus a filesystem-free WASM migrator.", unlabelled, not in the 15-line set). Both are counted below; every table row says which regex it used. Measured with `grep` (test R2 under "Repair measurements"):

| Regex | Held-out lines | Held-out not in the 15-line set | Wave-1 exemplar lines | Wave-1 not in the 15-line set |
|---|---|---|---|---|
| `\bfree\b` (`cand.py`) | 54 | 25 (S18 T1 F6) | 55 | 25 |
| `(^|[^[:alnum:]-])free\b` (rule text, MKT-CLAIM-13 verify) | 53 | 24 (S18 T1 F5) | 54 | 25 |

The earlier draft's "24 new lines" and "54 lines on wave-1" belong to the rule regex, and its "new-vs-set=25" and "55" to `\bfree\b`. The remaining text uses the rule regex. The arm patterns, in `cand_arms.txt`: `free` is `\bfree\b`; `magnitude` is `^>?[0-9][0-9.,]*[kKMBT]\+?$`; `absolute` is `\b(guarantee[ds]?|never|ever|always|no exceptions|invincible|failproof|infinite|without limits|survive anything)\b|\bno more\b`; `analyst` is `Gartner|Forrester|Magic Quadrant|named (a )?leader|\bleader in\b|\bwinner\b|Product Hunt`; `adopter` is a verb-plus-capitalised-name pattern.

| Candidate | Held-out, new lines | Strict real among them | Verdict |
|---|---|---|---|
| `free`, written as `(^|[^[:alnum:]-])free\b` (the MKT-CLAIM-13 verify regex) | 24 | 18 real, 1 testimonial, 5 false | Adopt as line 13. On the wave-1 exemplars the rule regex hits 54 lines (`\bfree\b`: 55), 25 of them not in the 15-line set in both forms. I read those 25: 19 are free offers or free-and-open-source statements (Astro, Biome, Svelte, Vite, Turso, Tailscale, Posthog, Plausible "2 months free", Cal "Free for individuals, no credit card, no usage limits"); 6 are Cal.com calendar prose ("times all four of you are free"). So 19 of 25 (76 %) on the wave-1 corpus, 18 of 24 (75 %) here. On the fleet corpus (`fleet2.txt`, 2,043 lines) it hits 0 lines (R2). Whole-set effect with the new line 13 in place of the old one: 311 hits, 185 strict, 59.5 % precision, recall 185 of 331 (55.9 %), against 287, 167, 58.2 % and 50.5 % (R3). |
| `magnitude` (a bare figure with a K, M, B or T suffix, whole line) | 7 | 4 | Do not adopt: 57 %, no hit on the wave-1 exemplars, and the misses it targets are mostly an extraction effect. |
| `absolute` as a failing arm | 42 | 21 real, 1 borderline, 3 testimonial, 17 false | Do not adopt as a failing arm: precision on the new lines is 50 %. Adopt as a reading check on body lines (below). |
| `analyst` (the `cand.py` pattern, without the ordinal clause) | 12 | 11 real, 1 false | Promising at 91.7 %, but it matches nothing on the wave-1 exemplars except Cal.com's "Product Hunt" handle lines, so there is no second corpus to confirm it. Adopt as a SHOULD rule, not as a failing arm. With the ordinal clause that MKT-CLAIM-31 adds (`\b[0-9]+(st|nd|rd|th) (on|in) `) the pattern hits 13 lines, 12 real, 1 false (R4); the extra line is Temporal's "34th on AI 100". |
| `adopter` | 39 | 14 real, 7 testimonial, 18 false | Do not adopt: 36 %. Adopter sentences stay with MKT-CLAIM-20's reading. |

## Failure classes

Two misses belong to a class the consolidation's "AI-agent failure modes" does not list, and one is listed only in part.

1. **Third-party ranking or analyst placement** (not listed). 12 strict missed lines on 5 of 19 pages (A1 lines 501, 502, 558, 559, 561, 562, 565, 1633, 1634, 1678, 2436, 2788): Datadog "Datadog named a Leader in the Gartner® Magic Quadrant™ for Observability Platforms" (seven strict lines in all, with the Forrester Wave and Observability Pipelines variants; an eighth Datadog line, 564, "2026 Gartner® Magic Quadrant™", is unlabelled and counts as a false hit), Grafana "Gartner evaluated 19 vendors ... Grafana Labs was positioned furthest in Completeness of Vision", MongoDB's Gartner line, Temporal "named as 34th on AI 100", Warp "Product Hunt 4.8★ (82)". MKT-CLAIM-20 covers a "review-site badge" and MKT-CLAIM-24 covers popularity counts. A ranking or a "Leader" placement is neither a badge a customer gave nor a count. An agent that fills a "proof" slot from remembered analyst names would write one. It sits next to failure mode 1 (filling a slot with plausible content).
2. **Unconditional guarantees in body copy** (listed in part). Mode 6 names "every coding agent" and mode 2 names "no hallucinations" for AI claims. No mode names "never corrupt your data", "guarantee millisecond response times", "no exceptions", "invincible". These lines are commitments, and MKT-CLAIM-16 already puts an "SLA, uptime" commitment behind a human sign-off. The gap is detection (class Q: 35 of 38 missed), not rule text.
3. **Demo figures read as claims** (a precision class, not a miss). See "Mock interface text".

The misses split by arm class (table above) do not show a fourth class: the other misses are phrasing variants of classes the consolidation lists (free phrases, figures without a unit, adopter sentences).

## Effect on the ruleset

| Rule | Effect | Text |
|---|---|---|
| MKT-CLAIM-02, Verdict 3 and the "Precision note" | **change** | Replace the in-sample claims with a two-corpus statement. New text for the end of the precision note: "Held out, 2026-11-27 ([followup-w3-q0](marketing-claims-evidence/followup-w3-q0.md)): 19 home pages written from neither wave, 2,788 lines. The 15-line set hit 287 lines, 167 real (58.2 %, one reader, strict labels; 66.6 % with borderline calls). Lines 5, 9 and 15 produce 49 of the 73 false hits; without them the set has 176 hits at 74.4 %. Lines 11 to 15 caught 33 lines that lines 1 to 10 miss, 27 real (81.8 %). Recall is at most 167 of 331 (50.5 %); 164 real claim lines are missed, 35 of 38 absolutes among them. Precision on new pages is lower than the in-sample 89.6 % and 90.7 %. Plan for a range, not one figure: 58.2 % is the frozen label set, 61.7 % after ten false hits that the same reader would now label real (177 of 287), 66.6 % with borderline calls. Size the false-hit load on the low end: about 4 in 10 hits are false." Replace the Verdict 3 sentences "On the visible text of 26 exemplar home pages ... 89.6 %" by the same two figures; keep the 26-page figures labelled "in sample". **Verify** (an agent reruns the held-out measurement from the cached copy and compares): `sha256sum ../mce-rev/rev.txt` prints `05e58b95737c79c44022984edd9fccb9cb8d6426821a0c6fd8f0d20c3a76ff8a`; `/usr/bin/grep -a -c -i -E -f ../mce-rev/rev.txt txt.txt` prints `287`; `python3 -I score.py \| grep -E '^strict'` prints `strict: precision 167/287 = 58.2%  recall 167/331 = 50.5%` and the strict-plus-border line `191/287 = 66.6%` (all run 2026-11-27, raw output in R3). The note's text passes when each figure it quotes (287, 167, 58.2, 66.6, 331, 50.5) equals the corresponding output, and `grep -c 'in sample' marketing-claims-evidence.md` is at least 1 so the in-sample figures stay labelled. |
| MKT-CLAIM-02 line 13 | **change** | New line 13: `\bup to [0-9]\|(^\|[^[:alnum:]-])free\b\|\bstarts at \$`. It replaces `\bfree (to start\|projects\|of charge)\|\b(start\|starts\|get\|try) (for )?free\b\|\bfor free\b\|\balways (be )?free\b` with the bare word, as MKT-CLAIM-13's verify already does. Reason: 16 of the 35 missed P lines contain "free" in a phrase the list does not contain. Verify: `grep -a -c -i -E '(^\|[^[:alnum:]-])free\b'` on `fleet2.txt` prints 0, so no fleet hit is added; on the held-out set it adds 24 lines (18 real); on the wave-1 exemplars 25 lines (19 real). With the new line in the set, `/usr/bin/grep -a -c -i -E -f rev_new13.txt txt.txt` prints `311` and strict precision is 185 of 311 (59.5 %), recall 185 of 331 (55.9 %) (R3). |
| Check E (blocked classes) | **change** | Add an exception sentence, as C15 did for `agentic`: "A line-13 hit whose only match is the bare word `free`, and where `free` does not describe a price, plan, licence or limit (a time slot, 'dependency-free'), may take an `[[allow]]` entry that names the sense." Reason: line 13 is a class with no `[[allow]]`. The wave-1 corpus has 6 calendar sentences ("times all four of you are free") that would otherwise be unfixable failures on a scheduling product. **Verify** (what the lint does before it accepts such an `[[allow]]`): the line must match the sense test `S` and must not match the offer test `O`. `P='(^\|[^[:alnum:]-])free\b'`, `S='\b(times?\|hours?\|calendar\|available\|availability\|busy\|meet\|slot\|appointment\|schedule\|week\|(mon\|tues\|wednes\|thurs\|fri\|satur\|sun)day)\b\|[[:alnum:]]-free\b'`, `O='\bfree (tier\|plan\|plans\|trial\|forever\|users\|of charge)\|for free\|(get\|try\|start\|starts) (for )?free\|\$[0-9]\|\bpricing\b\|\bnot free\b'`; the test is `grep -a -i -E "$P" FILE \| grep -a -i -E "$S" \| grep -a -c -v -i -E "$O"`. Measured 2026-11-27 (R6): on the wave-1 exemplars it prints `6` (exactly the six Cal.com calendar lines), on the held-out text `0`, on `fleet2.txt` `0` (there are no `free` lines). Every offer line ("Get started - free", "Try Cloud free", "Free for individuals") fails the test, so an `[[allow]]` for it is refused and the line stays a claim line that needs a record. Limit: `S` is a short word list; a scheduling line without one of its words is refused and the author extends `S` in a reviewed change. |
| MKT-CLAIM-02 lines 5, 9, 15 | **confirm, no change** | Their false hits cost a marker or an `[[allow]]` entry, which is the safe direction, and line 15 overlaps line 9 by design. Measured: `secure` alone has 21 hits and 7 strict (33 %), 12 false; every other word of line 5 has 5 or fewer false hits (per-word run below). Owner decision, not an agent edit: whether to drop `secure` from line 5 and leave it to MKT-CLAIM-08's verify, which already lists `secure`. |
| MKT-CLAIM-02 universal reading check | **change** | New text: "On headline lines (title, tagline, hero H1 and subhead, meta description, manifest description, repository description) read each universal quantifier ... On every line, also read `\b(guarantee[ds]?\|never\|always\|no exceptions\|infinite\|invincible\|failproof\|without limits)\b` and `\bno more\b`. A hit needs a named condition or a record beside it, as for a headline quantifier. It does not fail by itself." Reason: 35 of 38 absolutes are missed. As a failing arm the pattern is 50 % precise (21 real of 42 new hits), so it stays a reading check. Verify, measured 2026-11-27 (R9, the pattern exactly as written, without `ever`, which the 47-line `cand.py` figure above included): `/usr/bin/grep -a -c -i -E '<pattern>' txt.txt` prints `41` (12 of 19 pages; 22 strict real, 4 testimonial, 15 false), on the wave-1 exemplars `26`, on `fleet2.txt` `36`. So the agent reads about 2 lines per marketed page and 36 lines of the fleet's own text; the fleet lines are source documents, not marketing copy, so the check is scoped to the copy surface, not to all files. The pattern reaches 15 of the 38 strict absolute lines (the 15-line set reaches 3). A hit does not fail; the check passes when each hit line carries a named condition or a record on the same or the next line. |
| MKT-CLAIM-20, 24 | **confirm** | Adopter lines ("Salesforce migrated ...") are not caught by pattern at useful precision (36 %, in sample). They stay with the reading in MKT-CLAIM-20. |
| MKT-CLAIM-30 | **confirm** | The C16 comparison reading check hit 20 lines, 11 real; it caught the nine "X vs. Grafana Cloud" links that the 15-line set misses. |
| MKT-CLAIM-14, 06 | **confirm** | Arm 6 (compliance) is 13 of 13; arm 7 (social proof) is 13 of 14. These arms hold on new pages. |
| NEW MKT-CLAIM-31 | **new** | See below. |

### New rule

**MKT-CLAIM-31 (SHOULD).** Write an analyst placement, award, ranking or leaderboard position ("named a Leader in the Gartner Magic Quadrant", "34th on the AI 100", "4.8 on Product Hunt") only when a record of class `accolade` holds the issuer, the title exactly as the issuer prints it, the year, the category, a URL on the issuer's site that returns HTTP 200, and the date read. The copy names the issuer, the year and the category in the same sentence. An agent never writes one from memory.
- *Rationale:* it was missed on 5 of 19 held-out pages (12 strict lines: Datadog 7, Grafana 2, MongoDB 1, Temporal 1, Warp 1), and no rule names it. A placement is a factual claim about a third party's judgment, so it needs the same source and date as a statistic (MKT-CLAIM-07). The record fields are an addition to MKT-CLAIM-04's class list: `accolade` with `claim`, `surface`, `source` (the issuer URL), `source_type = "third-party-study"` or `"platform-doc"`, `observed`, `refresh_by` (next issue of the ranking, or 12 months), `definition` (issuer, year, category). I did not read any issuer's terms of use for such a mention, so whether a placement may be quoted at all, or only with a licensed reprint, is not decided here.
- *Verify:* two steps. (1) `grep -a -n -i -E 'Gartner|Forrester|Magic Quadrant|named (a )?leader|\bleader in\b|\bwinner\b|Product Hunt|\b[0-9]+(st|nd|rd|th) (on|in) '` over the copy surface; each hit needs a `claim:<id>` marker that resolves to an `accolade` row. Measured 2026-11-27 with this exact pattern, from `mce-w3q0/` (R4): on the held-out set `/usr/bin/grep -a -c -i -E '<pattern>' txt.txt` prints `13`; 12 are real strict lines and 1 is false (line 564, "2026 Gartner® Magic Quadrant™", a bare label with no label in the frozen file). The pattern without the ordinal clause hits 12 lines, 11 real, 1 false; the clause adds Temporal's "Temporal named as 34th on AI 100". On the wave-1 exemplars the pattern prints `7`, all "Product Hunt" handle lines on one site (Cal.com), so there is no second corpus for it. (2) The lint fetches `source`; `curl -sIL -o /dev/null -w '%{http_code}' <source>` must print 200, and the issuer's name and year must appear on the same line of the copy as the marker. On the fleet corpus (`fleet2.txt`, 2,043 lines) `/usr/bin/grep -a -c -i -E '<pattern>' fleet2.txt` prints `0` (R4). The second step (the HTTP check on `source`) is not run on any record, because no `accolade` row exists.

## Repair measurements

Every number the sections above take from a run is printed here with its command and its raw output. All runs are 2026-11-27, from the throwaway directories `~/.cache/research-lang/exemplars/product/wave2/mce-w3q0/` (cached pages, `txt.txt`, frozen labels, scripts of the first pass) and `~/.cache/research-lang/exemplars/product/wave2/mce-w3q0-repair/` (scripts and outputs of this repair). `EX` is `~/.cache/research-lang/exemplars/product/mkt-claim-02-remeasure/` (wave-1 corpus `exemplars.txt`, 5,797 lines, and the fleet corpus `fleet2.txt`, 2,043 lines). `score.py` is the first-pass scorer (its `kind(n)` returns S, B, T or F from the frozen labels); the repair scripts load it with `exec` and add only counting. R1 is the selection check under "Method".

### R2. The `free` regex, two forms, three corpora

```
$ cd mce-w3q0; P='(^|[^[:alnum:]-])free\b'
$ /usr/bin/grep -a -n -i -E "$P" txt.txt | cut -d: -f1 | wc -l
53
$ /usr/bin/grep -a -c -i -E '\bfree\b' txt.txt
54
$ /usr/bin/grep -a -c -i -E "$P" $EX/exemplars.txt
54
$ /usr/bin/grep -a -c -i -E '\bfree\b' $EX/exemplars.txt
55
$ /usr/bin/grep -a -i -E "$P" $EX/exemplars.txt | /usr/bin/grep -a -c -v -i -E -f ../mce-rev/rev.txt
25
$ /usr/bin/grep -a -i -E '\bfree\b' $EX/exemplars.txt | /usr/bin/grep -a -c -v -i -E -f ../mce-rev/rev.txt
25
$ /usr/bin/grep -a -c -i -E "$P" $EX/fleet2.txt
0
$ python3 -I ../mce-w3q0-repair/free.py        # the lines used in the text
\bfree\b total                     n= 54 S42 B2 T1 F9
\bfree\b new vs set                n= 25 S18 B0 T1 F6
rule-regex total                   n= 53 S42 B2 T1 F8
rule-regex new vs set              n= 24 S18 B0 T1 F5
in \bfree\b not in rule regex: [(1350, 'Added nested transactions for Turso database and WASM drivers, plus a filesystem', 'F', False)]
```

The 25 wave-1 lines that the 15-line set does not hit are, by the same `grep -v -f` command (first 120 characters of each): Astro "Astro is free, open-source software ...", Biome "Biome is free and open source ...", six Cal.com lines ("Rick has three times free on Thursday 22nd:", "Send one link with your free hours...", "Felix Moreau14:56Re: Re: what about next week Tuesday after 2pm is free.", "Intro call is ready: ... times all four of you are free ...", "Share a link. They pick an hour you're free.", "Checking Priya's calendar Priya is free 3 times this week..."), Cal.com "Your business...List it free" and "Free for individuals, no credit card, no usage limits.", Plausible "Free calculators and utilities ...", "2 months free" and "Paid vs free", PostHog "Get started – free", "Set upfor free" and two "Get started - free", Svelte "... Svelte is free and open source software ...", Tailscale "Get started - it's free!" twice, Turso "LoginTry Cloud free", "Try Cloud free", "Forever free. The same engine ..." and "Try Cloud free→", Vite "Free & open source". Six of the 25 are the calendar sentences, 19 are offers or licence statements.

### R3. The whole set, old and new line 13

```
$ cd mce-w3q0; sha256sum ../mce-rev/rev.txt
05e58b95737c79c44022984edd9fccb9cb8d6426821a0c6fd8f0d20c3a76ff8a  ../mce-rev/rev.txt
$ /usr/bin/grep -a -c -i -E -f ../mce-rev/rev.txt txt.txt
287
$ python3 -I score.py | grep -E "^(union|strict)"
union    hits=287 strict=167 border= 24 testi= 23 false= 73
strict: precision 167/287 = 58.2%  recall 167/331 = 50.5%
strict+border: precision 191/287 = 66.6%  recall 191/388 = 49.2%
$ sed '13s/.*/\\bup to [0-9]|(^|[^[:alnum:]-])free\\b|\\bstarts at \\$/' ../mce-rev/rev.txt > ../mce-w3q0-repair/rev_new13.txt; sed -n 13p ../mce-w3q0-repair/rev_new13.txt
\bup to [0-9]|(^|[^[:alnum:]-])free\b|\bstarts at \$
$ /usr/bin/grep -a -c -i -E -f ../mce-w3q0-repair/rev_new13.txt txt.txt
311
$ python3 -I ../mce-w3q0-repair/new13score.py
strict: precision 185/311 = 59.5%  recall 185/331 = 55.9%
strict+border: precision 209/311 = 67.2%  recall 209/388 = 53.9%
```

### R4. The analyst and ranking pattern, with and without the ordinal clause

`A` is `Gartner|Forrester|Magic Quadrant|named (a )?leader|\bleader in\b|\bwinner\b|Product Hunt` (the `cand.py` arm). `B` is `A` plus `|\b[0-9]+(st|nd|rd|th) (on|in) ` (the pattern MKT-CLAIM-31 gives).

```
$ for each of A and B:  /usr/bin/grep -a -c -i -E "$pat" txt.txt ; /usr/bin/grep -a -c -i -E "$pat" $EX/exemplars.txt ; /usr/bin/grep -a -c -i -E "$pat" $EX/fleet2.txt
== A   held-out 12   exemplars 7   fleet2 0
== B   held-out 13   exemplars 7   fleet2 0
$ python3 -I ../mce-w3q0-repair/an.py          # per-line listing; cache line, page, label kind, in-set or missed, first label class, text
A 12 {'S': 11, 'F': 1} not in set: 12 {'S': 11, 'F': 1}
   501 datadog S missed S Datadog named a Leader in the Gartner® Magic Quadrant™ for Observability Platforms
   502 datadog S missed S Leader in the Gartner® Magic Quadrant™
   558 datadog S missed S 2026 GARTNER® MAGIC QUADRANT™
   559 datadog S missed S Datadog has been named a leader in the 2026 Gartner® Magic Quadrant™ for Observability Pla
   561 datadog S missed S The Forrester Wave™: AIOps Platforms, Q4 2026
   562 datadog S missed S Datadog has been named a Leader in The Forrester Wave™: AIOps Platforms, Q4 2026
   564 datadog F missed - 2026 Gartner® Magic Quadrant™
   565 datadog S missed S Datadog has been named a Leader in the 2026 Gartner® Magic Quadrant™ for Observability Pip
   1633 grafana S missed S Leader in the 2026 Gartner® Magic Quadrant™ for Observability Platforms
   1634 grafana S missed S Gartner evaluated 19 vendors based on their Ability to Execute and Completeness of Vision,
   1678 mongodb S missed S GartnerMongoDB named a Leader in the 2026 Gartner® Magic Quadrant™ for Cloud Databases. Re
   2788 warp S missed S Product Hunt 4.8★ (82)
B 13 {'S': 12, 'F': 1} not in set: 13 {'S': 12, 'F': 1}
   (the same 12 lines, plus)
   2436 temporal S missed S Temporal named as 34th on AI 100 | Read more ›
$ /usr/bin/grep -a -n -i -E "$B" $EX/exemplars.txt | cut -c1-70        # the 7 wave-1 lines
1189:cal:flo merianon Product Hunt   1191:cal:Benon Product Hunt   1197:cal:Ahmed Elnaggaron Product Hunt
1199:cal:Pankaj Dixiton Product Hunt   1203:cal:Denison Product Hunt   1207:cal:Aria Minaeion Product Hunt
1271:cal:4.8Product Hunt
```

Counting the A1 table for this class gives 12 strict lines: Datadog 7 (501, 502, 558, 559, 561, 562, 565), Grafana 2 (1633, 1634), MongoDB 1 (1678), Temporal 1 (2436), Warp 1 (2788). The earlier "11" was the `A` arm, which has no ordinal clause and so did not see Temporal. No pre-ordinal measurement is used for MKT-CLAIM-31 any more. Datadog has 7 strict lines and one more unlabelled one (564).

### R5. The "agentic" cost and the arm groups

```
$ python3 -I extra.py
agentic/intelligent-only hits 40 Counter({'F': 24, 'S': 7, 'B': 7, 'T': 2})
14 pages {'datadog': 5, 'gitlab': 6, 'grafana': 4, 'prisma': 1, 'railway': 1, 'warp': 2, 'clerk': 1, 'cloudflare': 3, 'mongodb': 8, 'docker': 2, 'convex': 1, 'cursor': 4, 'temporal': 1, 'upstash': 1}
without them: hits 247 {'S': 160, 'F': 49, 'T': 21, 'B': 17} strict prec 64.8 S+B 71.7
drizzle hits 14 Counter({'S': 8, 'B': 4, 'F': 1, 'T': 1})
flip 177 287 61.7
page prec strict min/med/max 21.428571428571427 61.53846153846154 100.0
116
N arms 1,2,3,11,12 strict labelled 80 hit 48 missed 32
P arms 4,13,14 strict labelled 86 hit 51 missed 35
O arm 5 strict labelled 38 hit 25 missed 13
C arm 6,10 strict labelled 29 hit 16 missed 13
S arms 7,14 strict labelled 50 hit 19 missed 31
M arms 8,9,15 strict labelled 10 hit 5 missed 5
Q no arm (reading check) strict labelled 38 hit 3 missed 35
$ python3 -I extra2.py
arms 1-10 (wave 1)           hits=254 S=140 B=22 T=22 F=70 strict=55.1% S+B=63.8% all=72.4%
arms 11-15 only (wave 2)     hits= 64 S= 42 B= 4 T= 3 F=15 strict=65.6% S+B=71.9% all=76.6%
arms 11-15 not in 1-10       hits= 33 S= 27 B= 2 T= 1 F= 3 strict=81.8% S+B=87.9% all=90.9%
arms 1-4,6-8,10-14 (no 5,9,15) hits=176 S=131 B=11 T=10 F=24 strict=74.4% S+B=80.7% all=86.4%
all 15                       hits=287 S=167 B=24 T=23 F=73 strict=58.2% S+B=66.6% all=74.6%
```

The 33 lines that arms 11 to 15 hit and arms 1 to 10 do not are 27 strict, 2 borderline, 1 testimonial and 3 false. The `flip` line of `extra.py` uses a list of ten ids (the ten false hits of R8). The 24 false lines among the 40 are the "false" count in the agentic section.

### R6. The Check E sense test

```
$ P='(^|[^[:alnum:]-])free\b'
$ S='\b(times?|hours?|calendar|available|availability|busy|meet|slot|appointment|schedule|week|(mon|tues|wednes|thurs|fri|satur|sun)day)\b|[[:alnum:]]-free\b'
$ O='\bfree (tier|plan|plans|trial|forever|users|of charge)|for free|(get|try|start|starts) (for )?free|\$[0-9]|\bpricing\b|\bnot free\b'
$ for f in exemplars.txt wave2/mce-w3q0/txt.txt fleet2.txt; do grep -a -c -i -E "$P" $f; grep -a -i -E "$P" $f | grep -a -i -E "$S" | grep -a -c -v -i -E "$O"; done
mkt-claim-02-remeasure/exemplars.txt: free lines 54
  pass S and not O: 6
wave2/mce-w3q0/txt.txt: free lines 53
  pass S and not O: 0
mkt-claim-02-remeasure/fleet2.txt: free lines 0
  pass S and not O: 0
$ grep -a -i -E "$P" exemplars.txt | grep -a -i -E "$S" | grep -a -v -i -E "$O" | cut -c1-70
cal:Rick has three times free on Thursday 22nd:
cal:Send one link with your free hoursIt only shows the times you can 
cal:Felix Moreau14:56Re: Re: what about next week Tuesday after 2pm is
cal:Intro call is ready: cal.com/acme/intro. It only offers times all 
cal:Share a link. They pick an hour you're free.
cal:Checking Priya's calendarPriya is free 3 times this weekBooked. Priya has the invite.
```

A first, shorter `S` without `week` and the weekday names passed five of the six lines (the Felix line has no calendar word); the version above passes all six and none of the offer lines. `S` was widened after seeing the sixth line, so the 6 of 6 is in sample for these six lines.

### R7. The user-agent test

One GET per URL and agent, redirects followed, body discarded: `curl -sL -m 30 -o /dev/null -w '%{http_code}' -A '<agent>' <url>`, with the agents `curl/8.5.0` and `Mozilla/5.0 (X11; Linux x86_64)`.

```
https://railway.com/ default-curl-UA=200 browser-UA=200
https://www.netlify.com/ default-curl-UA=200 browser-UA=200
https://grafana.com/ default-curl-UA=200 browser-UA=200
https://temporal.io/ default-curl-UA=200 browser-UA=200
https://www.prisma.io/ default-curl-UA=200 browser-UA=200
https://orm.drizzle.team/ default-curl-UA=200 browser-UA=200
https://resend.com/ default-curl-UA=200 browser-UA=200
https://clerk.com/ default-curl-UA=200 browser-UA=200
https://www.convex.dev/ default-curl-UA=200 browser-UA=200
https://upstash.com/ default-curl-UA=200 browser-UA=200
https://www.mongodb.com/ default-curl-UA=200 browser-UA=200
https://cursor.com/ default-curl-UA=200 browser-UA=200
https://www.warp.dev/ default-curl-UA=200 browser-UA=200
https://www.raycast.com/ default-curl-UA=200 browser-UA=200
https://www.docker.com/ default-curl-UA=200 browser-UA=200
https://about.gitlab.com/ default-curl-UA=200 browser-UA=200
https://www.postman.com/ default-curl-UA=200 browser-UA=200
https://www.datadoghq.com/ default-curl-UA=200 browser-UA=200
https://www.cloudflare.com/ default-curl-UA=200 browser-UA=200
https://render.com/ default-curl-UA=200 browser-UA=403
```

The browser string was not needed for any page that was used. The status code does not show that the two agents received the same content: I did not compare bodies, so a site could serve a different page to each. The cached copies are the ones fetched under the browser string.

### R8. The label corrections

```
$ for n in 106 164 180 204 264 600 669 1572 1710 1997 2138 2558; do awk -F'\t' -v n=$n '$1==n{print "FALSE-HIT arms "$2; f=1} END{if(!f)print "not a hit"}' falsehits.txt; done   # one line per id
106: not a hit      164: FALSE-HIT arms 5     180: FALSE-HIT arms 4     204: FALSE-HIT arms 4
264: FALSE-HIT arms 13   600: FALSE-HIT arms 5   669: FALSE-HIT arms 3   1572: FALSE-HIT arms 5
1710: FALSE-HIT arms 5   1997: not a hit   2138: FALSE-HIT arms 5   2558: FALSE-HIT arms 5
$ python3 -I ../mce-w3q0-repair/free.py | tail -2        # last two lines
flips in hits [164, 180, 204, 264, 600, 669, 1572, 1710, 2138, 2558] ['F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F']
12 flips 179 287 62.4
```

The last line of that run adds all twelve to the numerator, which is wrong for 106 and 1997 (they are not hits); it is the source of the earlier 62.4 %. The correct count is the `flip 177 287 61.7` line of `extra.py` (R5), which flips only the ten lines that are hits.

### R9. The absolute-word reading check

```
$ Q='\b(guarantee[ds]?|never|always|no exceptions|infinite|invincible|failproof|without limits)\b|\bno more\b'
$ /usr/bin/grep -a -c -i -E "$Q" txt.txt                 # held-out
41
$ /usr/bin/grep -a -i -E "$Q" cand.txt | cut -d: -f1 | sort -u | wc -l     # pages with a hit
12
$ /usr/bin/grep -a -c -i -E "$Q" $EX/exemplars.txt
26
$ /usr/bin/grep -a -c -i -E "$Q" $EX/fleet2.txt
36
$ python3 -I ../mce-w3q0-repair/q.py
41 {'S': 22, 'T': 4, 'F': 15}
Q strict labelled 38 caught by this pattern 15 caught by set 3
```

## Dated facts

| Fact | Value | Date |
|---|---|---|
| Home pages fetched | 19 pages with HTTP 200, one blocked (render.com, 403), table above | 2026-11-27 |
| Labels frozen | `labels_frozen.txt` sha256 `bd4c0248f16377a5558769c93470f576a0da1eeb0b371dee11238e6cf6fa845c` | 2026-11-27T13:38:33Z |
| Set under test | `rev.txt` sha256 `05e58b95737c79c44022984edd9fccb9cb8d6426821a0c6fd8f0d20c3a76ff8a` (equals the consolidation's digest) | 2026-11-27 |
| Line corpus | `cand.txt` sha256 `e7e3a0bae162b38d5c0278fc7a296478bff387cf26678f73c751e72385e993a0`, 2,788 lines | 2026-11-27 |
| Page copy | vendor marketing text, read from live pages; it changes without notice and the cached copy is the evidence | 2026-11-27 |
| GNU grep behaviour | without `-a`, a line with a control character makes `grep -E` print only `binary file matches` (observed: 16 such messages in the first run) | 2026-11-27 |
| User-agent test | 19 of 19 pages HTTP 200 under both `curl/8.5.0` and the browser string; render.com 200 and 403 (R7) | 2026-11-27 |
| Label corrections | 10 false hits would now be labelled real: 177 of 287 (61.7 %); 2 unlabelled non-hit lines (106, 1997) (R8) | 2026-11-27 |
| Wave-1 corpus | 26 pages, `mkt-claim-02-remeasure/exemplars.txt`, 5,797 lines | fetched 2026-11-27 (per consolidation) |

## What could not be determined

- **A second rater.** There was none, and I did not simulate one. Every label is mine. The 57 borderline calls and the 12 post-hoc label mistakes (10 false hits, 2 unlabelled lines) show how far one reader moves the figure: 58.2 % strict, 61.7 % after the ten flips of false hits, 66.6 % with borderline calls, 74.6 % with testimonials. Inter-rater reliability is unmeasured.
- **True recall.** The denominator is real claim lines that one reader found. Two things bias it: one- and two-word lines without a digit were dropped before reading (3,419 of 6,207 visible lines: short lines without a digit, and exact repeats), and I read each line once. Recall is an upper bound, as in followup-q0.
- **Claim truth.** I did not check whether any page's claim is true. Labels mark claim lines, not false ones.
- **Source-level behaviour.** The lint runs on repository files; these are rendered page texts. The split-figure and glued-token misses (`310B`, `13xfaster`) depend on how the extractor joins elements. Whether they occur in source files is not measured.
- **The `[[allow]]` cost.** I counted false hits, not the allow entries a real repository would need. Whether line 5 `secure` should stay is an owner call.
- **Analyst-mention terms.** MKT-CLAIM-31 does not rest on any issuer's published terms for quoting a placement. I fetched none. Missing: each issuer's usage terms, read from the issuer's own site.
- **Pages beyond developer products.** All 19 are developer, data or infrastructure product sites. Consumer sites, pricing pages and docs home pages are not represented.
- **Same content under both user agents.** R7 compares status codes only. I did not diff the bodies, so I cannot say a site serves the same copy to a bot agent as to the browser string.
- **Arm 14** (`trusted in production by`, `powering ...`) had zero hits, so it is unmeasured on held-out pages.

## Appendix: the missed and false lines

Line numbers are the line numbers of `cand.txt` in the scratch directory. Class letters are those defined under "Method". `|` inside a line text is escaped.

### A1. Missed strict claim lines (164)

The form is: cache line number, page, class letters, verbatim line.

| Line | Page | Class | Line text |
|---|---|---|---|
| 33 | clerk | O | Dramatically reduce fraudulent sign-ups with built-in, continually updated machine learning. |
| 91 | clerk | P | Yes. Clerk Organizations provides workspaces, memberships, invitations, roles, and permissions. Keep your own workspace UI and link authorized customer admins to Clerk-hosted settings to configure SSO, or embed our components. Enterprise Authentication also includes Directory Sync. Production self-serve SSO is available on Pro and Business without the B2B Authentication add-on. See pricing. |
| 92 | clerk | S | Trusted around the world |
| 93 | clerk | S | Join the customers and champions who trust Clerk. Free for your first 50,000 monthly retained users and 100 monthly retained orgs. |
| 152 | cloudflare | N | 310B |
| 157 | cloudflare | Q | No more capacity planning. Ever. |
| 162 | cloudflare | S | And thousands more... |
| 166 | cloudflare | P | Pay onlywhen your code runs |
| 206 | cloudflare | Q | Never pay for idle time waiting for slow APIs, LLMs, or humans. Cloudflare charges only for compute, not wall time, even during long agent workflows or hibernating WebSockets. |
| 212 | cloudflare | P | No credit card needed |
| 214 | cloudflare | P | 100,000 |
| 216 | cloudflare | P | 1 million |
| 218 | cloudflare | P | 25 |
| 228 | cloudflare | P | 1,000 |
| 249 | cloudflare | Q | Git, GitHub Actions, VS Code, and any framework. No proprietary tools or vendor lock-in. |
| 295 | convex | N | npm3M weekly |
| 302 | convex | Q | Works great with any model, any agent, any editor |
| 309 | convex | Q | ACID transactions so concurrent writes never corrupt your data |
| 310 | convex | Q | End-to-end type safety so agent hallucinations are caught before they ship |
| 311 | convex | Q | Automatic caching & scaling so going viral never takes you down |
| 322 | convex | Q | WorkflowWorkflows that survive anything |
| 345 | convex | O | Build a production app this afternoon |
| 346 | convex | Q | Scale it for decades. |
| 350 | convex | S | A Trusted Solution |
| 458 | cursor | Q | Use the best model for every task |
| 459 | cursor | Q | Choose between every cutting-edge model from OpenAI, Anthropic, Gemini, SpaceXAI, and Cursor. |
| 501 | datadog | S | Datadog named a Leader in the Gartner® Magic Quadrant™ for Observability Platforms |
| 502 | datadog | S | Leader in the Gartner® Magic Quadrant™ |
| 551 | datadog | P | GET STARTED FREE |
| 553 | datadog | Q | See inside any stack, any app, at any scale, anywhere. |
| 555 | datadog | S | Thousands of customers love & trust Datadog |
| 558 | datadog | S | 2026 GARTNER® MAGIC QUADRANT™ |
| 559 | datadog | S | Datadog has been named a leader in the 2026 Gartner® Magic Quadrant™ for Observability Platforms |
| 561 | datadog | S | The Forrester Wave™: AIOps Platforms, Q4 2026 |
| 562 | datadog | S | Datadog has been named a Leader in The Forrester Wave™: AIOps Platforms, Q4 2026 |
| 565 | datadog | S | Datadog has been named a Leader in the 2026 Gartner® Magic Quadrant™ for Observability Pipelines |
| 569 | datadog | M | AI agents that chat, investigate, and remediate issues |
| 576 | datadog | N | For our 2026 report, we analyzed AWS, Google Cloud, and Azure data from thousands of organizations to understand the latest trends in cloud security posture. |
| 594 | datadog | P | Start Your Free Datadog Trial Now |
| 619 | docker | O | Docker securely contains autonomous agents |
| 625 | docker | Q | every app and agent can run safely anywhere. |
| 627 | docker | P | Learn more Try Docker Sandboxes free |
| 629 | docker | Q | With a supply chain built on trust, autonomous agents can’t make a bad pull. |
| 630 | docker | P | Try Docker Hardened Images free |
| 643 | docker | N | Start from images that are already clean. Docker Hardened Images arrive with near-zero CVEs, a signed SBOM, and provenance you can verify, so audits don’t turn into scrambles. |
| 656 | docker | S | The trusted foundation for the most innovative organizations |
| 673 | docker | N | Containers and the full dev loop in one place. Go from a blank file to a running app in minutes and ship it anywhere, on the same open standards that ran the cloud and now run the agent era. |
| 1066 | drizzle | N | Grow from 600 test cases to >7k test units |
| 1193 | drizzle | N | 164 bugs fixed |
| 1341 | drizzle | O | JIT row mappers to reduce ORM overhead to ~0 |
| 1401 | drizzle | O | Drizzle doesn't slow you down |
| 1413 | drizzle | Q | We support every major serverful and serverless runtime |
| 1414 | drizzle | Q | Connect to any database |
| 1415 | drizzle | Q | We support all platform-specific, tcp, http and websocket based drivers |
| 1429 | drizzle | P | Just kidding, Drizzle is free and open-source |
| 1435 | drizzle | S | Developers love Drizzle ORM! |
| 1487 | gitlab | M | GitLab Orbit is generally available |
| 1488 | gitlab | O | Higher agent accuracy, lower token cost |
| 1500 | gitlab | P | Request a demoGet free trialSign in |
| 1502 | gitlab | O | GitLab Orbit is generally available. Increase agent accuracy and lower token costRead the announcement |
| 1528 | gitlab | Q | Every project, issue, and pipeline in one place. Agents work from the same source your team gates, no exceptions. |
| 1531 | gitlab | Q | Policies, approvals, and scanning apply to human and agent changes alike. The same gates, no exceptions. |
| 1534 | gitlab | Q | Every agent action shows up in the audit trail. No black box, no guessing what changed or who approved it. |
| 1537 | gitlab | C | Audit trails, access controls, and security testing that satisfy regulators without slowing delivery. |
| 1538 | gitlab | N | 1Mdeveloper hours saved per year |
| 1540 | gitlab | N | 13xfaster security scanning |
| 1542 | gitlab | N | 6xfaster time to market |
| 1548 | gitlab | N | 80xfaster CI pipeline builds |
| 1579 | gitlab | P | Get your free trialContact sales |
| 1597 | grafana | P | Get started free |
| 1604 | grafana | O | Cut costs. Only pay for the data that matters. |
| 1609 | grafana | N | Connect your existing tools and data sources to Grafana Cloud — no rip-and-replace required. Built on open standards like OpenTelemetry and Prometheus, with hundreds of plugins and integrations ready to extend your stack. |
| 1623 | grafana | C | AICPA SOC Type II Verified |
| 1633 | grafana | S | Leader in the 2026 Gartner® Magic Quadrant™ for Observability Platforms |
| 1634 | grafana | S | Gartner evaluated 19 vendors based on their Ability to Execute and Completeness of Vision, and Grafana Labs was positioned furthest in Completeness of Vision. |
| 1636 | grafana | Q | Explore insights from the industry’s largest community-driven survey on the evolving state of observability. |
| 1639 | grafana | S | Real stories from real customers |
| 1648 | grafana | P | Create free account |
| 1665 | grafana | C | Arize vs. Grafana Cloud |
| 1666 | grafana | C | Datadog vs. Grafana Cloud |
| 1667 | grafana | C | Dynatrace vs. Grafana Cloud |
| 1668 | grafana | C | Elasticsearch vs. Grafana Cloud |
| 1669 | grafana | C | Langfuse vs. Grafana Cloud |
| 1670 | grafana | C | LangSmith vs. Grafana Cloud |
| 1671 | grafana | C | New Relic vs. Grafana Cloud |
| 1672 | grafana | C | PagerDuty vs. Grafana Cloud |
| 1673 | grafana | C | Splunk vs. Grafana Cloud |
| 1678 | mongodb | S | GartnerMongoDB named a Leader in the 2026 Gartner® Magic Quadrant™ for Cloud Databases. Read the Gartner report > >> |
| 1681 | mongodb | P | Enterprise AdvancedManage your apps on your infrastructureCommunity EditionDevelop locally with MongoDB, at no cost |
| 1684 | mongodb | Q | MongoDB 9.0The best version of MongoDB ever built |
| 1707 | mongodb | Q | Every workload. Any cloud. One platform. |
| 1717 | mongodb | P | Take free, expert-led courses to sharpen your skills and earn industry-recognized badges. |
| 1727 | mongodb | Q | Guarantee millisecond response times at scale with a flexible document data model and rich query capabilities—including secondary indexing, joins, multi-document ACID transactions, and more. |
| 1738 | mongodb | N | 200databases migrated to Atlas in 4 months |
| 1778 | netlify | N | Platform From AI tools or Git to global deployment in seconds. Explore the platform → |
| 1808 | netlify | N | Create an app in minutes with intuitive tools to build from a prompt, code, or project file. |
| 1826 | netlify | S | League of Legends launches to 100 million users. |
| 1827 | netlify | S | Anil built a sales agent in days, not months. |
| 1828 | netlify | S | Rapha’s team ships as often as they want, sometimes 10 times a day. |
| 1834 | netlify | N | 1.3M 1.3M |
| 1873 | postman | N | Onboard partners in days, not months |
| 1910 | postman | N | An agent in one checkout finds 129 services. With the Context Graph, it finds 498. |
| 1935 | postman | M | The AI-native gateway for AI, MCP, and API traffic, governing policy, identity, and scope at the edge.Explore Fabric→ |
| 1961 | prisma | P | The ORM is free, always |
| 1962 | prisma | P | Get started freeSee pricing |
| 1984 | prisma | Q | App and database on one platform in the same region, so queries stay low-latency and never leave the region |
| 1985 | prisma | P | Spend limits on every paid tier, so your bill stops where you tell it to |
| 2013 | prisma | N | Managed Postgres already wired to your schema and co-located with your app hosting, on infrastructure built for single-digit ms boot times. |
| 2014 | prisma | N | Unikernel microVMs on bare metal, single-digit ms boot |
| 2015 | prisma | P | Operation-based pricing with spend limits, no bill shock |
| 2029 | prisma | N | Co-located with Prisma Postgres, single-digit ms query latency |
| 2051 | prisma | P | Free Postgres tier with a hard cap, no credit card required |
| 2052 | prisma | P | Spend limits on every paid tier, so your bill never surprises you |
| 2054 | prisma | P | Prisma ORM is free, always |
| 2055 | prisma | P | A preview database per feature branch, no surcharge |
| 2065 | prisma | P | Database data transfer included |
| 2066 | prisma | P | Hard free-tier cap, no surprises |
| 2114 | prisma | P | Type-safe ORM, free and always will be |
| 2131 | railway | Q | Correct config. All the time |
| 2139 | railway | N | 100 Gbps internal networking without VPC configuration. |
| 2146 | railway | P | Take a single instance to a global deployment without picking instance sizes. Pay only for the CPU and RAM your code actually uses, with hard spending limits so there are no surprise bills. |
| 2152 | railway | P | Usage-based pricing, metered by the minute. No idle headroom to pay for. |
| 2169 | railway | O | Undo mistakes in seconds |
| 2254 | raycast | N | Plus thousands more... |
| 2256 | raycast | N | Browse thousands more |
| 2308 | raycast | N | 37k members |
| 2310 | raycast | N | 90k followers |
| 2326 | raycast | O | How we built the best emoji picker 🤖 |
| 2339 | raycast | N | Submit your extension to the Raycast Store and share it with thousands of users. |
| 2342 | raycast | C | StoreProTeamsPricingChangelogBrowser ExtensionDevelopersiOSWindowsRaycast 2.0API DocsManualTroubleshootingGuidesRaycast vs AlfredFAQ |
| 2354 | resend | O | The best way to reach humans instead of spam folders. Deliver transactional and marketing emails at scale. |
| 2355 | resend | S | Companies of all sizes trust Resend to deliver their most important emails. |
| 2356 | resend | O | A simple, elegant interface so you can start sending emails in minutes. It fits right into your code with SDKs for your favorite programming languages. |
| 2395 | resend | C | Prevent repeated sending to recipients who no longer want your email and comply with standards like the CAN-SPAM Act and others. |
| 2436 | temporal | S | Temporal named as 34th on AI 100 \| Read more › |
| 2440 | temporal | Q | The world’s best AI runs on Temporal |
| 2446 | temporal | Q | No lost progress, no orphaned processes, and no manual recovery required. |
| 2448 | temporal | Q | Temporal doesn’t work like anything you’ve used before. Watch how we guarantee the Durable Execution of your code in the face of any failure. |
| 2451 | temporal | Q | Create failproof apps using our SDKs |
| 2460 | temporal | Q | The Temporal Service persists the state of your application and has built-in retries, task queues, signals, and timers, to make sure your code always picks up where it left off. |
| 2476 | temporal | S | Global enterprises and top startups choose Temporal |
| 2477 | temporal | S | NVIDIA manages their GPU fleet across clouds with Temporal |
| 2479 | temporal | S | Salesforce migrated their monolith to Temporal |
| 2481 | temporal | S | Twilio left their homegrown systems for Temporal Cloud |
| 2483 | temporal | S | Descript improved their AI uptime with Temporal |
| 2492 | temporal | O | MIT-licensed, built in the open, and backed by a thriving developer community. |
| 2495 | temporal | M | Fully battle tested, 9 years in production |
| 2496 | temporal | N | Temporal was built with over 20 years of development from the minds behind AWS SQS, AWS SWF, Azure Durable functions, and the Cadence project that powers Uber. |
| 2499 | temporal | Q | Temporal is an open-source project that you are free to use and host in your own environment. You can also let us host the Temporal Service for you with Temporal Cloud. Either way, we never see your code. |
| 2501 | temporal | Q | Build invincible applications |
| 2533 | upstash | N | Handle hundreds of millions of vectors |
| 2548 | upstash | Q | Scale your messaging infrastructure without limits |
| 2578 | upstash | Q | Infinite lifespan with auto freeze/resume |
| 2580 | upstash | P | Usage-based pricing, pay only when active |
| 2599 | upstash | N | 400B |
| 2600 | upstash | N | 540M |
| 2601 | upstash | N | 15M |
| 2608 | upstash | P | Price scales to zero |
| 2627 | upstash | S | Upstash powers companies of every size and industry, from cutting-edge AI to everyday retail |
| 2650 | warp | P | Introducing Warp Learn: A free, hands-on course for building your own software factory Get Started → |
| 2720 | warp | M | Warp is enterprise ready |
| 2725 | warp | S | Docker uses Warp to reduce onboarding time and give every engineer a shared source of truth |
| 2774 | warp | P | usage-based, priced per agent run. |
| 2788 | warp | S | Product Hunt 4.8★ (82) |

### A2. Missed borderline claim lines (33)

The form is: cache line number, page, class letters, verbatim line.

| Line | Page | Class | Line text |
|---|---|---|---|
| 12 | clerk | O | Ever feel like authentication requirements change with the season? Clerk keeps up with the latest trends and security best practices. |
| 38 | clerk | O | Improve sign-up conversion rates and filter out spam/fraud with Magic Links. |
| 45 | clerk | Q | Clerk has all the features you need to onboard and manage the users and organizations of your multi-tenant SaaS application. |
| 47 | clerk | O | Powerful primitives to fully customize your app's authorization story. |
| 52 | clerk | O | Clerk's UI components add turn-key simplicity to complex Organization management tasks. |
| 69 | clerk | Q | No prompts to get stuck on, and results come back as JSON. |
| 75 | clerk | O | Clerk keeps developer experience front-and-center by providing helpful SDKs for most modern frameworks on web and mobile. |
| 147 | cloudflare | O | Compute close to users reduces network latency. |
| 155 | cloudflare | O | Our network is close to your users, applications, and sites. It optimizes all your traffic from source to destination for low latency. |
| 156 | cloudflare | O | Run at massive scale |
| 171 | cloudflare | Q | One stack of security and performance for every site — same DDoS mitigation, same global CDN, same network at every tier. You only pay for the depth your site needs. |
| 247 | cloudflare | O | Easy to use for both startups and the world’s largest enterprises. |
| 299 | convex | Q | The reactive backend platform that keeps up with you and your agents. Database, functions, workflow, sync, search, file storage, and more. All TypeScript, zero glue. |
| 308 | convex | O | We solved the hardest problems in computer science so you and your agent get it right from the start. |
| 336 | convex | N | We learned how to build and run distributed systems at exabyte scale so you don’t have to |
| 635 | docker | Q | An ecosystem engineered to minimize decision-making and eliminate danger. |
| 760 | drizzle | N | • our team is 10 devs, now you know |
| 1408 | drizzle | N | peak: 0 req/sec |
| 1503 | gitlab | O | Speed you can trust, |
| 1518 | gitlab | O | Be proactive with security built in, not bolted on |
| 1519 | gitlab | O | Scanning, policies, and approvals run inside the pipeline, not beside it. Findings land in the merge request, and the audit evidence writes itself as the change moves. |
| 1539 | gitlab | C | Federal security standards, air-gapped deployment, and compliance evidence by default. |
| 1766 | mongodb | O | Works seamlessly with your tech stack |
| 1816 | netlify | O | Deploy and run your app on solid infrastructure, with security features, scalability, and reliability built in. |
| 2030 | prisma | M | Long-running workloads: WebSockets, cron, background jobs (coming soon) |
| 2103 | prisma | Q | No. contract.prisma is yours, your data sits in standard Postgres, and you can migrate away whenever you want. Migration paths from Prisma to other tools are documented. |
| 2154 | railway | O | Agent-readable logs, metrics, and traces to increase iteration speed |
| 2376 | resend | N | Import your list in minutes, regardless the size of your audience. Get full visibility of each contact and their personal attributes. |
| 2445 | temporal | Q | Temporal Workflows automatically capture state at every step, and in the event of failure, can pick up exactly where they left off. |
| 2524 | upstash | Q | No server management required |
| 2563 | upstash | Q | Eliminate Function Timeouts |
| 2610 | upstash | P | Requests12,004 |
| 2671 | warp | N | 224 tasks · 0 active · 1,422 PRs shipped |

### A3. Missed testimonial lines (93)

The form is: cache line number, page, class letters, verbatim line.

| Line | Page | Class | Line text |
|---|---|---|---|
| 95 | clerk | T | Clerk's integration gives Supabase developers another incredible option for handling authentication. And the Clerk team are a pleasure to work with. |
| 96 | clerk | T | The best practices built-in to their <SignIn /> and <UserButton /> components would take months to implement in-house, yet no sacrifice is made in terms of Enterprise extensibility or customization to your brand. |
| 97 | clerk | T | We're big admirers of what the @clerk team are building and looking forward to working more closely with them. |
| 98 | clerk | T | This is why I like using an auth service like Clerk. |
| 99 | clerk | T | I rolled my own auth and this is the amount of code I needed just to setup 2 OAuth providers, magic link, credential login, account joining. I haven't even added forgot password flow yet, and my code is probably filled with vulnerabilities. |
| 101 | clerk | T | The @clerk CLI is really good |
| 102 | clerk | T | Authentication used to be such a nightmare, but the CLI makes things very easy |
| 104 | clerk | T | I really gotta give it to @clerk for providing the best/easiest integration to automatically set up auth for our users building applications on @predotdev . |
| 105 | clerk | T | Shout out to @brkalow and the team for making this a seamless experience for our users. |
| 108 | clerk | T | Using @clerk for my new form building project. Building authentication would be this easy and fun. No tutorials needed, the docs are overkill trust me. Generous FREE teir 🥹 |
| 110 | clerk | T | Was great though I didn't follow up with the SMS verification. Yeah, I used a webhook to connect Clerk with my Convex database. Next, I'll be building an online cloud storage website. I really love using Clerk , its simplicity is just mind-blowing. |
| 111 | clerk | T | Built the authentication for my boilerplate app using Clerk custom flows. Love having total control over the sign-in/sign-up flow! This video features a demo app, which I built using my boilerplate template. |
| 112 | clerk | T | I implemented authentication in my starter app using Clerk's custom flow setup, and it's been great having full flexibility over how users sign in and register. The video walks through a demo app built using my boilerplate template. |
| 113 | clerk | T | One of the best auth products. My first option when starting a new product |
| 114 | clerk | T | Best auth solution for startups? |
| 115 | clerk | T | 1) Clerk |
| 116 | clerk | T | 2) Firebase Auth |
| 117 | clerk | T | 3) Supabase |
| 118 | clerk | T | 4) Custom auth (💀) |
| 120 | clerk | T | What's the best auth for SaaS? |
| 121 | clerk | T | 1. Clerk |
| 122 | clerk | T | 2. Auth0 |
| 123 | clerk | T | 3. Supabase Auth |
| 124 | clerk | T | 4. Custom Auth |
| 125 | clerk | T | clerk is best auth, btw |
| 127 | clerk | T | Before moving to @clerk, we had working auth |
| 128 | clerk | T | After moving to Clerk, we also have:- Mobile support |
| 129 | clerk | T | - Auth on Vercel preview domains |
| 130 | clerk | T | - OAuth tokens that actually refresh |
| 131 | clerk | T | - Middleware-level auth validation (no more "sign in" button flash!) |
| 132 | clerk | T | - Organizations with built-in UI for adding users |
| 133 | clerk | T | - Google OAuth UI compliance (we were rejected for this for months, obnoxious)... |
| 160 | cloudflare | T | “For Shopify, the real challenge is not about how many different pieces of complex technology we can use but the opposite. Cloudflare helps us find a simple way to achieve something very complex that we can scale and maintain.” |
| 329 | convex | T | “Convex lets me build at the speed of AI.” |
| 332 | convex | T | “Convex is the all-in-one solution for building applications. Database, functions, client libraries, end-to-end type safety, observability, integrations. It’s everything.” |
| 334 | convex | T | “Convex is the promised land. This is what I’ve been waiting for.” |
| 447 | cursor | T | “My favorite enterprise AI service is Cursor. Every one of our engineers, some 40,000, are now assisted by AI and our productivity has gone up incredibly.” |
| 451 | cursor | T | “Cursor quickly grew from hundreds to thousands of extremely enthusiastic Stripe employees. We spend more on R&D and software creation than any other undertaking, and there's significant economic outcomes when making that process more efficient.” |
| 657 | docker | T | We chose Docker Hardened Images for its alignment with our supply chain security posture, developer tooling compatibility, and Docker’s maturity in this space. |
| 664 | docker | T | Docker Sandboxes have the best DX of any local AI coding sandbox I’ve tried. |
| 1437 | drizzle | T | I hate @DrizzleOrm so much that I wrote the Auth.js adapter for it. |
| 1439 | drizzle | T | @DrizzleORM is so good |
| 1441 | drizzle | T | I love @DrizzleORM |
| 1444 | drizzle | T | I love @DrizzleORM. |
| 1459 | drizzle | T | I have finally switched from @prisma to @DrizzleORM. |
| 1552 | gitlab | T | //GitLab is helping us catch security flaws early, and it's integrated into the developer's flow. |
| 1553 | gitlab | T | “An engineer can push code, get immediate feedback from cascading audit steps, and see if there's a vulnerability built in there.” |
| 1556 | gitlab | T | “As a result, the customer is receiving new capabilities sooner and with better quality.” |
| 1559 | gitlab | T | “Communications service providers choose us because we can deliver innovation at the speed their markets demand.” |
| 1562 | gitlab | T | “Our developers are experiencing meaningful productivity gains, freeing them up to focus on higher-value problem solving.” |
| 1565 | gitlab | T | “...by operating at DevOps speed and getting projects out to the cloud quickly, reliably, and with quality.” |
| 1567 | gitlab | T | //With GitLab CI/CD, we are able to complete 1.5 million builds every month. |
| 1568 | gitlab | T | “Using GitLab, our teams can work on the same project and share code within minutes.” |
| 1641 | grafana | T | "This platform is about extracting more information, more connectivity, more value...things that our SREs are beating down the door for us to do. [The constant product evolution] has kept us really excited and we continue to be excited." |
| 1740 | mongodb | T | “MongoDB and everything that comes with it was great. On MongoDB, we could automate our deployments and scalability monitoring, and we had advanced features like search charts and an online vector store that didn’t exist in the CouchDB ecosystem.” |
| 1744 | mongodb | T | “We use MongoDB as the core database for our services, so any new innovative idea or new service we build, we automatically say, ‘We’re going to use MongoDB as the core platform,’ knowing that it’s going to give us the reliability and the scalability that we’re going to need.” |
| 1748 | mongodb | T | “Managing both vector and operational data in MongoDB opened a new world to our team. By migrating operational data from PostgreSQL to MongoDB, we eliminated redundant processes and streamlined data queries.” |
| 1752 | mongodb | T | “Now that we have these automatic systems in place, we have more time. We can focus on providing value for both engineers at Coinbase and our end users.” |
| 1819 | netlify | T | “Netlify allows you to take your idea to execution within an afternoon, versus waiting for cycles, budget, and pulling in a whole team.” “Netlify allows you to take your idea to execution within an afternoon, versus waiting for cycles, budget, and pulling in a whole team.” |
| 2074 | prisma | T | “Prisma makes database management incredibly easy. Prisma's built-in type safety helps us avoid mistakes that happen with manual setups.” |
| 2076 | prisma | T | “We chose Prisma because it provides us with type safety directly from the database. It has helped us tremendously to catch possible errors early on.” |
| 2078 | prisma | T | “Prisma Postgres has really good DX. It's easy, simple, straightforward. I don't spend time on deployment. It just works.” |
| 2080 | prisma | T | “Prisma is the best ORM I have ever used, I never want to use anything else again. The excellent developer experience with its incredible TypeScript support sold me at first.” |
| 2082 | prisma | T | “Prisma has a low learning curve. Productivity becomes higher because it gets combined with end-to-end type-safety using TypeScript.” |
| 2086 | prisma | T | “We've proudly built the core of our APIs on top of Prisma, and we are very happy that we did. It doesn't make us jump through unnecessary hoops to get normal work done and generally just works.” |
| 2088 | prisma | T | “Prisma's approach to type-safe ORM is next-level. It provides full type-safety without any codegen or messy types and interfaces to write and maintain.” |
| 2090 | prisma | T | “Prisma is a professional enterprise-ready tool that is easy to start using, ramp up and scale. It is the type of tool developed for the software engineers of today.” |
| 2092 | prisma | T | “The combination of Prisma, TypeScript and our pretty thorough coverage with integration tests gives us the confidence to refactor critical parts of our code.” |
| 2176 | railway | T | "Services that took 1 week to configure elsewhere take 1 day to spin up in Railway. Messy networking like on other cloud platforms doesn't exist on Railway. If you understand basic TCP, you're all set." |
| 2183 | railway | T | Initial impressions on using @Railway is amazing. Zero config deployment if a Dockerfile is ready to use. Will check for a month on how it comes to the pricing and usage billing part. |
| 2184 | railway | T | I'm super bullish for the @Railway. They just started with their self-owned servers. and their new start-up program is super exciting, let's see how it develops in the future. |
| 2185 | railway | T | really gotta commend @Railway for allowing hard spending limits, I have never, ever seen this with any cloud provider. It's so refreshing to use a platform that isn't trying to extract maximal dollars from my wallet |
| 2186 | railway | T | I self-hosted @PlausibleHQ in one minute thanks to @juliaalvarez23 recommendation of Railway and I feel I need to tell everyone. I want to try it for a month and If everything works I will record a video. |
| 2189 | railway | T | i love how railway makes it super easy to just pull up your set up in front of someone and the architecture is communicated without saying a word. |
| 2285 | raycast | T | Raycast is incrementally turning my Mac into an AI-native operating system and I’m so here for it. |
| 2403 | resend | T | Resend is transforming email for developers. Simple interface, easy integrations, handy templates. What else could we ask for. |
| 2413 | resend | T | "As a developer I love the approach that the Resend team is taking. Its so refreshing. They are also extremely user-centric and helpful in terms of getting you up and running, sending beautiful emails that deliver." |
| 2415 | resend | T | "We value tools that feel stable, well thought out, and aligned with the standards we expect across our stack. Resend meets those expectations. It lets our team stay focused on building the larger platform rather than getting pulled into the overhead that typically comes with legacy email infrastructure." |
| 2417 | resend | T | "Our partnership with Resend has been a great experience. They've made sure we can focus on what we do best—building our product and growing our business." |
| 2421 | resend | T | "The simplicity and reliability of Resend allowed our engineers to focus on building features rather than troubleshooting email infrastructure." |
| 2423 | resend | T | "We're a small team with a lot on our plates. Email infrastructure is something we don't want to think about, and with Resend we don't have to." |
| 2425 | resend | T | "The best part about taking Resend into production was that there was no friction at all." |
| 2427 | resend | T | "The flexibility of Resend is what we value most. It allows us to quickly adapt and refine our email communications as our products evolve." |
| 2487 | temporal | T | Temporal's technology satisfied all of these requirements out of the box and allowed our developers to focus on business logic. |
| 2488 | temporal | T | Without Temporal's technology, we would've spent a significant amount of time rebuilding Temporal and would've very likely done a worse job. |
| 2628 | upstash | T | "At our scale, it's important to use the right tool for the right workload. Upstash lets us power low-latency edge use cases globally, while still keeping our overall architecture simple and cost-effective." |
| 2629 | upstash | T | "We launched and immediately saw significant demand. Upstash was one of those decisions that we made very quickly because it solved real scaling problems without slowing down the team." |
| 2632 | upstash | T | "The Upstash JS SDK is incredibly easy to use – all I needed to do was run npm install, initialize the Redis instance, and start running redis commands – super simple!" |
| 2633 | upstash | T | "We chose Upstash specifically because it offers an HTTP interface for Redis, which perfectly suited our needs" |
| 2634 | upstash | T | "Before Upstash we used Redis Cloud. This was not serverless, you had to think about instance size, memory usage etc. which we really don't want to do as it pulls our focus from product engineering, any time spent on operations like this is less time spent on our products and what differentiates Branch." |
| 2635 | upstash | T | "The ability to exceed the resident memory of the machine that Upstash has built opens up more possibilities, and allows reading and writing directly to Redis and skipping the middle-man" |
| 2636 | upstash | T | "We've been working closely together on improving alerting across their clusters, and it feels less like using a vendor and more like building the future of edge infrastructure together." |
| 2637 | upstash | T | "Since day one we haven't had to worry about traffic peaks. The interface is a pleasure to use and support has been amazing, especially when we hit limits." |

### A4. False hits: set hits with no label (73)

| Line | Page | Arms | Line text |
|---|---|---|---|
| 16 | clerk | 4 | Reduce fraudulent sign-ups and free trial abuse by blocking high-risk disposable email domains and restricting |
| 141 | cloudflare | 9,15 | Connect 2026 • The Agentic Conference of the Year • Oct 19-21 Register |
| 144 | cloudflare | 5 | Build, secure, and scale without managing infrastructure. |
| 164 | cloudflare | 5 | Everything needed tobuild secure, performant applications |
| 169 | cloudflare | 15 | Network & CDNSASE / Zero TrustCompute & Storage |
| 177 | cloudflare | 4 | See Free plan |
| 180 | cloudflare | 4 | /mo billed annually |
| 203 | cloudflare | 4 | Annual price per user |
| 204 | cloudflare | 4 | Unlimited CASB & DLPLogpush24/7 phone support |
| 254 | cloudflare | 5 | Fast path to AI adoption |
| 264 | cloudflare | 13 | Start building for free View docs |
| 376 | cursor | 5 | Secure codebase indexing |
| 392 | cursor | 9,15 | Learn about agentic development → |
| 417 | cursor | 11 | Worked for 14m 22s |
| 438 | cursor | 5 | GPT-5.6 Sol Extra High Fast |
| 512 | datadog | 9 | Outpace AI-powered attacks with unified security and observability |
| 577 | datadog | 9 | Defend against AI-powered attacks |
| 595 | docker | 5 | Docker \| Secure Sandboxes for AI Agents |
| 600 | docker | 5 | Ship with secure, enterprise-ready images |
| 624 | docker | 5 | Docker creates secure environments so that |
| 641 | docker | 5 | Agents move faster when they don’t have to ask permission. Give each sandbox only the MCP servers it needs. Keep your keys on the host, and let it run. |
| 661 | docker | 1 | San Francisco6.4M18% |
| 662 | docker | 1 | Frankfurt5.1M11% |
| 663 | docker | 1 | Singapore7.8M31% |
| 669 | docker | 3 | Fortune 500 companies that run on Docker |
| 692 | docker | 9,15 | The Trust Layer: Securing Agentic AI with Docker AI Governance |
| 1374 | drizzle | 5 | More ways to query relations, smaller PostgreSQL migration snapshots, and fixes across drivers and dialects. |
| 1474 | gitlab | 9,15 | GitLab - Speed with control for agentic software engineering |
| 1482 | gitlab | 9,15 | Agentic AI & Context |
| 1505 | gitlab | 9,15 | Agentic software engineering for your team |
| 1507 | gitlab | 9,15 | Scaling Git for the agentic software factory |
| 1571 | gitlab | 5 | GitLab 19.5: Connect agents, secure secrets, and route reviews |
| 1572 | gitlab | 5 | Connect any MCP-compatible agent to GitLab, keep secrets under your existing permissions, and get every merge request to the right reviewer, faster. |
| 1574 | gitlab | 9,15 | Why GitLab's CEO believes the winners in the agentic software era will be the ones who solve for trust, not just speed. |
| 1590 | grafana | 9,15 | Full-stack observability for the agentic era \| Grafana Labs |
| 1629 | grafana | 9 | Learn how teams are using observability to confidently operate AI-powered systems at scale. |
| 1631 | grafana | 9,15 | Everything announced at ObservabilityCON 2026 in one place: agentic operations, full-stack context, and cloud economics. |
| 1638 | grafana | 9 | AI-powered workflows, new Grafana capabilities, and what’s coming next in open source observability. Everything announced at GrafanaCON 2026 in one place. |
| 1679 | mongodb | 9 | AtlasBuild with the intelligent data platform |
| 1680 | mongodb | 5 | DatabasePower critical apps with real-time dataSearchDeliver fast, relevant search at scaleVector SearchBuild AI apps with accurate contextVoyage AIEmbed meaning and rerank resultsAtlas Agent EngineBuild, deploy, and govern agents in production |
| 1708 | mongodb | 9 | Combine real-time operational data, vectors, and elastic scale in a single intelligent data platform built on the document model—deploy across any cloud or your own infrastructure. |
| 1710 | mongodb | 5 | Access the tools, guides, and training you need to build faster and smarter with MongoDB. |
| 1714 | mongodb | 9 | Learn to build intelligent apps with AI tools and our AI partner ecosystem. |
| 1718 | mongodb | 9 | The multi-cloud, intelligent data platform for any use case |
| 1723 | mongodb | 5 | Build scalable event-driven applications that react and respond in near real-time. Atlas Stream Processing unifies the developer experience, enabling you to work with high-velocity data streams from sources like Apache Kafka using the same familiar MongoDB Aggregation Pipeline stages you use for your database. |
| 1733 | mongodb | 9 | Elevate your applications by leveraging MongoDB's native graph data support. Efficiently analyze relationships between data entities in your collections for pattern discovery and intelligent predictions. It’s ideal for powering recommendation systems, fraud detection mechanisms, and managing networks. |
| 1769 | mongodb | 9 | The Intelligent Data Platform for Builders |
| 1804 | netlify | 1 | Visitors 48,210 12% this week |
| 1805 | netlify | 1 | Pageviews 312,904 8% this week |
| 1870 | postman | 5 | Secure API access for agents and humans |
| 1924 | postman | 5 | Diagram: a caller presents a credential reference; the Secure Access Proxy swaps it for the real secret inside your cloud, brokers the API call, and attributes it to the caller. |
| 1977 | prisma | 5 | Bandwidth bills that scale faster than your traffic |
| 2012 | prisma | 2 | feat-authbooted 7ms |
| 2026 | prisma | 2 | boot 7msp50 3.8ms |
| 2138 | railway | 5 | Private, fast connections by default |
| 2250 | raycast | 5 | Need to know something fast? Google it straight from Raycast. |
| 2399 | resend | 5 | Protect your reputation by verifying your identity as a legitimate sender. Secure your email communication using DKIM and SPF. |
| 2466 | temporal | 5 | Develop agents that survive real-world chaos, reliable MCP & orchestrate training pipelines. |
| 2553 | upstash | 9 | Intelligent Retry Mechanism |
| 2558 | upstash | 5 | Workflow: Durable, reliable and performant serverless functions |
| 2572 | upstash | 5 | Box: Secure cloud containers for AI agents |
| 2574 | upstash | 5 | Secure, isolated cloud containers |
| 2612 | upstash | 4 | Cost$0.02 |
| 2652 | warp | 9,15 | Warp FactoriesOpen infrastructure for software factoriesWarp TerminalA modern terminal for agentic codingWarp Agent CLIA powerful coding agent that works in any terminal |
| 2670 | warp | 1 | [ fig. t4 · the factory ]8 × 28 · live |
| 2681 | warp | 7 | 04RunnersRunner files define the compute and operating system used by agent runs. This Linux runner supplies a repeatable x86-64 environment and setup commands. Runners support Mac and Windows as well as self-hosted setups |
| 2708 | warp | 2 | 1.00x |
| 2709 | warp | 2 | Claude Fable 5pass1.00x |
| 2710 | warp | 2 | GPT-5.6 Solpass0.94x |
| 2711 | warp | 2 | Gemini 3.6 Flashfail0.89x |
| 2714 | warp | 1 | prompts tunedpass+3.2% |
| 2743 | warp | 3 | [ fig. t6 · agents · live roster ]3 agents |
| 2751 | warp | 9,15 | Warp is an open agentic development platform that was built to work wherever and however you work. |
