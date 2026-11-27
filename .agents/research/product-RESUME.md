# product (UX + marketing + channels) — resume state (paused 2026-11-27 on owner request)

Program frame: [product-frame.md](product-frame.md). Method: `.claude/skills/research-lang/`.
Worktree `.agents/worktrees/product`, branch `product-ux-marketing`. Nothing pushed.

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

## Left, in order

1. **Phases 4 and 5 (dive, consolidate).** DONE 2026-11-27: 23 topics, 552
   rules, results in `product-resume/wave1-result-<group>.json`. To redo a
   group, run the stored script with the contents of
   `product-resume/wave1-args-<group>.json` as `args` (dives may be given as
   slug strings; each brief is `product-resume/briefs/<topic>/<dive>.md`):

   ```
   Workflow({ scriptPath: ".agents/research/product-resume/map-dive-consolidate.js", args: <wave1-args-<group>.json> })
   ```

   The script writes `<topic>/<dive>.md` per dive and `<topic>.md` per topic,
   checks each dive against the output contract, and has a skeptic challenge
   each ruleset before an opus revision. 74 dives, 23 consolidations. A topic
   whose `<topic>.md` already exists is done; drop it from the args first.
2. **Phase 6 (iterate).** Wave 2 launched 2026-11-27: 58 follow-up questions
   over 22 topics (`product-resume/wave2/<topic>/q<i>.md`), run by
   `product-resume/followup-revise.js` (one run per group; args are
   `{today, topics: [{slug, idFamily, group, q: [indices]}]}`). Each follow-up
   writes `<topic>/followup-q<i>.md`; one opus revision per topic folds them
   in. The 24 questions that need a human, a credential or an eval harness and
   the 105 owner decisions are in `product-owner-decisions.md`.
   Stop when a wave adds no new MUST rule and no new failure class.
3. **Fold the frame corrections** from the three selection files into
   `product-frame.md` under "Corrections". Known already: only 2 of 10 fleet
   sites have a landing page; the fleet has no social channel and no voice
   guidance; the larger GUI is the VS Code extension, not `grim-gui`; the maps
   added a third prefix, `channel-`.
4. **Phase 7 (author).** Reconcile the three proposed artifact sets into one
   (they overlap on `product-essentials` and on release announcements), then
   write the rules, reference skills, skills and bundles.
5. **Phase 8 (validate).** `check-artifacts.py`, trigger evals, and a literal
   run of each skill on a real tree. Add the new sets to `taskfile.yml`.
6. When the branch lands: delete `~/.cache/research-lang/exemplars/product`
   and remove this worktree.

## Caveats carried forward

- `marketing-topic-map/practitioner.md` could not open paywalled sources
  (Growth Unhinged, parts of Wynter); those rows are marked unverified.
- LinkedIn publishes no numeric limit for several page fields; the scouts
  record third-party values as unverified.
- Platform facts decay fast. Every dive brief requires a source URL and the
  source's date; the skills must pin dated facts in one reference file each.
