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

The maps were stopped the moment their first dives started. No dive wrote a
file; phase 4 has not begun.

## Stored for the continuation

All under [product-resume/](product-resume/):

| File | What it is |
|---|---|
| `selection-ux.json` | 8 topics, 28 dive briefs (UX-VERIFY, UX-A11Y, UX-STATE, UX-TEXT, UX-CLI, UX-ACT, UX-AI, UX-AGENT) |
| `selection-marketing.json` | 7 topics, 21 dive briefs (MKT-CLAIM, MKT-POS, MKT-PAGE, MKT-SEO, MKT-REL, MKT-MEAS, MKT-VOICE) |
| `selection-channels.json` | 8 topics, 25 dive briefs (CH-GH, CH-CORE, CH-LI, CH-YT, CH-VID, CH-COM, CH-LAUNCH, CH-MB) |
| `critic-*.json` | what the critic found before each map was revised |
| `groups.json` | the per-group arguments (territory, scout list, audits) |
| `map-dive-consolidate.js` | the Workflow script for phases 3 to 5; skips the map when given a selection |
| `ground-scout-fanout.js` | the Workflow script that ran phases 1 and 2, kept for a later wave |

Each selection file also holds the map's proposed artifact set and its
corrections to the frame.

## Left, in order

1. **Phases 4 and 5 (dive, consolidate).** Run the stored script once per group,
   three runs in parallel (the cap is 10 agents per run):

   ```
   Workflow({
     scriptPath: ".agents/research/product-resume/map-dive-consolidate.js",
     args: { today: "<date>", group: <groups.json>.<group>, selection: <selection-<group>.json> }
   })
   ```

   `group` is one of `ux`, `marketing`, `channels`. The script writes
   `<topic>/<dive>.md` per dive and `<topic>.md` per topic, checks each dive
   against the output contract, and has a skeptic challenge each ruleset before
   an opus revision. Expect about 74 dives and 23 consolidations.
   Read the three maps first if the selection should change; edit the JSON to
   drop or add a topic.
2. **Phase 6 (iterate).** Harvest "deserves another round" and "owner decision"
   items from each consolidation; commission the first, report the second.
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
