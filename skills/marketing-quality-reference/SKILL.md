---
name: marketing-quality-reference
description: Depth files and checks scripts behind the marketing-quality rule, loaded on demand. Use when the marketing-quality rule, marketing-review or positioning-brief routes you to a depth file or a checks script, or when a task cites an MKT-CLAIM, MKT-POS, MKT-PAGE, MKT-VOICE or MKT-SEO rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the marketing-quality rule
  keywords: marketing,claims,evidence,positioning,first-screen,voice,seo,canonical,open-graph,robots-txt,structured-data,licence,testimonials,reference
  claude.user-invocable: "false"
---

# marketing-quality-reference

Depth for the `marketing-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [claims.md](claims.md) | MKT-CLAIM-01 to 10, 18, 19, 27, 29, 30: the `claims.toml` record, the claims lint and its five checks, the 15-line claim pattern set, expiry, performance and statistic figures, mechanism rewrites, price reductions, caveats, named comparisons, AI capability |
| [trust-claims.md](trust-claims.md) | MKT-CLAIM-11 to 17, 20 to 26, 28, 31: "open source" and "free", licence agreement, security and compliance wording, sign-off classes, `security.txt`, endorsements, testimonials, reviews, popularity counts, accolades |
| [positioning.md](positioning.md) | MKT-POS: the positioning record, its schema, the surface match table, drift, the owner gate |
| [first-screen.md](first-screen.md) | MKT-PAGE: `doc_surface`, what a hero or README opening carries, maturity lines |
| [voice.md](voice.md) | MKT-VOICE: the voice record, AI authorship, detectors, media labels, public-interest review |
| [discoverability.md](discoverability.md) | MKT-SEO: head set, sitemaps, robots, crawler policy, banned tactics, structured data |

## checks/

Scripts the rule's gate runs. Python 3.11 standard library, run as `python3 -I`, exit 0 clean, 1 findings, 2 usage, and each takes `--self-test` over its fixtures. Set `CHECKS=.claude/skills/marketing-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/marketing-quality-reference/checks` when installed globally).

| Script | Rules | Run |
|---|---|---|
| `claims_lint.py` | MKT-CLAIM-01 to 05, 28 | `python3 -I "$CHECKS"/claims_lint.py --base "$BASE"` from the repository root, after any copy-surface change |
| `positioning_check.py` | MKT-POS-02, 07 to 12, plus the MKT-PAGE and MKT-VOICE extractors | `python3 -I "$CHECKS"/positioning_check.py drift` |
| `head_check.py` | MKT-SEO-01 to 10, 21 to 25 | `python3 -I "$CHECKS"/head_check.py BUILD_DIR --host HOST` on the built output |
| `live_site_check.py` | MKT-SEO-11 to 17, 26 | `python3 -I "$CHECKS"/live_site_check.py robots HOST` after every deploy |
| `shingle.py` | MKT-SEO-24 | `python3 -I "$CHECKS"/shingle.py SITEMAP` on a generated page set |

`claims_lint.py` reads `claims.toml` at the repository root and prints `path:line: MKT-CLAIM-NN [check] message`. Add `--run-checks` to re-run each count row's `check` command, and `--reading` to print the absolute-word and comparison-word lines a person reads. Its pattern set is the block in `claims.md`, and `--self-test` fails when the two differ.
