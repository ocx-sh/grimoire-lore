# product (UX + marketing + channels) — program state (finished 2026-11-27)

Program frame: [product-frame.md](product-frame.md). Method: `.claude/skills/research-lang/`.
Ran in a worktree on branch `product-ux-marketing`; landed on `main` together with the 2026-11 refresh.

## Done

| Phase | Output |
|---|---|
| 0 Frame | `product-frame.md` |
| 1 Ground | `product-audit/` — 10 audits (fleet config, sites, UI code, messaging, distribution, CLI first run; exemplar landing pages, READMEs, YouTube channels, design systems) |
| 2 Scout | `ux-topic-map/` (12), `marketing-topic-map/` (13 marketing + 13 `channel-*`) |
| 3 Map | `ux-topic-map.md`, `marketing-topic-map.md`, `channel-topic-map.md` — each written by opus, challenged by a completeness critic, then revised |

The program was paused once after phase 3 and resumed the same day; phases 4
and 5 have since run (see "Left, in order").

## Stored for the continuation

All under [product-resume/](product-resume/):

| File | What it is |
|---|---|
| `selection-ux.json` | 8 topics, 28 dive briefs (UX-VERIFY, UX-A11Y, UX-STATE, UX-TEXT, UX-CLI, UX-ACT, UX-AI, UX-AGENT) |
| `selection-marketing.json` | 7 topics, 21 dive briefs (MKT-CLAIM, MKT-POS, MKT-PAGE, MKT-SEO, MKT-REL, MKT-MEAS, MKT-VOICE) |
| `selection-channels.json` | 8 topics, 25 dive briefs (CH-GH, CH-CORE, CH-LI, CH-YT, CH-VID, CH-COM, CH-LAUNCH, CH-MB) |
| `critic-*.json` | what the critic found before each map was revised |
| `groups.json` | the per-group arguments (territory, scout list, audits) |
| `briefs/`, `wave1-args-*.json` | one brief file per dive, and the ready-to-pass arguments per group |
| `map-dive-consolidate.js` | the Workflow script for phases 3 to 5; skips the map when given a selection |
| `ground-scout-fanout.js` | the Workflow script that ran phases 1 and 2, kept for a later wave |

Each selection file also holds the map's proposed artifact set and its
corrections to the frame.

## Finished 2026-11-27

| Phase | Result |
|---|---|
| 4, 5 Dive, consolidate | 23 topics, results in `product-resume/wave1-result-<group>.json` |
| 6 Iterate | Wave 2: 58 follow-ups over 22 topics (`wave2-result-<group>.json`). Wave 3, held out: claims, accessibility, interface states and AI features (`wave3-result-*.json`); it added no MUST rule. Final count: 569 rule IDs |
| 7 Author | `product-authoring-plan.md`, 22 units in `product-resume/authoring-units.json`: rules `ux-quality` and `marketing-quality`, their two reference skills, 15 skills, bundles `ux-essentials` and `product-essentials` |
| 8 Validate | `product-resume/phase8-result.json`: each artifact followed literally on a real repository (26 blocking and 81 minor defects, repaired), trigger evals on two model tiers (60 cases, none missed, three co-loads each) |

Scripts, kept for a later round: `map-dive-consolidate.js`, `followup-revise.js`
(`args.wave` selects `wave<N>/`), `author-validate.js`, `validate-literal.js`,
`list-descriptions.py`.

## Left for the owner

- `product-owner-decisions.md`: 105 owner decisions and 24 follow-ups that need
  a human, a credential or an evaluation harness.
- The "stillOpen" lists in the `wave2-result-*` and `wave3-result-*` files.
- Two platform facts expire on 2026-12-01 and 2026-12-05; `task facts:stale`
  reports them. It is outside `task ci` on purpose.
- Not done: the baseline-without-the-artifact half of the trigger evals, and a
  browser run of the `.mjs` checks by a reviewer (the machine lacks Chromium's
  system libraries; only the authors' runs back them).

## Caveats carried forward

- `marketing-topic-map/practitioner.md` could not open paywalled sources
  (Growth Unhinged, parts of Wynter); those rows are marked unverified.
- LinkedIn publishes no numeric limit for several page fields; the scouts
  record third-party values as unverified.
- Platform facts decay fast. Every dive brief requires a source URL and the
  source's date; the skills must pin dated facts in one reference file each.
