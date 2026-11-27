---
title: Precision of the MKT-CLAIM-02 outcome and unit arms, and what the set misses
program: product
topic: marketing-claims-evidence
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 12
---

# Precision of the MKT-CLAIM-02 outcome and unit arms, and what the set misses

Question (from `product-resume/wave2/marketing-claims-evidence/q0.md`): what precision do the unclassified MKT-CLAIM-02 arms (outcome words, 131 hits; units, 85 hits) reach on the exemplar corpus, and which real claims does the whole set miss?

This is the repaired version of the artifact. Three things changed from the first version, and the numbers below are the re-run ones:

1. Every hand label is now an explicit list in a script that anyone can run (`labels2.py`, shown in the appendix with its full output). In this round every false hit line of every arm was printed and re-read against its neighbours; the first version carried the classification from wave 1 and from an unshown script.
2. The re-read changed three results. Arm 8 (maturity grades) drops from 6 of 6 to 4 of 6, because "world-class product teams" describes customers. The wave-1 second-pass count of 30 extra missed lines reproduces as 26, because two bare Cal.com demo size selectors (`2001+`, `500+`) are UI and not claims, and the other two cannot be rebuilt. The union precision moves from 90.2 % to 89.6 %.
3. The MKT-CLAIM-06 change proposed in the first version is withdrawn. It was tested on the cached HTML and fails (section "MKT-CLAIM-06: three chart-coverage wordings, tested").

Corpus: 26 exemplar home pages, fetched and extracted on 2026-11-27, stored at `~/.cache/research-lang/exemplars/product/mkt-claim-02-remeasure/exemplars.txt` (format `site:line text`). Work files of this round: `~/.cache/research-lang/exemplars/product/wave2/q0/`. Nothing in any repository was changed. All figures from vendor pages are vendor data.

## Answer

1. **Outcome-word arm (line 5): 90.8 % line precision, 119 real of 131 hits.** By unique text 106 of 118 (89.8 %). The 12 false hits are listed below.
2. **Unit arm (line 2): 92.9 %, 79 real of 85 hits** (91.2 % by unique text, 62 of 68). The 6 false hits are 3 demo-UI scheduling strings on Cal.com and 3 decorative multiplier cards on Tailwind.
3. **All ten arms: 292 of 326 hit lines are real (89.6 %).** Per arm below.
4. **The set misses about as many real claim lines as it finds.** A wide second sweep over the 5,471 lines no arm hits found 241 real claim lines. Recall is at most 292 / (292 + 241) = **54.8 %** on this corpus (upper bound: the sweep is finite, one reader classified it).
5. **The misses are mostly numbers the unit and count arms cannot see** (135 of 241, 56 %): `100k+`, `1.6M+`, `1.76s`, `48,243 req/s`, `600 KB`, and free-tier limits such as "Up to 10 sites". Five new arms catch 107 of the 241 (44 %) at 90.7 % precision, so recall on this corpus rises to 399 / 533 = 74.9 %. That figure is in-sample (the arms were written after reading these misses). It is not a recall estimate for other pages.

## Vendor claims re-fetched this round

The first version cited only cache lines. Each claim below was fetched from the live page on 2026-11-27. The tool summarises a page, so the quoted text is as the fetch tool returned it; three claims the summary missed were re-fetched with `curl` and read in the raw HTML (commands after the table). All are vendor data, in the vendor's own words.

