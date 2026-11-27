---
name: ux-quality-reference
description: Depth files and checks scripts behind the ux-quality rule, loaded on demand. Use when the ux-quality rule routes you to a depth file or a checks script, or when a task cites a UX-A11Y, UX-STATE, UX-TEXT, UX-ACT, UX-AI or UX-VERIFY rule ID the index only summarises. Not for CLI help or terminal output, which is the ux-cli skill, and not for JSON output or MCP tools, which is the ux-agent-interfaces skill.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the ux-quality rule
  keywords: ux,accessibility,a11y,wcag,aria,focus,contrast,forms,loading,empty-state,error-state,microcopy,confirmation,ai-disclosure,axe,playwright,reference
  claude.user-invocable: "false"
---

# ux-quality-reference

Depth for the `ux-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [widgets.md](widgets.md) | Native buttons, links and dialogs, accessible names, state in markup, ARIA the spec forbids, custom widgets to the APG contract (UX-A11Y-01 to 11) |
| [focus-and-colour.md](focus-and-colour.md) | Focus indicators, sticky-bar scroll padding, contrast ratios, hit targets, colour-only cues, `color-scheme`, focus hidden by opacity or a zero-size box (UX-A11Y-12 to 21, 36, 37) |
| [motion-and-announcements.md](motion-and-announcements.md) | Live regions, `status` against `alert`, pausing motion, flashing limits, reduced motion (UX-A11Y-22 to 27) |
| [page-structure.md](page-structure.md) | `lang`, title, landmarks, headings, the skip link, consistent navigation, planned pages (UX-A11Y-28 to 34) |
| [editor-extensions.md](editor-extensions.md) | VS Code webview accessibility, input boxes, progress, notifications, webview panels (UX-A11Y-35, UX-STATE-28 to 33) |
| [states.md](states.md) | Loading, empty, error, partial and stale states, pending flags, progress, skeletons, refresh, toasts, banners (UX-STATE-01 to 19, 34) |
| [forms.md](forms.md) | Field labels, validation timing, error placement and focus, required markers, `autocomplete` (UX-STATE-20 to 27, 35, 36) |
| [text.md](text.md) | Error messages, warnings, labels, link text, `alt` text, plurals, formatting, status strings (UX-TEXT) |
| [actions.md](actions.md) | The T0 to T3 action tiers, confirmations, undo, live and test modes, typed-name confirmation (UX-ACT-01 to 11) |
| [ai-features.md](ai-features.md) | AI disclosure and labels, model-output rendering, citations, confidence, tool-call states, streaming, memory (UX-AI) |
| [verification.md](verification.md) | The gate, the rendered matrix, the claims an agent may write, the target and the law (UX-VERIFY-01 to 17, 24 to 32) |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/ux-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/ux-quality-reference/checks` when installed globally). Python scripts need Python 3.11 and the standard library, run as `python3 -I`, take `--help`, exit 0 clean, 1 on findings and 2 on bad usage, and carry `--self-test` over `checks/fixtures/`. Node scripts import Playwright and axe-core at the exact versions pinned in `verification.md` (Setup), print their versions, and are not self-tested: copy them into the project's test directory so Node resolves the project's own `node_modules`, and set `PW_CHROMIUM` when no Playwright browser is installed.

| Script | Rules | Reads |
|---|---|---|
| `page_structure.py` | UX-A11Y-28, 29, 31, 32, 33; UX-VERIFY-04 | built HTML, plus the sitemap and the gate's route list |
| `axe-fixture.mjs` | UX-VERIFY-02, 03, 05, 06, 08, 09, 11 | a served build; golden HTML fixtures with `--html-dir` |
| `ui-matrix.mjs` | UX-VERIFY-13 to 16 | a served production build |
| `wcag22-ids.txt` | the 86 WCAG 2.2 success-criterion IDs, 4.1.1 removed: the whitelist for a review report's `sc:` and `also:` fields (UX-VERIFY rules 18 to 23, owned by `ux-review`) and for the target named in UX-VERIFY-30 | the review skill and a reader checking a cited criterion |
| `focus_outline.py` | UX-A11Y-12 | CSS and templates |
| `wcag_contrast.py` | UX-A11Y-15, 16 | custom-property colour pairs in both schemes |
| `focus_diff.mjs` | UX-A11Y-13 | a served build (rendered focus indicator contrast) |
| `colour_only.mjs` | UX-A11Y-19 | a served build (colour-only state cues) |
| `focus_opacity.mjs` | UX-A11Y-36, 37 | a served build (focused controls hidden by opacity or a zero-size box) |
| `scan_wv.py` | UX-A11Y-03, 04, 35 | webview template literals |
| `form_fields.py` | UX-STATE-20, 27, 36 | templates and components |
| `text_scan.py` | UX-TEXT-16, 17, 25, 28 | product strings |
| `actions_scan.py` | UX-ACT-05, 06 | confirmation call sites and components |
| `model-output-cases.json` | UX-AI-12 | the adversarial inputs a renderer regression test feeds |

Run a script with `--help` for its flags. The first four rows are the gate itself; the rule's Gate block lists them in order.
