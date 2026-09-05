---
title: Recording layer and interactivity
topic: recording-layer-and-interactivity
group: docs-examples
agent: docs-examples-worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 17
scope: >
  Covers the recorded-replay layer that sits on top of a tested example: cast/tape
  format choice, player-version pairing, version-control policy for the generated
  artifact, accessibility of an autoplaying terminal, opt-in cost, and the fleet's
  one unused non-executing authoring mode. Does not cover what makes an example a
  test in the first place, the page-to-script binding convention, or non-shell
  tested-docs mechanisms (Sybil, cargo test --doc, ExUnit.DocTest) — those are
  `tested-example-gate`'s territory and are cited here by pointer only.
---

## Table of contents

1. [Format: asciicast v2 vs v3, and what "not backward compatible" actually means](#1-format-asciicast-v2-vs-v3-and-what-not-backward-compatible-actually-means)
2. [Player compatibility, resolved from the player's own source](#2-player-compatibility-resolved-from-the-players-own-source)
3. [VHS vs a PTY-recorded asciicast — when the "one-tree" rejection generalizes](#3-vhs-vs-a-pty-recorded-asciicast--when-the-one-tree-rejection-generalizes)
4. [Version-control policy: two fleet implementations, one branching rule](#4-version-control-policy-two-fleet-implementations-one-branching-rule)
5. [Accessibility, resolved precisely — the mandatory floor is already met, the gap is narrower than it looks](#5-accessibility-resolved-precisely--the-mandatory-floor-is-already-met-the-gap-is-narrower-than-it-looks)
6. [Opt-in economics, and the stale measurement](#6-opt-in-economics-and-the-stale-measurement)
7. [The unused inline authoring mode — a live capability for the anti-pattern](#7-the-unused-inline-authoring-mode--a-live-capability-for-the-anti-pattern)
8. [Interactive elements as an alternative to a recording](#8-interactive-elements-as-an-alternative-to-a-recording)

## Summary

- A recording is a **view on a passing test**, never an independent artifact — 31 of ocx's 66 tested doc scripts (47%) ship with no recording at all, bound to their page as plain transcluded source instead ([tested-examples-mechanism.md §6](../docs-audit/tested-examples-mechanism.md)); recording is the minority layer, not the mechanism.
- asciicast v3 (Sept 2025) changed the header schema and switched event timestamps from **absolute** (v2: seconds since recording start) to **relative** (v3: seconds since the previous event) — confirmed by reading both specs directly, not just the v3 page's own compatibility claim ([v2 spec](https://docs.asciinema.org/manual/asciicast/v2/), [v3 spec](https://docs.asciinema.org/manual/asciicast/v3/)).
- "Not backward compatible" describes the **spec/writer** relationship, not player behavior: the actual asciinema-player source dispatches on `header.version` and ships working parsers for v1, v2, **and** v3 in the same file — a v3-generation player plays a v2 cast today ([asciicast.js](https://github.com/asciinema/asciinema-player/blob/develop/src/parser/asciicast.js)). Two fleet sites prove this in production: ocx pins player `^3.15.1` against v2 casts, grimoire vendors player `3.17.0` against a v2 `demo.cast` — both render.
- Both fleet sites that generate a recording still emit **`"version": 2`** by explicit choice — ocx's `cast_recorder.py:69` hardcodes it, and grimoire's `test_record_demo.py` chooses v2 specifically because "asciicast v2 wants fg/bg/palette together" for its header theme. This is a missed upgrade, not a broken pipeline.
- WCAG's pause-control requirement (2.2.2, Level A) is **already satisfied for free** by the vendored `asciinema-player` package's own control bar (`aria-label="Pause"/"Play"`, real `<button>`, keyboard-shortcuts overlay) as long as the wrapping component doesn't strip it — confirmed by reading `ControlBar.js` and `opts.js` directly, and by confirming neither ocx's nor grimoire's integration code passes `controls: false`.
- The real, narrower gap: **neither fleet site checks `prefers-reduced-motion`** before calling `.play()` — confirmed absent by grep in both `Terminal.vue` and `index.hbs`. This governs the AAA-level SC 2.3.3, not the mandatory-floor SC 2.2.2, which changes how urgent the fix is.
- ocx's `<Terminal>` embeds do **not autoplay on page load by default** — `autoPlay` defaults to `!props.src`, which is `false` whenever a cast is bound, and no page in the corpus overrides it. This refines, rather than contradicts, the audit's "one real gap" framing: the Level-A floor (no unstoppable auto-starting motion) is already met; only the AAA nicety is missing.
- Commit policy is a **branching rule keyed on whether a build regenerates the recording**, not a universal yes/no: ocx gitignores all 35 casts (`website/.gitignore:12`) because `website:build` re-records them from the passing test every time; grimoire commits its one `demo.cast` because mdBook has no such pipeline — the committed file **is** the record, produced by a dedicated, real-command-executing script (`test/recordings/test_record_demo.py`, reusing ocx's own `cast_recorder.py`) and reviewed via diff, not hand-authored.
- VHS's `.tape` format was rejected by ocx's own design research on "one-tree" grounds (a second script format, a second discovery path, a second sanitization class), plus a Go+ffmpeg+ttyd dependency in a repo with no other Go entry point ([tested-examples-mechanism.md §"Alternatives the ADR rejected"](../docs-audit/tested-examples-mechanism.md)) — that reasoning generalizes only when an acceptance-script tree **already exists**; for a project with none, VHS's diffable ASCII/text output mode is a legitimately simpler zero-to-one choice than building a PTY recorder from scratch.
- The cost estimate behind the opt-in decision is stale: it was measured at a 22-script baseline and never re-run at the current 35 ([tested-examples-mechanism.md §5](../docs-audit/tested-examples-mechanism.md)) — a 59% increase in scripts recorded against the same estimate is a documented gap, not a current number.
- 0 of 36 `<Terminal>` embeds use the shipped inline, non-executing `<Frame>` mode — a live capability, 10 lines, that fabricates a client-side cast from static `at`/text pairs with **no execution at all**. It is exactly the anti-pattern the tested-examples system exists to prevent, and it ships unused.
- No fleet site uses a live sandbox (WebContainers, Sandpack) or an OpenAPI "try it" console in place of a recording; this program should not recommend one as a default without naming the specific vendor and its license/cost tier, per `recent-shifts-and-tooling.md §11`.

## Findings

### 1. Format: asciicast v2 vs v3, and what "not backward compatible" actually means

Reading both specs directly rather than trusting a summary of either:

**asciicast v2** header (required: `version`, `width`, `height`; optional: `timestamp`, `duration`, `idle_time_limit`, `command`, `title`, `env`, `theme{fg,bg,palette}`) and event array `[time, code, data]` where **`time` is absolute** — "seconds since the beginning of the recording session" ([v2 spec](https://docs.asciinema.org/manual/asciicast/v2/)).

**asciicast v3** header requires `version: 3` and a `term{cols,rows,type?,version?,theme?}` object; optional fields move to `timestamp`, `idle_time_limit`, `command`, `title`, `env`, `tags`. Events stay a 3-tuple `[interval, code, data]` with codes `o`/`i`/`m`/`r`/`x` (output/input/marker/resize/exit), but **`interval` is relative** — seconds since the *previous* event, not since recording start ([v3 spec](https://docs.asciinema.org/manual/asciicast/v3/)). The spec states plainly: "asciicast v3 file format is not backward compatible with asciicast v1/v2 due to the header schema changes."

That sentence is true of the **file format as consumed by a strict single-version writer or a naive line-by-line diff**, and it is the correct reason to require an explicit `"version"` check anywhere a project hand-parses a cast. It is not, on its own, evidence about what a real player does when handed an older file — see §2.

```jsonc
// BAD — a hand-rolled cast parser that assumes one version and breaks silently
// on the other, instead of branching on the header it already has in hand
function play(castText) {
  const [header, ...events] = castText.split("\n").map(JSON.parse)
  // assumes v2 absolute timestamps everywhere below
  let t = 0
  for (const [time, code, data] of events) { render(data, time) }
}
```

```jsonc
// GOOD — branch on header.version before doing anything with the events,
// exactly what asciinema-player's own parser does (see §2)
function play(castText) {
  const [header, ...events] = castText.split("\n").map(JSON.parse)
  if (header.version === 2) return playV2(header, events)   // time is absolute
  if (header.version === 3) return playV3(header, events)   // interval is relative
  throw new Error(`asciicast v${header.version} not supported`)
}
```

### 2. Player compatibility, resolved from the player's own source

Both official documentation pages checked for an explicit backward-compatibility statement — [docs.asciinema.org/manual/player/](https://docs.asciinema.org/manual/player/) and [.../player/upgrading/](https://docs.asciinema.org/manual/player/upgrading/) — say nothing about whether a v3-generation player still loads v1/v2 files. The question was resolved by reading the actual parser instead of guessing from silence.

`asciinema-player`'s `src/parser/asciicast.js` (develop branch, current) contains, verbatim:

```js
if (header.version === 2) {
  return parseAsciicastV2(header, events);
} else if (header.version === 3) {
  return parseAsciicastV3(header, events);
} else {
  throw new Error(`asciicast v${header.version} format not supported`);
}
```

with `parseAsciicastV1` also present and dispatched separately for the legacy non-JSONL v1 shape ([asciicast.js](https://github.com/asciinema/asciinema-player/blob/develop/src/parser/asciicast.js)). **The player supports all three formats in one build; there is no version at which it stops reading older files.** This is cross-validated by two independent fleet implementations doing exactly this pairing in production, not just in theory:

| Site | Player version pinned | Cast version generated | Confirmed working |
|---|---|---|---|
| `ocx` | `asciinema-player@^3.15.1` (`website/package.json:7`) | `"version": 2` (`test/recordings/cast_recorder.py:69`) | Yes — 35 embeds render fleet-wide |
| `grimoire` | `3.17.0`, vendored verbatim, sha512-integrity-checked against npm before committing (`docs/theme/index.hbs:37-40`) | `"version": 2` (`docs/src/demo.cast:1`, and `test/recordings/test_record_demo.py`'s `_THEME` comment: *"asciicast v2 wants fg/bg/palette together"*) | Yes — the landing-page hero |

So the audit's open question — "verify that against the repo and state whether it currently plays" — resolves to **yes, it plays, and by design, not by accident of an untested edge case.** The actual finding is a missed upgrade, not a broken pipeline: both sites could move to v3 for smaller files (relative timestamps compress better) and richer markers, and neither has, and nothing forces them to.

### 3. VHS vs a PTY-recorded asciicast — when the "one-tree" rejection generalizes

VHS (Charm) takes an entirely different starting point: instead of recording a live PTY session, a `.tape` script declares window size, theme, typing speed, and key sequences, and `vhs` renders it deterministically to GIF/MP4/WebM/PNG-sequence — or to plain ASCII/text, which the project's own docs describe as usable for "integration testing," generating golden files a CI diff can compare run to run ([github.com/charmbracelet/vhs](https://github.com/charmbracelet/vhs)). It depends on `ttyd` and `ffmpeg`, ships an official `vhs-action` for CI, is MIT-licensed, and sits at 20.8k GitHub stars — a mature, actively maintained tool, not a fringe one.

ocx's own design research rejected VHS outright, unscored, for a specific reason recorded in `research_shell_hook_cast_recording.md`: adopting it would mean a **second script format** (`.tape` alongside the existing `.sh` doc-script tree), a **second discovery mechanism**, and — because `.tape` has no cast-region/state-provider concept — either duplicated sanitization logic or an unsanitized second cast class, which is exactly what the repo's "one-tree" invariant (EQ3 in `conftest.py:121`) exists to prevent. It also adds a Go binary and Docker dependency to a repo with no other Go entry point ([tested-examples-mechanism.md, "Alternatives the ADR rejected"](../docs-audit/tested-examples-mechanism.md)).

**That reasoning generalizes exactly as far as its premise: it only applies when an acceptance-script tree already exists.** ocx already had 66 `.sh` scripts under test before recording was ever added; VHS there would be a second, parallel asset class. A project with **no** existing per-command test scripts, wanting only a recorded-looking demo for a landing page, does not have a one-tree invariant to violate — for that starting point, VHS's declarative tape plus diffable text output is a genuinely simpler zero-to-one path than standing up a PTY recorder, a sanitizer, and a fixture registry from nothing. The two tools solve different halves of the same problem: asciinema captures what a real terminal actually did; VHS scripts a reproducible re-enactment of what it is supposed to do. The fleet uses only the former, and no repo in it uses VHS at all.

```
# BAD — introducing a .tape file next to an already-existing tested-doc-script
# tree: now there are two places a reviewer must check for "does this command
# still work," and one of them (the tape) never actually executes the real CLI
demo.tape          # hand-scripted keystrokes and waits, never runs `ocx` for real
test/doc_scripts/*.sh   # the existing, already-tested source of truth
```

```
# GOOD — no existing script tree: VHS's tape *is* the first tested-recording
# mechanism, and its text-mode output is what CI diffs
demo.tape           # declarative, versioned, CI-diffable via `vhs --output demo.txt`
```

### 4. Version-control policy: two fleet implementations, one branching rule

The Conflict this program named — "commit the recording vs commit the script vs commit neither" — is not a single fleet-wide answer; it is two internally consistent policies that differ because the two sites differ in one structural fact: **whether a build step regenerates the recording from a passing test.**

**ocx**: `website:build` runs `recordings:parallel` after every `scripts:publish`, so every cast is regenerated from the currently-passing script on every build. `website/.gitignore:12` excludes `src/public/casts` entirely — **0 of 35 generated `.cast` files are committed** (`git ls-files website/src/public/casts/ | wc -l` → 0). Committing a build artifact here would mean the file drifts from what generated it and bloats history with binary-ish diffs on every re-record; ocx's own design research names this directly as "never edit generated files."

**grimoire**: mdBook has no analogous recording pipeline wired into its build. `docs/src/demo.cast` (4.2K) **is** committed (`git ls-files docs/src/demo.cast` confirms it tracked), produced by `test/recordings/test_record_demo.py` — which deliberately reuses ocx's own `cast_recorder.py` module rather than reinventing one, and records against the **real, published** `ghcr.io/grimoire-rs/skills/grim-usage` package (verified anonymously pullable via a real GHCR token check, per the script's own docstring), not a throwaway local fixture. This script is explicitly excluded from `task verify`/CI (`test/pyproject.toml`'s `testpaths` don't include it) — it is invoked manually via `task demo`, and the repo's own theme comment states the review contract directly: *"demo.cast is committed (not regenerated by the docs build)"* (`docs/theme/index.hbs:44-45`).

The branching rule this program should ship: **commit the recording only when nothing else regenerates it on a normal build.** If a build step re-runs the recorder against the passing test every time (ocx's shape), gitignore the output — it is derived, and committing it invites drift between the file and the test that produced it. If there is no such build step (a static site with no recording pipeline, grimoire's shape), commit the recording, but only if it was produced by a script that executes a real command — never typed by hand — and require the commit that updates it to be reviewed by diffing the cast's own text content, which is what grimoire's contract already asks reviewers to do.

```
# BAD — hand-editing a committed .cast file to fix a typo in the displayed
# output, rather than re-running the recorder against the real command
$ vim docs/src/demo.cast    # "just fixing the timestamp, it's basically text"
```

```
# GOOD — the only way a committed cast changes is by re-executing the
# command that produces it, through the same recorder every time
$ task demo   # runs test_record_demo.py, overwrites docs/src/demo.cast, diff it
```

### 5. Accessibility, resolved precisely — the mandatory floor is already met, the gap is narrower than it looks

Three WCAG success criteria apply to an embedded terminal recording, each with a distinct trigger and level:

| SC | Level | Trigger | Requirement |
|---|---|---|---|
| [2.3.1 Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html) | A | Any content that flashes | ≤3 flashes/second, or below the general/red flash luminance thresholds (≥10% relative-luminance swing with the darker frame below 0.80) |
| [2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html) | A | Moving/blinking/scrolling content that **starts automatically** and **lasts >5s**, run in parallel with other content | A mechanism to pause, stop, or hide it, that doesn't trap focus |
| [2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html) | AAA | Motion **triggered by a user interaction** (click, scroll) | Must be disableable unless essential; `prefers-reduced-motion` is the WCAG-cited sufficient technique |

Reading `Terminal.vue` line by line rather than treating "no `prefers-reduced-motion` in the file" as the whole story:

- `const autoPlay = props.autoPlay ?? !props.src` — for every cast-bound (`src`-based) embed, this evaluates to **`false`** unless a page explicitly overrides it. `grep -rn "autoPlay" website/src/docs` finds **zero** overrides across the corpus. So **nothing auto-starts on page load, fleet-wide, by default** — SC 2.2.2's trigger condition ("starts automatically") does not fire for the current corpus as shipped.
- Once a viewer clicks a collapsed `<Terminal>` open, or clicks the player's own Play button, that playback is **interaction-triggered**, which is SC 2.3.3's territory (AAA, not a mandatory floor) — and this is where the real, confirmed gap lives: `grep -n "prefers-reduced-motion" website/.vitepress/theme/components/Terminal.vue website/.vitepress/theme/custom.css` and `grimoire/docs/theme/index.hbs` all return nothing. Neither site checks the media query before calling `.play()`.
- The pause/stop control SC 2.2.2 and 2.3.3 both effectively require is **already present, for free**, in the vendored library: `asciinema-player`'s `ControlBar.js` ships a real `<button class="ap-playback-button" aria-label="Pause"/"Play">`, a mute button, a "Show keyboard shortcuts" button, and a fullscreen toggle ([ControlBar.js](https://github.com/asciinema/asciinema-player/blob/develop/src/components/ControlBar.js)), and its default `controls` option is `"auto"` (shown on hover/focus, not permanently hidden) — `opts.js:88`. Neither `Terminal.vue`'s `AsciinemaPlayer.create(...)` call nor grimoire's passes `controls: false`; both inherit the library default unmodified.

This refines `ux-observability-posture.md §5`'s framing ("Reduced-motion handling is the one real gap") into something more precise and more useful to a reviewer: **the Level-A floor is already met by the shipped defaults** (nothing auto-starts; a real accessible pause control exists whenever playback does run) — **the one confirmed, actionable gap is the AAA-level `prefers-reduced-motion` check**, which is cheap to add and should be treated as exactly that size of fix, not conflated with a missing pause button that in fact already exists.

```js
// BAD — plays regardless of the viewer's OS-level motion preference
function initPlayer(autoPlay) {
  player = AsciinemaPlayer.create(src, el, { autoPlay, ...opts })
}
```

```js
// GOOD — respects prefers-reduced-motion before ever calling play()
function initPlayer(autoPlay) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  player = AsciinemaPlayer.create(src, el, { autoPlay: autoPlay && !reduceMotion, ...opts })
}
```

SC 2.3.1 (flash) is close to vacuously satisfied for a plain terminal-text recording — there is no full-frame luminance flicker in scrolling monospace text. The one real edge case worth a check is a recorded command whose own output includes a fast-redrawing spinner or a progress bar with a high refresh rate; that is a property of the *recorded program*, not the player, and the only honest verification available is a reading heuristic (does the source script's output include an ANSI-cursor-repositioning progress indicator, and if so, what's its redraw interval), not an automatable grep — flagged as such in the normative section below.

### 6. Opt-in economics, and the stale measurement

Recording is opt-in per script via a `# cast: true` header key; 35 of ocx's 66 doc scripts opt in, 31 don't ([tested-examples-mechanism.md §6](../docs-audit/tested-examples-mechanism.md)). The cost is not the cast write itself (≈1ms) — it is the setup (real OCI registry pushes) and the PTY execution, both incurred whether or not a cast is actually produced, because the recorder replays the *same* script tree the acceptance suite already runs (`conftest.py:121`, "one-tree convergence"). Measured ranges, from `research_vitepress_transclusion_cast_cost.md`: serial recording ≈4-15 minutes for a 22-script baseline; `pytest -n auto` ≈1-3 minutes; registry throughput caps useful parallelism at **4-8 workers**; GIF conversion via `agg`/gifski adds ≈20-60s wall time.

That baseline is **35% understated on its own numbers**: it was measured at 22 scripts, and the corpus has since grown to 35 cast-true scripts (59% more) with no re-measurement recorded anywhere in the fleet's own audit trail — the audit that surfaced this explicitly flags it as "a documented gap in this audit," not a current number. A project shipping this pattern should not silently carry a two-generation-old cost estimate as if it were current.

### 7. The unused inline authoring mode — a live capability for the anti-pattern

`Terminal.vue` supports a second mode alongside `src`: an inline `<Frame at="0.5">$ some command</Frame>` mode, implemented via a 10-line non-rendering `Frame.vue` marker component (`website/.vitepress/theme/components/Frame.vue`) that `Terminal.vue` reads through `useSlots()` and uses to fabricate an asciicast v2 string client-side from static `at`/text pairs — **with no execution of anything at all** (confirmed by direct read of the ocx repository).

`grep -c '<Frame ' website/src/docs` returns **0**. Every one of the 36 live `<Terminal>` embeds in the corpus uses `src=`, bound to a script that actually ran. The `<Frame>` mode is shipped, typed, documented in the component's own prop comments, and exercised by nothing — it is a live, ready-to-use capability for authoring exactly the artifact the entire tested-examples system exists to prevent: a terminal transcript that looks real and never ran. Its existence is not itself a bug (dead code that nobody has reached for is arguably evidence the corpus doesn't need it), but shipping it unused, undocumented-as-discouraged, and structurally indistinguishable in the rendered page from a `src=`-bound recording is a standing invitation.

### 8. Interactive elements as an alternative to a recording

No site in the fleet uses a live in-browser sandbox (StackBlitz WebContainers, Sandpack) or an OpenAPI "try it" console (Scalar, Redoc, Stoplight Elements) in place of a recording — 0 of 23 docs surfaces. Given the corpus itself never reaches for the shipped non-executing `<Frame>` mode either (§7), the fleet's own revealed preference is that a real recording of a real command beats any non-executing substitute, interactive or not. A rule recommending "an interactive try-it console" as an alternative to recording would need to name the specific vendor and its licensing tier to be actionable — Redocly's own "Try It" is paywalled, Scalar's is free, Sandpack is functional but unmaintained ([recent-shifts-and-tooling.md §11](../docs-topic-map/recent-shifts-and-tooling.md)) — and no fleet evidence supports recommending the investment at all. This program should not name a default interactive-sandbox choice; it should state that a recording of an executed command is the default, and an interactive element is an addition a project reaches for only when it has a concrete need this fleet has not shown.

## Normative guidance candidates

1. **Every embedded terminal recording must be produced by executing a real command through the project's existing tested-example harness — never hand-typed.** Rationale: this is the one property that keeps a recording from becoming exactly the artifact the tested-examples system exists to prevent, a transcript that looks real and never ran. Verify: grep the component library for any mode that fabricates player input from static text/timestamp pairs with no execution path (e.g. `<Frame>`-style markers); if found, its usage count in doc pages must be checked against the doc-script/test tree — a nonzero usage with no matching test is a hard fail. Evidence level: normative (this is the load-bearing principle §7's finding threatens).

2. **Commit the recording only when no build step regenerates it from a passing test; otherwise gitignore it as a build artifact.** Rationale: prevents the two failure modes on either side — a committed-and-regenerated file drifts from what produced it and bloats history, while a build-artifact-with-no-regeneration-path silently disappears the only record a static site has. Verify: does the recording's directory appear both in the build task graph (regenerated) *and* in git-tracked files (committed)? Both true is the contradiction to catch; check with `git ls-files <casts-dir>` against the build taskfile's task list. Evidence level: codified (derived from two working, contrasting fleet implementations, §4).

3. **When a recording is committed (no regeneration path exists), it must still come from a script that executes the real command, and review it by diffing its text content.** Rationale: without this, "committed" degrades straight into "hand-authored," which rule 1 already forbids. Verify: does a dedicated recorder script exist and get invoked (even manually, e.g. `task demo`) before the committed file is expected to change, or has the file itself been edited directly in a diff (a `.cast` hunk with no corresponding recorder-script change in the same commit is the tell)? Evidence level: codified (grimoire's `test_record_demo.py` contract, §4).

4. **Name the exact cast format version generated and the exact player version pinned, in the project's own docs-tooling notes — and confirm from the player's own source or changelog that the pinned version still parses that header version, rather than assuming forward compatibility.** Rationale: "asciicast" is not one format; v3 changed the header schema and timestamp semantics in a way its own spec calls non-backward-compatible, and a project that doesn't check risks either an actual break or, more likely, years of carrying a stale-format writer nobody revisits. Verify: `head -c 40 <path-to-a-generated-cast>` for `"version": N`; cross-check `N` against the pinned player package's changelog or (absent one) its parser source for a matching `parseAsciicastVN` branch. Evidence level: measured (§1-§2, resolved from primary sources on both sides).

5. **An autoplaying recording must not auto-start; default `autoPlay` to false for any cast-bound embed, and require an explicit, reviewed opt-in per page to override it.** Rationale: this is what keeps SC 2.2.2 (Level A, pause/stop/hide for auto-starting content >5s) from ever triggering in the first place — the cheapest way to satisfy a Level-A criterion is to not create its trigger condition. Verify: grep the component's default-prop resolution for `autoPlay` — the default expression must evaluate false whenever a `src`/recording prop is set (`ocx`'s own `props.autoPlay ?? !props.src` is the pattern to copy), and grep doc pages for any explicit `autoPlay`/`autoplay` override, which becomes a required manual accessibility check rather than a silent default. Evidence level: codified (verified working as shipped in ocx, §5).

6. **Whatever embed component wraps a third-party player must not disable that player's own accessible controls.** Rationale: `asciinema-player`'s default control bar already satisfies the practical intent of SC 2.2.2 (a real `<button aria-label="Pause">`) — reinventing this in a custom wrapper is both unnecessary work and a likely regression (a custom skin is far more likely to drop the `aria-label` than the upstream library is). Verify: grep the integration code for a `controls:` option passed to the player's `create()`/init call; its absence, or an explicit `"auto"`/`true`, passes; `controls: false` (or a custom skin that hides the bar via CSS with no keyboard-reachable replacement) fails. Evidence level: codified (verified directly against `ControlBar.js` and `opts.js`, §5).

7. **Once playback is user-triggered (a click to expand or play), honor `prefers-reduced-motion` before calling `.play()`.** Rationale: this is the one confirmed, currently-unaddressed gap in the fleet's only implementation of this pattern, and it is a small, mechanical fix once named precisely (as an AAA nicety layered on an interaction, not a Level-A violation). Verify: grep the player-init code path for `matchMedia('(prefers-reduced-motion` — its absence is the finding, exactly as `recent-shifts-and-tooling.md §10`'s AI-agent-angle check already states for a fresh authoring pass. Evidence level: measured (confirmed absent in both `Terminal.vue` and `index.hbs` by direct grep).

8. **Adopt a second tested-recording tool family (VHS's declarative `.tape`) only when no PTY-recorded acceptance-script tree exists yet; never alongside one.** Rationale: two script formats for the same category of asset means two discovery paths and, without a shared sanitizer, two sanitization classes — the exact failure mode ocx's own design research named when it rejected VHS outright. Verify: does the repo contain both a `.tape` file and a shell/language acceptance-script tree bound to doc pages? Both present in the same repo is a hard fail; a `.tape`-only repo with no acceptance-script tree is the tool's legitimate zero-to-one use case. Evidence level: codified (ocx's own rejected-alternatives record, §3).

9. **Re-measure and re-state the recording pipeline's wall-clock/parallelism cost whenever the recorded-script count changes by more than roughly 25% since the last measurement.** Rationale: a stale cost estimate under-prices CI scheduling and worker-parallelism decisions — the fleet's own number is already 59% stale and was flagged, not fixed. Verify: diff the currently-documented script count in the cost write-up against a live count (`find <doc-scripts-dir> -name '*.sh' | wc -l` or the language equivalent); a gap beyond the threshold is a lint failure, not a judgment call. Evidence level: asserted (a heuristic threshold this program is proposing, not one observed elsewhere in the fleet or literature).

10. **If an inline, non-executing "mock terminal" authoring mode exists in the component library and has zero real usages, remove it rather than leave it live.** Rationale: an unused capability for fabricating unverified terminal output is a standing invitation to exactly the failure the tested-examples mechanism exists to close, and "it's shipped but nobody uses it" is not evidence it's safe — it's evidence nobody has needed the anti-pattern yet. Verify: `grep -rc '<Frame ' <docs-dir>` (or the equivalent marker name); a nonzero result requires each usage to be justified in review; a zero result is itself the finding that the mode should be deleted, not merely left dormant. Evidence level: argued (a design recommendation drawn from the fleet's own dead-capability evidence in §7, not an external standard).

## AI-agent angle

- **Recommends "add a Terminal/asciicast demo" and reaches for the pattern's most common shipped shape (an autoplaying, looping cast) rather than the accessible one.** Most training-corpus examples of embedded terminal recordings autoplay and loop with no pause affordance authored explicitly, because the underlying player's *default* accessible controls are invisible in a static code sample. Check: does the generated integration code explicitly pass (or explicitly omit, matching the safe default) `autoPlay`, `loop`, and `controls`, or does it silently inherit whatever the last example in context happened to set?
- **Cites "asciicast" as one unversioned format and assumes any player plays any cast.** An LLM will often name "asciinema" without checking which of v1/v2/v3 a given recorder emits or a given player expects, because the distinction rarely appears in casual usage examples. Check: does the cast file's own first line state a `"version"`, and does the player dependency's pinned version have a known-working parser branch for it (grep the player's own source, don't assume)?
- **Treats a missing `prefers-reduced-motion` check and a missing pause button as the same severity of gap.** An LLM asked to "fix accessibility" on a terminal embed will often add both a custom pause button and a reduced-motion media query in one pass, duplicating a control the vendored player already ships natively and potentially shipping a worse one (a `<div onclick>` with no `aria-label`, replacing a library `<button>` that already had one). Check: before writing a new pause control, grep whether the underlying player package already ships one and whether the wrapper has disabled it — write the reduced-motion check only.
- **Writes an inline, non-executing "terminal mockup" component when asked for "an interactive code example" or "a lightweight demo," because that shape is easy to author and needs no test infrastructure.** This is precisely the shipped-but-unused `<Frame>` anti-pattern (§7): an LLM under time pressure will reach for the fabricated-transcript shortcut over wiring a real command through a test harness, because the former requires zero infrastructure. Check: does the "demo" in question correspond to an actual passing test/script, or is its terminal output typed directly into the component's props/children with no backing execution anywhere in the repo?
- **Commits a generated recording to git "to be safe," or conversely deletes a committed one "because generated files shouldn't be committed," without checking whether a build step actually regenerates it.** Both defaults are half-right and half-wrong depending on the repo's actual build shape (§4) — an LLM applying either rule uniformly will either bloat history with regenerable binaries or silently orphan the only copy a build-less static site has. Check: does the repo have a build task that re-runs the recorder on every build? If yes, gitignore; if no, commit only via a dedicated script, never a manual edit.
- **Adds a `.tape` (VHS) file to a repo that already has a shell-script-plus-recorder tested-docs pipeline, because VHS is the tool that came up in training data for "recording a terminal demo."** This reintroduces a second discovery path and sanitization class the existing pipeline was specifically built to avoid. Check: does an acceptance-tested script tree already exist for doc commands? If yes, extend that; don't add a parallel format.

## Contested / evolving

- **Named conflict, resolved: "commit the recording vs commit the script vs commit neither."** Not a single fleet-wide answer — it is a branching rule keyed on whether a build step regenerates the recording (§4, rule 2-3 above). ocx (regenerating build → gitignore) and grimoire (no regenerating build → commit via a dedicated recorder script, review by diff) are both internally consistent instances of the same rule, not competing philosophies. Resolved as of 2026-09-05 against both repos' actual state, not their documentation.
- **"Not backward compatible" (asciicast v3 spec's own words) reads, on first pass, like a playback break — it isn't one, and this is worth stating as a genuine, easy misread.** The incompatibility is in the header schema a strict single-version tool would choke on; the actual shipped player parses all three versions via a version-dispatch branch (§2). Trending: as of this fetch, no official doc page states the player's cross-version support explicitly — a reader has to go to the source to find it, which is itself a gap in asciinema's own documentation, not just this fleet's.
- **Whether the AAA-level `prefers-reduced-motion` check is worth requiring as a hard project rule, or left as a nicety, is not settled by any style guide surveyed** — WCAG itself places it at AAA (aspirational, not typically a compliance floor), while accessibility-focused blogs converge on recommending it as a practical default regardless of conformance target. This program's normative rule (candidate 7) takes the "do it anyway, it's cheap" position; a project targeting only Level AA compliance could defensibly skip it, and should say so explicitly rather than silently omitting it.
- **VHS vs PTY-recorded asciinema is genuinely use-case-contingent, not a universal ranking** — §3 resolves it as "depends on whether an acceptance-script tree already exists," which is a checkable fact, not an aesthetic preference, and that is the most this program can responsibly claim; several real projects outside this fleet use both tools for different assets in the same repo, which this fleet's single-mechanism sample cannot speak to either way.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.asciinema.org/manual/asciicast/v3/](https://docs.asciinema.org/manual/asciicast/v3/) | Official asciicast v3 format spec | v3 shipped with CLI 3.0, Sept 2025 | Primary source for the header schema, event codes, and the relative-timestamp change |
| [docs.asciinema.org/manual/asciicast/v2/](https://docs.asciinema.org/manual/asciicast/v2/) | Official asciicast v2 format spec | v2, pre-2025 | Primary source proving v2's timestamps are absolute, the exact contrast v3 changed |
| [docs.asciinema.org/manual/player/upgrading/](https://docs.asciinema.org/manual/player/upgrading/) | Official player upgrade notes (player v2→v3) | fetched 2026-09-05 | Checked and found silent on cross-version playback — the negative result that sent this research to the player's own source instead |
| [github.com/asciinema/asciinema-player](https://github.com/asciinema/asciinema-player) | Official asciinema-player repository | fetched 2026-09-05 | The tool two fleet sites depend on for cast playback |
| [asciicast.js](https://github.com/asciinema/asciinema-player/blob/develop/src/parser/asciicast.js) | The player's actual parser source | current `develop` branch, fetched 2026-09-05 | Primary, ground-truth evidence that one player build parses v1, v2, and v3 casts via a version-dispatch branch — resolves the audit's open "does it currently play" question directly from source |
| [ControlBar.js](https://github.com/asciinema/asciinema-player/blob/develop/src/components/ControlBar.js) | The player's default control-bar component | current `develop` branch, fetched 2026-09-05 | Proves the vendored library ships an accessible `aria-label`led pause/play button and keyboard-shortcuts overlay by default, before any wrapping component adds anything |
| [opts.js](https://github.com/asciinema/asciinema-player/blob/develop/src/opts.js) | The player's default-options resolution | current `develop` branch, fetched 2026-09-05 | Confirms the default `controls` value is `"auto"`, not hidden, absent an explicit override |
| [github.com/charmbracelet/vhs](https://github.com/charmbracelet/vhs) | VHS official repository | fetched 2026-09-05, 20.8k stars, MIT | Primary source for `.tape` format, output modes (including diffable ASCII/text), and the official CI Action |
| [W3C WCAG 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html) | Official WCAG 2.1 Understanding doc | WCAG 2.1 | Primary source for the Level-A auto-starting-content pause requirement this program cites verbatim |
| [W3C WCAG 2.3.1 Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html) | Official WCAG 2.1 Understanding doc | WCAG 2.1 | Primary source for the flash-rate and luminance thresholds |
| [W3C WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html) | Official WCAG 2.1 Understanding doc | WCAG 2.1 | Primary source for the AAA/interaction-triggered distinction that reclassifies the fleet's actual gap |
| [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) | Official MDN reference | live, fetched 2026-09-05 | Exact media-query syntax for the one confirmed missing check |
| `ocx` repository: `website/.vitepress/theme/components/Terminal.vue`, `Frame.vue`, `test/recordings/cast_recorder.py`, `website/package.json`, `website/.gitignore` | Real repository, direct read | fetched 2026-09-05 | Ground truth for autoplay defaults, cast version written, player version pinned, and the gitignored-casts commit policy — not re-derived from the audit's summary |
| `grimoire` repository: `docs/theme/index.hbs`, `test/recordings/test_record_demo.py`, `docs/src/demo.cast`, `CHANGELOG.md` | Real repository, direct read | fetched 2026-09-05 | Ground truth for the committed-recording contrast case: vendored player version, cast version, the real-package recording target, and the non-gated re-record task |
| [`tested-examples-mechanism.md`](../docs-audit/tested-examples-mechanism.md) | Internal fleet audit (file:line, this program) | 2026-09-05 | Source for the opt-in cost figures, the VHS-rejection record, and the recording-vs-transclusion split this topic builds on |
| [`ux-observability-posture.md`](../docs-audit/ux-observability-posture.md) | Internal fleet audit (this program) | 2026-09-05 | Source for the fleet-wide accessibility table this finding's §5 refines |
| [`recent-shifts-and-tooling.md`](../docs-topic-map/recent-shifts-and-tooling.md) | Internal scout doc (this program) | 2026-09-05 | Source for the asciicast v3 / VHS overview and the interactive-elements vendor survey (§8) |