| Claim as quoted in this file | Live page | Date shown on the page |
|---|---|---|
| "10-100x faster than pip" | [docs.astral.sh/uv](https://docs.astral.sh/uv/): `[10-100x faster](https://github.com/astral-sh/uv/blob/main/BENCHMARKS.md) than pip.` The link goes to a benchmark page | "March 13, 2026" |
| "100k+ GitHub stars", "400k+ Monthly active users", "Trusted in production by teams at", "3.66× faster npm installs since Deno 2.8" | [deno.com](https://deno.com/) | "Copyright © 2026 Deno Land Inc." |
| "Up to 3 sites", "Up to 10 sites", "Up to 3 team members", "Up to 10 team members", "54 times smaller than Google Analytics", "trusted by thousands of organizations" | [plausible.io](https://plausible.io/): "Growth plan: Up to 3 sites", "Business plan: Up to 10 sites" | "running since 2018" (no page date) |
| "as small as 600 KB" | [tauri.app](https://tauri.app/): "the size of a Tauri app can be as small as 600 KB" | "© 2026" |
| "18 regions", "1.6M+ organizations", "53% of app deployments done by agents" | [fly.io](https://fly.io/) | none |
| "80k+ Github Stars", "Trusted by the world's best software teams" | [vite.dev](https://vite.dev/) | "ViteConf 2026 ... October 15" |
| "150k+ users have their best day ever on Stripe", "150 countries", "99.9999% uptime", "Less than 3 months" | [stripe.com](https://stripe.com/) | "© 2026 Stripe, LLC."; the uptime line refers to Black Friday to Cyber Monday 2025 |
| "random seeks went from 41.2µs to 3.4µs (12x)", "The world's fastest IDE", "Trusted by world-class developers & industry leading teams" | [zed.dev](https://zed.dev/) | blog dates 2026-08-12 to 2026-11-17 |
| "Why is Ruff a gamechanger? Primarily because it's nearly 1000x faster. Literally. Not a typo." (quoted tweet of Nick Schrock) | [astral.sh](https://astral.sh/) | the quote is undated; the page lists 2026-03-19 and 2025-12-16 items |
| "6,000+ hours saved per week"; "fastest-growing companies use Cal.com for scheduling"; "99.99% uptime SLA" | [cal.com](https://cal.com/) (curl, below) | none |
| "Over 2 million databases created, one for every prompt and every version of every user-built app" | [turso.tech](https://turso.tech/) (curl, below) | none |
| "Private Alpha" label | [supabase.com](https://supabase.com/) (curl, below); the WebFetch summary reported "SOC2 Type 2 compliant" and no "Private Alpha" | none |

```
cd /tmp; for u in https://turso.tech/ https://supabase.com/ https://cal.com/; do echo "## $u"; curl -sL -m 30 -A 'Mozilla/5.0' "$u" -o /tmp/p.html -w '%{http_code} %{size_download}\n'; /usr/bin/grep -o -i -E '.{0,50}(databases created|Private Alpha|99\.99% uptime SLA|99\.9% uptime SLA|fastest-growing companies).{0,40}' /tmp/p.html | head -4; done
## https://turso.tech/
200 154314
 text-lg font-semibold text-white">Over 2 million databases created, one for every prompt and every version
## https://supabase.com/
200 1354339
ce-75 text-foreground-light border border-strong">Private Alpha</div></div><p class="line-clamp-2 leadi
## https://cal.com/
200 793940
-4 text-center text-muted-foreground text-sm">The fastest-growing companies use Cal.com for scheduling</p><ul class
in="round" stroke-width="1.8"></path></svg></span>99.99% uptime SLA</li><li class="flex items-center gap-2.
```

Two observations from the fetches. First, the WebFetch summary of cal.com returned "99.9% uptime SLA (99.99% on request)" while the raw HTML carries a list item `99.99% uptime SLA`. Both can be on the page; a summary is not a transcript, and the raw HTML was the source for the corpus. Second, most of these pages show no date next to the figure (see the third column), which is why every claim record needs `observed`. The claims not in this table (Neon "100 free projects", Stripe "200m+", Bun `1.76s` and `48,243 req/s`, 20 Zed extension download counts, Svelte, Linear, Vercel and Tailscale lines) are quoted from the cached extraction only; they were not re-fetched, and their cache lines are given where used.

## Per-arm precision (measured 2026-11-27, re-read this round)

Arm numbers are the line numbers of the MKT-CLAIM-02 code block (1 percent and multiplier, 2 units, 3 counts, 4 prices and free, 5 outcome words, 6 compliance words, 7 social proof, 8 maturity grades, 9 AI words, 10 comparison). "Real" means the line states an objective claim, or a figure or word a claim record must cover, about the product, its customers or its quoted endorsers. "False" means a UI mock-up, a feature or navigation name, a method caption, or a word that makes no claim about the product.

Command and output (script `labels2.py`, full text in the appendix; hit lists come from `grep -n -i -E` of each arm over `exemplars.txt`, `/usr/bin/grep` because a shell hook on this machine rewrites `grep`):

```
$ python3 -I labels2.py | head -12
arm hits false real precision uniq-hits uniq-real uniq-precision
  1   40   8   32  80.0%   37   30  81.1%
  2   85   6   79  92.9%   68   62  91.2%
  3   10   4    6  60.0%   10    6  60.0%
  4   40   2   38  95.0%   34   32  94.1%
  5  131  12  119  90.8%  118  106  89.8%
  6   12   0   12 100.0%   12   12 100.0%
  7   20   2   18  90.0%   20   18  90.0%
  8    6   2    4  66.7%    5    4  80.0%
  9    1   0    1 100.0%    1    1 100.0%
 10    1   0    1 100.0%    1    1 100.0%
union hits 326 false 34 real 292 89.6%
```

The hit counts independently reproduce with the commands of the first version (`/usr/bin/grep -c -i -E -f arm$i.txt exemplars.txt` gives 40 85 10 40 131 12 20 6 1 1 and 326 for the union). The per-arm false counts sum to 36, the union false count is 34: two lines are hit by several arms and are false in each (for example stripe 3904, which arms 1, 4 and 5 all hit). The first version reported 32 false.

### The false lines of every arm, re-read in this round

Each line was printed with its neighbours (`sed -n` over `exemplars.txt`) and judged. Line numbers are `exemplars.txt` numbers.

| Arm | False lines | Why |
|---|---|---|
| 1 percent | cal 1043, 1046, 1049, 1052, 1065; posthog 3166; stripe 3727; vercel 5168 | Cal.com demo dashboard ("0% from last period", "164 bookings ... 18% more"), PostHog "1.5×IQR" box-plot caption, Stripe fraud-check mock-up "Risk profile complete 100%", Vercel demo chat "EMEA grew 18%". Astro 152-164 stay real: they are a vendor chart of Core Web Vitals pass rates with a dataset link |
| 2 units | cal 953, 1003, 1136; tailwind 4595, 4597, 4599 | Cal.com demo scheduling UI; Tailwind template cards "6.4x / 4.2x / 2.7x" under "Render time performance" with no product referent |
| 3 counts | bun 469, 470, 560, 664 | method captions ("25 direct dependencies, ~220 packages in the lockfile", "32 clients broadcasting") |
| 4 prices | astro 176; posthog 3223 | a merch price "$25.00" for a cap; the joke line "get $0 off your first order" |
| 5 outcome | cal 991; supabase 4016; linear 2323; stripe 3880, 3904, 3694; tailscale 4482; fly 1980; cal 1154, 1313; uv 4981; nextjs 2737 | describes customers or a market ("fastest-growing companies", "fast moving teams", "steeper growth"), a verb ("secure and govern your AI workloads"), a negated mode ("no faster mode that skips it"), a feature name ("Instant meetings"), the user's projects ("scalable projects"), agent-facing doc text |
| 7 social proof | bun 615; linear 2290 | "Memory used by the same servers", "Clean up deprecated APIs used by the rider app" |
| 8 maturity | linear 2089, 2096 | "Linear is shaped by the practices and principles of world-class product teams": the grade describes customers. Changed from the first version |
| 6, 9, 10 | none | all 14 lines are claims (SOC 2 / HIPAA / ISO 27001 badges, "AI-powered support", one quoted testimonial) |

Three of the 12 arm-5 false hits (`fast-growing`, `fastest-growing`, `fast moving`) would disappear with the filter `fast(est)?[- ](growing|moving)`. The rest are not worth a filter; MKT-CLAIM-01's `[[allow]]` table covers non-claim hits.

Single-reader caveat. One reader (this worker) classified every line; there was no second rater. Where a call is arguable, the direction does not change: the arm-1 Astro chart, Tailwind's three cards and the two Linear lines are the borderline ones. There are 5 borderline lines each way (Astro 5 real, Tailwind 3 and Linear 2 false). Flipping all of them gives a union of 287 to 297 real of 326 (88.0 % to 91.1 %) and a recall bound of 54.4 % to 55.2 %.

### What the 79 real unit hits are

Count by site (`grep -n -i -E -f arm2.txt exemplars.txt | cut -d: -f2 | sort | uniq -c`; the six false lines above are included in these counts):

```
4 astral   1 biome   40 bun   3 cal   17 deno   5 ruff   1 stripe   1 supabase   1 tailscale   3 tailwind   2 uv   7 zed
```

Removing the 6 false lines leaves bun 40, deno 17 (57 chart cells), zed 7, ruff and astral 9, uv 2, others 4 (biome, tailscale, stripe, supabase): 79. 57 of the 79 are bare chart or table cells (`12 MB`, `251ms`); 9 are third-party quotes ("nearly 1000x faster", "~150-200x faster than flake8"), which the arm correctly fires on, because a quoted figure needs an endorsement record (MKT-CLAIM-20).

## What the whole set misses

### Method, with commands and output

```
S=~/.cache/research-lang/exemplars/product/mkt-claim-02-remeasure; W=~/.cache/research-lang/exemplars/product/wave2/q0
$ wc -l $S/exemplars.txt $S/fleet2.txt $W/unmatched.txt
  5797 exemplars.txt
  2043 fleet2.txt
  5471 unmatched.txt
$ cut -d: -f1 $S/exemplars.txt | sort -u | wc -l
26
$ /usr/bin/grep -v -i -E -f $S/new.txt $S/exemplars.txt > $W/unmatched.txt      # lines no arm hits
$ /usr/bin/grep -c -i -E -f $W/cand.txt $W/unmatched.txt                          # first sweep, 8 candidate patterns
435
```

1. `cand.txt` holds eight patterns: figures with units the set lacks, comparatives with `than`, superlatives, absolutes, privacy and security words, vague outcome words, trust words, and count nouns the set lacks.
2. All 435 candidate lines were read in context. 215 were real. `classify.py` holds the line numbers of the 215 by class and prints their counts (output: `Counter({'N': 113, 'O': 30, 'S': 29, 'Q': 19, 'P': 10, 'C': 10, 'M': 4}) 215`, then `cand 435 labelled not in cand: []`).
3. A second pass runs six targeted patterns (compact figures, a `+` suffix, free and limit phrases, trust phrases, vocabulary, zero/never nouns) over the 5,471 - 435 lines the first sweep did not flag, and lists every hit that is not already labelled. The output of that listing in this round:

```
P2 N+ token       676 bun 40+ utilities | 822 cal 2001+ | 984 cal 500+ | 1045 cal 6,000+ hours saved per week | 1048 cal 2+ days of build time saved per customer
                  1052 cal 40+ countries covered | 2292 mise 1,000+ tools | 2711 plausible 600+ API/MCP calls/hr | 2831 posthog 1000+ sources | 2939 posthog (a sentence)
                  2948 posthog 1000+ more sources | 3503, 3509 stripe 135+ | 3528 stripe 5+ | 3530 stripe 700+ | 4130 tailscale 1,000+
P3 free/limit     1106 cal "List yours for free." | 1737, 1839 fly "Start free" | 2660 plausible "try Plausible for free" | 2687, 2698 plausible "Up to 3/10 team members"
                  3423 sentry "Try Sentry for Free" | 4425 turso "Start for free now" | 4473 turso "Try Turso Cloud for free"
P5 trust          37 astral "Powering impactful projects" | 1923 linear | 3515 stripe | 3777, 3781 supabase "Powering millions of AI-generated apps" | 5029 vite "Powering your favorite frameworks"
```

Judgement on that list: cal 822 and 984 are the team-size selector of a demo form (`201-1000`, `2001+`, `Under 50`, `500+`) and are not claims; cal 2+ days (1048) is a customer story figure and counts; posthog 2939 is a sentence with a version-like `+` in a tool list, not a claim; astral 37 and vite 5029 are decorative and not claims. That leaves 13 real P2 lines, 9 real P3 lines and 4 real P5 lines: 26 extra real lines. The first version reported 30 extra lines from this pass but did not keep the list; it cannot be reproduced, and 26 is the number with a visible basis.

Result: **241 real claim lines missed (215 + 26), against 292 real lines hit.** The true miss count is above 241, because the second pass is itself finite.

### Misses by class

Output of the per-class count:

```
missed by class {'N': 135, 'S': 33, 'Q': 19, 'O': 30, 'P': 10, 'C': 10, 'M': 4} total 241 241
recall bound 292/(292+241) = 54.8%
```

| Class | Missed lines | Examples (cache line in `exemplars.txt`) |
|---|---|---|
| N numbers, counts, limits, free-tier boundaries | 135 | bun `1.76s` (459), `48,243 req/s` (515); deno "100k+ GitHub stars" and "400k+ Monthly active users" ([deno.com](https://deno.com/)); fly "18 regions", "1.6M+" ([fly.io](https://fly.io/)); plausible "Up to 3 sites" (2891), "Up to 10 sites" (2904), "Paying subscribers 22k" (2828) ([plausible.io](https://plausible.io/)); neon "100 free projects with Database, Storage, Functions & Auth" (2669); stripe "200m+" (3743), "150 countries", "Less than 3 months" ([stripe.com](https://stripe.com/)); tauri "as small as 600 KB" ([tauri.app](https://tauri.app/)); turso "in under a minute" (4771), "Over 2 million databases created" ([turso.tech](https://turso.tech/)); vite "80k+ Github Stars" ([vite.dev](https://vite.dev/)); zed 20 extension download counts; cal "From 12s to <2s page loads" (1151) |
| S endorsement and social proof outside the arm | 33 | 12 Tailscale tweets, 7 Supabase tweets, Vite and Turso quotes, stripe "150k+ users have their best day ever", deno "Trusted in production by teams at", "Powering millions of AI-generated apps" (supabase 3777) |
| O outcome vocabulary not in the set | 30 | "seamlessly", "powerful", "intelligent automatic prefetching" (astro 220), "Safe automation" (neon 2621), "The world's most advanced", "the only application monitoring platform", "deploys quickly", "Switching is easy" |
| Q universal and absolute claims | 19 | "Zero JavaScript, By Default" (astro 184), "Zero Lock-in" (astro 167), "Zero-downtime deploys" (fly 1846), "guaranteed delivery" (supabase 3983), "zero latency" |
| P privacy and security mechanism or attestation | 10 | "Per-database encryption with customer-held keys" (turso 4797), "Data Privacy Framework" (cal 1410), "Zero Trust Networking" (3) |
| C comparison, compatibility, replacement | 10 | "More elegant than Calendly, more open than SavvyCal" (cal 1174), "Drop-in parity with Flake8, isort, and Black" (ruff 3265), "drop-in replacement for Node.js" |
| M maturity and AI labels | 4 | "Private Alpha" (supabase 3973, [live label](https://supabase.com/)), "Agentic Infrastructure" (vercel, 3 lines) |
| **Total** | **241** | |

Two misses are gaps between rules. MKT-CLAIM-18 names "agentic" and "intelligent" as AI-capability labels, but only `AI-powered` and `powered by AI` are in line 9 of MKT-CLAIM-02, which triggers the gate. A page can say "agentic" without the lint seeing it. The measured fix is in the MKT-CLAIM-18 row below.

### Why the existing arms miss the numbers

| Cause | Example the arm cannot match | Reason |
|---|---|---|
| Unit not in the list | `1.76s`, `41.2µs`, `600 KB`, `48,243 req/s` | line 2 allows `x ms MB GB seconds minutes` only |
| Suffix instead of unit | `100k+`, `1.6M+`, `200m+`, `22k` | line 3 needs a listed noun directly after the number |
| Noun in between | "100k+ GitHub stars", "18 regions", "over 2 million databases" | line 3 noun list is closed and has no slot for a modifier |
| Free-tier phrasing | "100 free projects", "Up to 10 sites", "Start free" | line 4 matches only `free (tier|plan|trial|forever)` |
| Trust phrasing | "Trusted in production by", "Powering millions of" | line 7 needs the exact string `trusted by` |

## Candidate new arms, measured

Five arms, tested on the 5,471 unmatched exemplar lines (`add.txt`) and on the fleet corpus (`fleet2.txt`, 2,043 lines, fences and `<style>` stripped as in wave 1). "Real" is membership in the labelled missed set (215 + 26). Output of `labels2.py` for these arms:

```
arm11: hits 40 real 35 false 5 precision 87.5%
   false 309 biome:0.00s | 311 biome:0.00s | 458, 459 bun "bombardier -c 50 -d 5s" | 3315 sentry "N+1s"
arm12: hits 39 real 35 false 4 precision 89.7%
   false 822 cal:2001+ | 984 cal:500+ | 2934 posthog "tried us out 2+ years ago" | 2939 posthog sentence
arm13: hits 19 real 19 false 0 precision 100.0%
arm14: hits 5 real 5 false 0 precision 100.0%
arm15: hits 15 real 13 false 2 precision 86.7%
   false 3642, 3657 stripe "Agentic Commerce Protocol"
new union: hits 118 real 107 90.7%
in-sample recall (hit_real+new real)/(hit_real+missed) = 399/533 = 74.9%
```

Fleet check (the first version showed counts only; this is the command and output):

```
$ for i in 1 2 3 4 5; do sed -n ${i}p $W/add.txt > $W/a$i.txt; echo "a$i unmatched-exemplar $(/usr/bin/grep -c -i -E -f $W/a$i.txt $W/unmatched.txt) fleet $(/usr/bin/grep -c -i -E -f $W/a$i.txt $S/fleet2.txt)"; done
a1 unmatched-exemplar 40  fleet 0
a2 unmatched-exemplar 39  fleet 1
a3 unmatched-exemplar 19  fleet 0
a4 unmatched-exemplar 5  fleet 0
a5 unmatched-exemplar 15  fleet 0
$ /usr/bin/grep -n -i -E -f $W/a2.txt $S/fleet2.txt
327:grimoire-rs/grimoire/README.md:39:On Windows (PowerShell 7.4+):
$ /usr/bin/grep -n -i -E -f $W/a2.txt $W/unmatched.txt | /usr/bin/grep -E '\b[0-9]+\.[0-9]+\+'
(no output)
```

The only fleet hit is a version floor, not a claim. The version-floor filter `[0-9]+\.[0-9]+\+` removes it and removes no exemplar arm-12 hit (second command: no output), so the filter is safe on this corpus.

| New arm | Pattern | Exemplar hits | Real | Precision | Fleet hits |
|---|---|---|---|---|---|
| 11 compact figures | `\b[0-9]+([.,][0-9]+)? ?(µs\|μs\|ns\|KB\|kB\|TB\|req/s)\b\|\b[0-9]+([.,][0-9]+)?s\b` | 40 | 35 | 87.5 % | 0 |
| 12 plus-suffix counts | `\b[0-9][0-9,.]*[kKmMB]?\+` | 39 | 35 | 89.7 % | 1 |
| 13 limits and free | `\bup to [0-9]\|\bfree (to start\|projects\|of charge)\|\b(start\|starts\|get\|try) (for )?free\b\|\bfor free\b\|\balways (be )?free\b\|\bstarts at \$` | 19 | 19 | 100 % | 0 |
| 14 trust phrasing | `\btrusted in production by\b\|\bpowering (millions\|thousands\|businesses\|the companies)` | 5 | 5 | 100 % | 0 |
| 15 labels | `\bagentic\b\|private alpha\|zero[- ]trust\|drop-in` | 15 | 13 | 86.7 % | 0 |
| union | | 118 | 107 | 90.7 % | 1 |

Gain: 107 of the 241 missed lines. The remaining 134 are not number-shaped: testimonials, vague outcome vocabulary, absolute quantifiers, comparisons. A pattern cannot catch them at useful precision; the testimonial subset has one regular marker, the author handle line (below, under MKT-CLAIM-20).

Arm 13 overlaps MKT-CLAIM-13, whose verify already matches every `free` hit. The overlap is intended.

## Rule 08 on the real outcome hits (command and output)

```
$ python3 -I labels2.py | /usr/bin/grep '^arm5 real'
arm5 real 119 mechanism token same/next line 2 [(1572, 'deno:A faster package manager'), (4967, 'uv:An extremely fast Python package and project manager, wri')] digit on line 19
```

The token regex is `sha256|digest|signature|Sigstore|SBOM|attestation|TLS|AES|lockfile|cache|--[a-z-]+|` and a backtick (case-insensitive), applied to the line and the next line. Only 2 of the 119 real arm-5 lines carry a mechanism token on the line or the next, and 19 carry a digit. The 2 matches are next-line hits (a following feature line), so the true count of lines whose own sentence states a mechanism is lower. The visible-text extraction drops link targets, and rule 08 accepts a link, so 2 of 119 is a lower bound. It shows what the gate does to market-standard copy: the outcome word nearly always stands alone, so an agent that copies the exemplar style produces text the gate blocks.

## MKT-CLAIM-06: three chart-coverage wordings, tested

The first version proposed that one link in a chart's `<figcaption>`/`<caption>` covers all values in it, because 57 of the 79 real unit hits are bare chart cells. That was "a design choice, not a measurement". It is now measured on the cached HTML (`html/*.html`, 26 pages). The scripts are `cap06.py`, `cap06b.py`, `cap06c.py` (parsed with Python's `html.parser`, script, style and svg removed, `python3 -I`). A "value" is a text node matching arm 2 of MKT-CLAIM-02.

```
$ python3 -I cap06.py            # old rule: an <a href> within 300 characters; new rule: old OR link inside a figcaption/caption of the enclosing figure/table
astral 4 0 0 | biome 1 0 0 | bun 54 2 2 | cal 4 0 0 | deno 27 0 0 | ruff 4 0 0 | stripe 1 1 1 | supabase 1 1 1 | tailscale 1 0 0 | tailwind 3 0 0 | uv 16 15 15 | zed 8 0 0
TOTAL [124, 19, 19]
$ python3 -I cap06b.py           # method-like link (href or text matching reproduc|method|benchmark|bench) in the nearest K ancestors
K=2: 2 of 124 | K=4: 2 of 124 | K=6: 41 of 124 (bun 24 of 54, uv 16 of 16, biome 1) | K=8: 44 of 124 (bun 25, deno 1)
$ python3 -I cap06c.py           # group values under the smallest ancestor holding >= 3 values; method link in the group or its parent
variant C: 18 of 124 values covered (bun 0 of 54 in 16 groups, deno 2 of 27 in 9 groups, uv 10 of 16, zed 4 of 8)
```

Findings. The caption wording adds nothing: 19 of 124 values pass under both the old and the proposed rule. The reason is in the markup. Bun puts its `reproduce` link in a header block beside the chart, and its `<caption>` sits in a `visually-hidden` table with method text and no link; Deno's `<figcaption>` elements are empty. Widening to K ancestors helps only where one site's markup happens to nest the link, and the best result (K=6, 41 of 124) is an artefact of Bun's layout. Grouping by value density (variant C) is worse. The per-value 300-character rule therefore flags 105 of 124 chart values on this corpus (27 Deno values have no link within 300 characters, which is a real finding of the rule), and I found no structural wording that cuts the noise without hiding real misses. The first version's change is withdrawn; see the Effect section.

## Effect of the MKT-CLAIM-18 trigger (measured)

The first version's MKT-CLAIM-18 change was a prose sentence. The measurable change is to widen line 9 of MKT-CLAIM-02 so the gate fires on every word rule 18 covers. Output of the test (appended to `labels2.py`):

```
new arm 9 on exemplars: hits 9 false 4 real 5 | old arm 9 hits 1 | real hits caught by arms 1-10 today: 1
new arm 9 on fleet2: 0
   220 intelligent | astro:Optimize page loading with intelligent automatic prefe...
   3867 AI-powered | stripe:With AI-powered support, rich documentation...
   3880 agentic | stripe:Our annual letter explores the trends defining the in...
   3898 Agentic | stripe "Agentic Commerce Protocol"   3904 agentic | stripe (letter)   3916 Agentic | stripe "Agentic Commerce Protocol"
   5036, 5132, 5236 Agentic | vercel "Agentic Infrastructure", "Is Agentic"
```

With `\b` a nav string `AgenticCommerce` (stripe 3935, extraction glued two words) is not hit; without `\b` rule 18's own pattern hits 10 lines. The new arm 9 has precision 5 of 9 (55.6 %): the 4 false hits are a protocol name (2) and an essay topic (2). Of the 5 real hits, only 1 (`AI-powered`) is caught by arms 1 to 10 today. The 4 other real hits are exactly the labels rule 18 governs (Astro "intelligent", three Vercel "Agentic Infrastructure" labels), and they pass the gate unseen.

## Effect on the ruleset

| Rule | Effect | Text and verification |
|---|---|---|
| MKT-CLAIM-02, code block | **change** | Replace line 9 with `\b(AI[- ](powered\|driven\|enabled)\|powered by AI\|agentic\|intelligent\|human-level\|no hallucinations?\|state-of-the-art)\b`. Append lines 11 to 15 exactly as in the "Candidate new arms" table. Verify (applies as already written): the lint re-runs the full set on the fleet and the exemplar corpus. Measured here: arm 9 new, 9 exemplar hits, 5 real, fleet 0; arms 11 to 15, 118 exemplar hits, 107 real, fleet 1 (a version floor). |
| MKT-CLAIM-02, precision note | **change** | Replace with: "Precision note, 2026-11-27 (followup-q0, repaired): 26 exemplar home pages, 5,797 visible-text lines. Arms 1 to 10, 326 hits, 292 real (89.6 %); outcome arm 119 of 131 (90.8 %), unit arm 79 of 85 (92.9 %), maturity arm 4 of 6. Recall at most 54.8 % against a sweep that found 241 missed real lines. Arms 11 to 15: 118 hits, 107 real (90.7 %), in-sample, not a held-out figure. Fleet: 1 hit ('PowerShell 7.4+', a version floor). Single reader." |
| MKT-CLAIM-02, verify | **change** | Add: "A version floor (`[0-9]+\.[0-9]+\+`) is not a claim; skip it with the filter `grep -v -E '[0-9]+\.[0-9]+\+'` on arm 12, or an `[[allow]]` entry." Measured: removes the one fleet hit and no exemplar arm-12 hit. |
| MKT-CLAIM-02, universal-quantifier paragraph | **confirm** | The 19 missed universal claims (class Q) sit in headline position; the headline-only reading check stands; a grep over all lines is noisy (C3). |
| MKT-CLAIM-06 | **confirm** (the first version's change is retracted) | No text change. Measured on 124 chart and table values in the cached HTML: the existing 300-character rule fires on 105; a caption-link wording passes 19 (same as the old rule), a K-ancestor wording passes 41 only by one site's layout, a density grouping passes 18. Open question, not a rule: a per-chart record whose `claim` is the chart title and whose `method` link is checked against the enclosing `<section>`; untested here. |
| MKT-CLAIM-08 | **confirm** | Arm 5 at 90.8 % supports it as the trigger. Optional filter: skip `fast(est)?[- ](growing\|moving)`. The check would fail 117 of 119 real exemplar hits (lower bound, links not visible). Verification: the mechanism-token command above. |
| MKT-CLAIM-13 | **confirm** | Arm 13 matches 19 free and limit phrases at 100 % and agrees with the rule's own `free` verify. |
| MKT-CLAIM-18 | **change** | Replace the verify's first sentence with: "The trigger is line 9 of MKT-CLAIM-02: each of its hits resolves to a record whose `source` path exists and contains a model-client call (`grep -nE 'anthropic\|openai\|generativeai\|ollama\|onnx\|transformers' <source>`). A hit that is a proper name (`Agentic Commerce Protocol`) or the topic of an essay needs an `[[allow]]` entry." Measured: 9 exemplar hits, 5 real, 4 false; fleet 0 hits (so it adds no cost to the fleet today). |
| MKT-CLAIM-20 | **change** | Add to the verify: "every line matching `^@[A-Za-z0-9_]{2,}$` or `@[A-Za-z0-9_]{2,} on X$` is an author handle of a social-post testimonial and carries a `data-proof` or `claim:` marker that resolves to an `endorsement` row." Measured below: 21 exemplar hits, 0 hits on the fleet. |
| MKT-CLAIM-03 | **confirm** | The count arm has the lowest precision, 6 of 10; its 4 false hits are Bun method captions. Check E re-checks count hits, so the false ones need the figure's marker or an `[[allow]]` entry. |

No new rule and no retirement. The 134 non-pattern misses fall under MKT-CLAIM-20 (testimonials), MKT-CLAIM-09 and 08 (vague outcome words) and the headline reading check.

MKT-CLAIM-20 handle-line measurement:

```
$ /usr/bin/grep -c -E '^[a-z]+:@[A-Za-z0-9_]{2,}$' exemplars.txt      -> 17
$ /usr/bin/grep -c -E ' on X$' exemplars.txt                          -> 4
$ /usr/bin/grep -c -E '^[a-z]+:@[A-Za-z0-9_]{2,}$|@[A-Za-z0-9_]{2,} on X$' exemplars.txt -> 21
by site: 4 cal, 15 supabase, 2 tailscale
$ /usr/bin/grep -c -E '<blockquote' html/supabase.html html/tailscale.html html/cal.html -> supabase 0, tailscale 0, cal 1
$ /usr/bin/grep -c -E '^[a-z]+:@[A-Za-z0-9_]{2,}$|@[A-Za-z0-9_]{2,} on X$' fleet2.txt -> 0   (28 fleet lines contain an @token, none match the anchored pattern)
```

The `<blockquote>` and quote-dash-name patterns of the current verify catch 1 `<blockquote>` on these three pages; the handle pattern finds all 21 author lines.

## Dated facts

| Fact | Value | Source | Date | Refresh |
|---|---|---|---|---|
| Exemplar corpus | 26 home pages, 5,797 visible-text lines | `mkt-claim-02-remeasure/exemplars.txt`, `scripts/urls.txt`; the live pages are listed in the first table | 2026-11-27 | Home pages change; re-fetch and re-run yearly or when the pattern set changes |
| Vendor copy | every figure quoted here is vendor data from the vendor's own page; Deno, Fly, Plausible, Tauri, Stripe, Vite, Zed, Cal.com, Turso, Supabase and Astral pages were re-fetched this day | links in the first table | 2026-11-27 | as above |
| Fleet corpus | 2,043 lines, fences and `<style>` stripped | `mkt-claim-02-remeasure/fleet2.txt` | 2026-11-27 | as above |
| MKT-CLAIM-02 set measured | the ten lines of `new.txt` | `mkt-claim-02-remeasure/new.txt` | 2026-11-27 | as above |
| uv benchmark claim | "10-100x faster than pip" links to `BENCHMARKS.md` | [docs.astral.sh/uv](https://docs.astral.sh/uv/) | page date 2026-03-13 | 2027-03 |

## What could not be determined

1. **Held-out recall.** The five new arms were written after reading the misses, so 74.9 % is in-sample. Missing: a second set of pages the arms have not seen, and a second rater. A different 26 home pages, fetched and read with the arms fixed beforehand, would give a real figure.
2. **True recall.** The denominator is the real claims a finite sweep found; the second pass found 26 more than the first, so the true miss count is above 241 and the true recall below 54.8 %. A full hand read of all 5,471 unmatched lines would settle it. This round read 435 flagged lines, 33 second-pass lines, and the 118 new-arm hits.
3. **Inter-rater reliability.** One reader classified every line (this worker, the same reader as wave 1; there was no second rater). Borderline calls: Astro's Core Web Vitals chart (real), Tailwind's three cards (false), the two Linear "world-class" lines (false), Cal.com's "6,000+ hours saved per week" (real), Zed's extension download counts (real), "Powering" phrases (4 real, 2 false). Flipping all of them moves the union precision by about 1.5 points and the recall bound by under 1 point (figures in the single-reader caveat above).
4. **A structural wording for chart-level method links.** Three tested wordings fail on the exemplar markup (section above). What is missing: a rule that distinguishes "one link covers the chart" from "no link" without relying on one site's layout. A per-chart claim record is the candidate, and it has not been tested.
5. **Link targets.** The visible-text corpus drops link targets, so rule 08's "or a link" clause is measured only through the HTML tests above; the 2-of-119 figure is a lower bound.
6. **Six cached claims not re-fetched.** Neon "100 free projects", Stripe "200m+", the Bun values, Zed extension counts, Svelte, Linear, Vercel and Tailscale lines are quoted from the cached extraction of 2026-11-27 only.

## Appendix: scripts and where they are

All under `~/.cache/research-lang/exemplars/product/wave2/q0/`. Every script runs with `python3 -I`, no network, and prints the output quoted above.

| File | Contents |
|---|---|
| `labels2.py` | explicit FALSE sets per arm (exemplar line numbers), missed-class labels imported from `classify.py` plus the 26 pass-2 extras, per-arm precision, union, recall, new arms on unmatched lines, mechanism-token check, new arm 9. Output saved to `out_labels2.txt` |
| `classify.py` | the 215 labelled missed lines by class (unmatched.txt line numbers) and the six second-pass tests |
| `cap06.py`, `cap06b.py`, `cap06c.py` | the three MKT-CLAIM-06 wordings on the cached HTML |
| `cand.txt`, `add.txt`, `arm1.txt` to `arm10.txt`, `unmatched.txt` | the patterns and the 5,471 unmatched lines |

Core of `labels2.py` (the false sets, the only hand-entered data besides `classify.py`):

```
FALSE={1:{1043,1046,1049,1052,1065,3166,3727,5168},2:{953,1003,1136,4595,4597,4599},
 3:{469,470,560,664},4:{176,3223},
 5:{991,4016,2323,3880,3904,3694,4482,1980,1154,1313,4981,2737},
 6:set(),7:{615,2290},8:{2089,2096},9:set(),10:set()}
EXTRA={'N':{676,1045,1048,1052,2292,2711,2831,2948,3503,3509,3528,3530,4130,1106,1737,1839,2660,2687,2698,3423,4425,4473},
       'S':{1923,3515,3777,3781}}   # unmatched.txt numbering
```
