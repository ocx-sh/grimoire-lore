---
title: UX topic map and wave selection
program: product
sub_program: ux
date: 2026-11-27
model: opus
---

# UX topic map and wave selection

This map merges the 12 landscape scouts in `.agents/research/ux-topic-map/` with the grounding audits in `.agents/research/product-audit/`. It deduplicates their candidates and picks eight topics for this wave. Each topic is framed as a question. The map also sets the artifact set and records where the product frame (`.agents/research/product-frame.md`) is wrong.

This is revision 2 of the map, made on 2026-11-27 after a completeness review. The section "Critic responses" at the end lists each criticism and what changed. Row IDs M001 to M259 are unchanged; new rows start at M260.

## How to read this map

Scout row references use the file prefix and the row number in that scout's candidate table.

| Prefix | Scout file |
|---|---|
| CG | `ux-topic-map/canonical-guides.md` |
| PR | `ux-topic-map/practitioner.md` (the number is the file line of the candidate row, lines 28 to 62) |
| CS | `ux-topic-map/codified-systems.md` |
| FC | `ux-topic-map/failure-corpus.md` candidate table (rows 1 to 32) |
| FCf | `ux-topic-map/failure-corpus.md` failure-class table (rows 1 to 8) |
| RS | `ux-topic-map/recent-shifts.md` |
| AX | `ux-topic-map/accessibility.md` |
| CD | `ux-topic-map/content-design.md` |
| OC | `ux-topic-map/onboarding-conversion.md` |
| DT | `ux-topic-map/devtools.md` |
| RM | `ux-topic-map/research-measurement.md` |
| AI | `ux-topic-map/ai-products.md` |
| PI | `ux-topic-map/patterns-ia.md` |

Coverage is measured against the shipped catalog and the fleet configuration in `product-audit/config-inventory.md`:

- **covered**: an existing rule or skill already decides this candidate.
- **partial**: an existing rule or skill touches the surface but does not decide the question.
- **uncovered**: nothing in the catalog or fleet configuration decides it.

These are the existing owners that the map routes to rather than restates:

- `css-theming`: tokens, dark parity, forced colours.
- `docs-quality`: landing counts DOC-TYPE-10 to 15, plain English DOC-PLAIN-*, `llms.txt` DOC-AGENT-04.
- The language `cli-contract` sets: CLI-01 streams, CLI-07 colour, CLI-08 progress, CLI-09 no prompt without a TTY, CLI-12 help line length, CLI-16 first output within 100 ms.
- The TUI rules TUI-17 to 25, including TUI-22 (colour never the only channel) and TUI-23 (the feedback ladder).
- TS-WEB-06: accessibility lint at error.
- `installer-script` and `shell-integration`.
- `ai-config-authoring` and `grim-authoring`.
- The fleet-only `ocx-theme-*` skills.

Priority is judged for this project first: the OCX and Grimoire fleet, which has two CLIs, the shared Astro theme, 10 doc sites, the VS Code extension and the grim-gui skeleton. It is judged for any software team second. High means wide leverage, a known agent failure, and a check a rule can run.

## Measurements made for this map

The audits did not measure the VS Code extension (`grimoire-rs/vscode`). These counts were taken on 2026-11-27 in that checkout.

| Fact | Value | Command |
|---|---|---|
| Tracked files under `src` | 358 | `git -C grimoire-rs/vscode ls-files src \| wc -l` |
| Production `.ts`, `.css` and `.html` files (tests excluded) | 42 | `git -C grimoire-rs/vscode ls-files src \| grep -v '/test/' \| grep -cE '\.(ts\|css\|html)$'` |
| Production lines under `src` (tests excluded) | 24,957 | `git -C grimoire-rs/vscode ls-files src \| grep -v '/test/' \| xargs wc -l \| tail -1` |
| `showInformationMessage` call sites | 33 | `git -C grimoire-rs/vscode grep -c showInformationMessage -- src`, summed |
| `showWarningMessage` call sites | 70 | same command with `showWarningMessage` |
| `showErrorMessage` call sites | 80, of which 5 are outside `src/test` (`notify.ts:97`, `forceRetry.ts:120`, `staleLock.ts:134`, `updateRefusal.ts:92`, `updateRefusal.ts:104`) | same command with `showErrorMessage`; `git grep -n` for the locations |
| Quick pick call sites (`showQuickPick` or `createQuickPick`) | 31 | `git -C grimoire-rs/vscode grep -cE 'showQuickPick\|createQuickPick' -- src`, summed |
| `showInputBox` call sites | 10 | same command with `showInputBox` |
| `withProgress` call sites | 0 | same command with `withProgress` |
| Webview references (`createWebviewPanel` or `WebviewView`) | 60 | same command with `createWebviewPanel\|WebviewView` |
| `aria-` occurrences | 149 | same command with `aria-` |
| Modal messages (`modal: true`) | 6 | `git -C grimoire-rs/vscode grep -cE 'modal: *true' -- src`, summed |
| Contributed commands, views and view containers | 22 commands, 1 view (a webview, `grimoire.marketplace`), 1 view container, 3 menus, 1 submenu, 2 configuration blocks | `python3 -I -c "import json;d=json.load(open('package.json'))['contributes'];print({k:len(v) for k,v in d.items()})"` |
| View modules under `src/views` | details, forceRetry, grimInfo, hookPrompt, html, pickVersion, ratingAuth, settings, sidebar, staleLock, switchReplacement, updateRefusal, vote | `ls grimoire-rs/vscode/src/views` |

Three further facts were checked for revision 2, because the dive briefs depend on them.

| Fact | Value | Command |
|---|---|---|
| EU legal texts are retrievable without the EUR-Lex bot challenge | The Publications Office Cellar returned HTTP 200 with the Official Journal text of Regulation (EU) 2024/1689 (1,262,391 bytes, Article 50 present) and Directive (EU) 2019/882 (483,169 bytes, Article 32 present); `Accept: application/pdf` returns the PDFs. The ELI route `data.europa.eu/eli/...` still returned HTTP 202 with an empty body | `curl -sL -H "Accept: application/xhtml+xml" -H "Accept-Language: eng" https://publications.europa.eu/resource/celex/32024R1689` (and `.../celex/32019L0882`), then a tag-stripping `python3 -I` search for "Article 50" and "Article 32" |
| `grim mcp` source and write gating | `src/mcp.rs` plus `src/mcp/` (server 380 lines, tool_args 394, render 441); the module comment says mutating tools are gated behind `--allow-writes` (`src/mcp.rs:6-10`) | `wc -l src/mcp.rs src/mcp/*.rs` and `grep -n tool src/mcp.rs` in `grimoire-rs/grimoire` |
| Agent client available to workers | Claude Code 2.1.332, which accepts `--mcp-config`, `--strict-mcp-config`, `--allowedTools`, `--disallowedTools` and `--permission-mode` | `claude --version`; `claude --help \| grep -E "mcp-config\|allowedTools\|permission-mode"` |

The extension's own rule file, `grimoire-rs/vscode/CLAUDE.md`, governs webview UI. Golden-output fixtures live in `src/test/fixtures/goldens`. Taken together, the extension is the largest interactive GUI in the fleet: 42 production files and 24,957 lines. grim-gui has 74 lines and 0 interactive elements (`product-audit/ui-code-posture.md`).

## The map

### A. Verification and evidence

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M001 | Which WCAG 2.2 A and AA criteria can a CI gate verify, and which must be reported as needing human review? | AX1, AX5, CS27, RM31 | uncovered | high | axe runs in 47 specs, deep tier only (`ui-code-posture.md`); agents report "accessible" after a lint pass | UX-VERIFY / automated-a11y-coverage |
| M002 | Which axe run configuration (tags, rules switched on, handling of `incomplete`)? | AX2, AX15 | uncovered | high | AX2 reports `target-size` off by default in axe-core 4.14.1 ([rule list](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)) | UX-VERIFY / automated-a11y-coverage |
| M003 | What does a Lighthouse accessibility score of 100 prove? | AX4 | partial | high | ocx.sh gates pull requests on score 100 alone (`ui-code-posture.md`) | UX-VERIFY / automated-a11y-coverage |
| M004 | Do the lint layers cover `.astro`, webview HTML strings and MkDocs templates? | AX14 | partial | high | TS-WEB-06 covers TSX only; the theme is `.astro` | UX-VERIFY / automated-a11y-coverage |
| M005 | Which automated-coverage planning figure may be quoted (57 percent, 20 to 30 percent, one sixth)? | AX3, FC25, RM31 | uncovered | medium | The figures conflict, and the 57 percent figure is vendor data ([Deque](https://www.deque.com/automated-accessibility-coverage-report/)) | UX-VERIFY / automated-a11y-coverage |
| M006 | Where does an automated suite give false assurance (iframes, shadow DOM, states never rendered)? | AX33 | uncovered | medium | Webviews and command-bar states are reached only by interaction | UX-VERIFY / automated-a11y-coverage |
| M007 | Does a checker feedback loop beat prompt instructions for agent-written UI? | FC17 | uncovered | medium | Decides whether the review skill runs a checker or only reads code | UX-VERIFY / automated-a11y-coverage |
| M008 | Which rendered checks verify a UI change (320 px reflow, zoom to 200 and 400 percent, both themes, forced colours, keyboard walk)? | RS28, FC21, CS17 | partial | high | css-theming owns forced-colours tokens; no artifact owns the interaction pass | UX-VERIFY / rendered-interaction-matrix |
| M009 | Which screen reader and browser pairs, and how often? | AX16 | uncovered | medium | No fleet artifact names a pair | UX-VERIFY / rendered-interaction-matrix |
| M010 | What review burden does design-to-code output carry, and which checks must the agent run before handing it over? | RS16 | uncovered | medium | Agents hand over unrendered UI | UX-VERIFY / rendered-interaction-matrix |
| M011 | Can an LLM audit replace manual WCAG checks? | RM32 | uncovered | high | This is the overclaim agents are most likely to make | UX-VERIFY / evidence-and-claims |
| M012 | What must a "needs review" report contain so a human can do the manual remainder? | AX34 | uncovered | high | Defines the review skill's output | UX-VERIFY / evidence-and-claims |
| M013 | When may an agent write "users found X hard", and how does it state confidence? | RM1, RM36 | uncovered | high | Agents invent user findings | UX-VERIFY / evidence-and-claims |
| M014 | What can a heuristic evaluation claim, and with how many evaluators? | RM8, CG39, PI30, PR50 | uncovered | medium | Scoring heuristics as pass or fail overclaims ([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)) | UX-VERIFY / evidence-and-claims |
| M015 | How must a UX statistic quoted inside a UX finding be labelled (sample, date, vendor)? | PR48, OC27, OC48 | uncovered | high | Agents quote convenience-sample percentages as fact. Statistics in marketing copy (Appcues benchmarks, OC48) belong to marketing's claim policy | UX-VERIFY / evidence-and-claims (UX findings only); claims in marketing copy named to marketing |
| M016 | May an agent use synthetic users, and for what? | RM25, RM26, RM27 | uncovered | medium | An agent can simulate a user cheaply; it must say what that proves | UX-VERIFY / evidence-and-claims |
| M017 | Which failures must agent defaults preempt first? | FC31, RS17 | uncovered | high | RS17: six categories are 96 percent of detected errors (low contrast 83.9 percent of pages, missing alt 53.1, missing labels 51.0, empty links 46.3, empty buttons 30.6, missing lang 13.5; [WebAIM Million 2026](https://webaim.org/projects/million/)); each maps to an axe rule | Ranking input to UX-A11Y native-widgets-and-keyboard and focus-contrast-target-size; axe mapping checked in UX-VERIFY automated-a11y-coverage |
| M018 | How is a design-time review (no code) checked? | FC32 | uncovered | low | The fleet has no design files | Deferred: research methods |

### B. Conformance and law

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M019 | Which WCAG version and level is the stated target, by jurisdiction and customer, and is WCAG 3 a build target? | RS1, AX28, FC20 | uncovered | high | Every check cites a criterion number | UX-VERIFY / conformance-targets-law |
| M020 | What does the ADA Title II web rule require, from when, and does it reach vendors? | AX24, CS25 | uncovered | medium | AX24 reports compliance dates of 2027-04-26 and 2028-04-26 ([ada.gov](https://www.ada.gov/resources/2024-03-08-web-rule/)) | UX-VERIFY / conformance-targets-law |
| M021 | Does the European Accessibility Act reach an open-source developer tool or a SaaS, and what does the microenterprise exemption cover? | AX25, RS2, PR34, OC24, PI32, FC20 | uncovered | medium | The scouts could not retrieve the directive text from EUR-Lex; the Cellar route in the revision-2 measurements does serve it | UX-VERIFY / conformance-targets-law |
| M022 | Which EN 301 549 version is the EU baseline? | AX26, RS3 | uncovered | medium | v4.1.1 publication on 2026-09-02 is reported only by a vendor ([Deque](https://www.deque.com/blog/en-301-549-v4-1-1-is-final-what-changed-what-it-means-and-what-you-should-do/)); Official Journal citation unverified | UX-VERIFY / conformance-targets-law |
| M023 | Does Section 508 need an update to WCAG 2.2? | AX27 | uncovered | low | Matters only for US federal sales | UX-VERIFY / conformance-targets-law |
| M024 | Which conformance statement, VPAT or ACR may a product publish, and what does using a design system not prove? | RS32, RS33, CS26 | uncovered | medium | Teams claim conformance by inheritance | UX-VERIFY / conformance-targets-law |
| M025 | Is an accessibility overlay ever acceptable? | FC19 | uncovered | low | One-line ban candidate | UX-VERIFY / conformance-targets-law |
| M026 | Do lawsuit counts show which failures cost most? | FC30 | uncovered | low | Counts are not severity | Deferred: meta |
| M027 | Which public-sector service-standard duties bind beyond UI? | CS40 | uncovered | low | No public-sector adopter | Deferred: meta |

### C. Accessibility authoring

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M028 | Native element or custom widget, and which APG patterns must never be hand-built? | AX9, CG2, RS8, RS13, FC3 | partial | high | TS-WEB-06 lints JSX only; agents hand-build dialogs and menus | UX-A11Y / native-widgets-and-keyboard |
| M029 | What is the keyboard contract for each pattern the fleet uses? | AX10, CS15 | uncovered | high | The command bar, tabs and webview lists are custom | UX-A11Y / native-widgets-and-keyboard |
| M030 | What are the dialog focus rules (initial focus, trap, Escape, return)? | AX11, CS14 | uncovered | high | 6 modal sites in the VS Code extension; theme overlays | UX-A11Y / native-widgets-and-keyboard |
| M031 | Tabs: automatic or manual activation, and when is a tab widget wrong? | AX12 | uncovered | medium | Docs code tabs | UX-A11Y / native-widgets-and-keyboard |
| M032 | Which ARIA constructs do the ARIA-in-HTML rules forbid, and is no-ARIA-first the default? | AX13, AX30, FC4, RS18, PR33, FCf8 | partial | high | [WebAIM Million](https://webaim.org/projects/million/): pages with ARIA averaged more errors (correlation only) | UX-A11Y / native-widgets-and-keyboard |
| M033 | Which controls ship without an accessible name (inputs, icon buttons, empty links)? | FCf2, FC2, PR32 | partial | high | ocx-theme rows cover it outside the catalog | UX-A11Y / native-widgets-and-keyboard |
| M034 | Links or buttons, and when may `target="_blank"` be used? | CS22, FC3 | uncovered | high | Agents put click handlers on `div` and `a` | UX-A11Y / native-widgets-and-keyboard |
| M035 | Does every clickable thing look clickable, and nothing else? | CG1 | uncovered | medium | Signifier loss in flat themes | UX-A11Y / native-widgets-and-keyboard |
| M036 | Do icons carry text labels? | CG24 | uncovered | medium | Icon-only toolbars in the theme and webviews | UX-A11Y / native-widgets-and-keyboard |
| M037 | Which combobox and autocomplete contract applies (command palettes, search)? | PI25 | uncovered | medium | The theme ships a command bar | UX-A11Y / native-widgets-and-keyboard |
| M038 | What heading, landmark, skip-link and `lang` minimum applies to every page template, docs and app alike? | FC26, PR55 | uncovered | high | `rules/docs-quality.md:184` says page-level accessibility is governed nowhere (`config-inventory.md` smell 10); 2 `<h1>` on grimoire.rs (`site-shape.md` smell 7) | UX-A11Y / page-structure-and-consistency |
| M039 | Is focus visible, and never hidden by sticky chrome (WCAG 2.4.11)? | CS13, AX6, PI10, RS5, PR29, FC21 | partial | high | `command-bar.css:141-143` is the one untraced `outline:none` (`ui-code-posture.md`) | UX-A11Y / focus-contrast-target-size |
| M040 | `:focus-visible` or `:focus`, and one focus ring token? | CS14 | partial | high | 16 `outline:none` sites, 15 with a replacement | UX-A11Y / focus-contrast-target-size |
| M041 | Which minimum target size applies to which surface, and how do the exceptions work in dense UIs? | AX7, CS1, CS2, CS3, CG3, CG4, PI8, RS4, PR28 | uncovered | high | Theme control tokens run from 16 to 42 px, and three are below 24 (`tokens.css:187-194`) | UX-A11Y / focus-contrast-target-size |
| M042 | Do text and non-text contrast pass in both themes? | FCf1, FC1, AX31, CS12 | partial | high | Grimoire docs fail at 3.91:1 and on borders at 2.69:1 and 1.76:1 (`ui-code-posture.md`) | UX-A11Y / focus-contrast-target-size |
| M043 | WCAG 2 ratio or APCA? | RS25, RS34, PR31 | partial | medium | Law cites the WCAG 2 ratio ([Roselli, 2026-04](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)) | UX-A11Y / focus-contrast-target-size |
| M044 | Is anything conveyed by colour alone in GUI output? | CG17, AX21 | partial | high | TUI-22 covers TUIs only | UX-A11Y / focus-contrast-target-size |
| M045 | How does UI announce a state change (`role=status`, `alert`, `aria-live`)? | AX17, PI9 | uncovered | high | Copy buttons and async results are silent | UX-A11Y / announcements-and-motion |
| M046 | Do toggles, copy buttons and theme switches expose their state? | AX18 | uncovered | high | The theme has all three | UX-A11Y / announcements-and-motion |
| M047 | Is `prefers-reduced-motion` honoured, and are animations limited to compositor properties? | CS10, CS11, RS11, PR35, FC22 | uncovered | high | Grimoire docs have 0 reduced-motion blocks (`ui-code-posture.md`) | UX-A11Y / announcements-and-motion |
| M048 | Which flashing and auto-playing media limits apply? | CS39 | uncovered | low | README GIFs and demo video | UX-A11Y / announcements-and-motion |
| M049 | Is focus order logical and free of traps? | CS15, FC21 | uncovered | medium | Checked by the walk in M008 | UX-A11Y / native-widgets-and-keyboard |
| M050 | Is the dragging alternative (WCAG 2.5.7) in place? | CS23, PR30 | uncovered | low | No drag interaction in the fleet | Deferred: misc patterns |
| M051 | Is accessible authentication (WCAG 3.3.8) met: paste allowed, no cognitive test? | CS24, AX8, PI31, RS6, OC14, PR30 | uncovered | medium | No web sign-in in the fleet | Deferred: auth |
| M052 | Is redundant entry (WCAG 3.3.7) avoided? | PI7, OC13, PR30 | uncovered | low | No multi-step forms | Deferred: forms |
| M053 | What do third-party embeds cost in accessibility? | FCf7, FC24 | uncovered | low | 0 third-party scripts (`distribution-posture.md`) | Deferred: misc patterns |
| M054 | Which framework defaults cut errors? | FC23, RS31 | uncovered | low | Stack already chosen | Deferred: meta |
| M055 | Is generated content (landing, README, release notes) accessible? | AX29, PR62 | partial | medium | Split. Markdown content (alt text written in `.md`, heading text) stays with docs-quality, which loads on Markdown; the rendered page (templates, chrome, landmarks, contrast, keyboard order, sidebar, search widget) has no owner today | Page half: UX-A11Y / page-structure-and-consistency. Alt-text rule text: UX-TEXT / labels-and-wordlists, with a pointer row added to docs-quality |
| M056 | Does the page work in forced colours and Safari adaptive dark mode? | RS26 | covered | low | css-theming owns forced colours | Route: css-theming |
| M057 | Is the TUI keyboard-only and screen-reader usable? | DT24 | partial | medium | TUI-17 to 25 cover the feedback ladder, not screen readers | UX-CLI / terminal-accessibility |
| M260 | Do the sub-sites under one domain keep navigation, identification and help in a consistent order (WCAG 3.2.3, 3.2.4, 3.2.6 Consistent Help, level A)? | AX5, PR30 | uncovered | high | 3.2.6 is new in 2.2 and rated H in the accessibility scout's criterion table; ocx.sh serves 6 Starlight sites under one domain, each on its own theme specifier (`site-shape.md` section 1) | UX-A11Y / page-structure-and-consistency |

### D. States and feedback

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M058 | Is the 0.1, 1 and 10 s response model still the budget, and what replaces it? | CG12, PI2, AI26 | partial | high | CLI-16 covers CLIs only ([NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/)) | UX-STATE / loading-and-progress |
| M059 | Nothing, spinner, skeleton or progress bar, by wait and scope? | CG13, CS8, PI1 | partial | high | CLI-08 covers the terminal; web and webviews have no rule | UX-STATE / loading-and-progress |
| M060 | How fast must a click acknowledge, and are repeat clicks blocked? | CG23, CS20 | uncovered | high | Double submit is an agent-common defect | UX-STATE / loading-and-progress |
| M061 | Is status shown, current and accurate? | CG22 | uncovered | medium | Stale-lock and retry views in the extension | UX-STATE / loading-and-progress |
| M062 | What must an empty state contain, and how does it differ from loading and error? | CG14, CD13, PI12, OC7 | uncovered | high | Catalog and marketplace lists | UX-STATE / empty-error-notification |
| M063 | Does every data view render every state (loading, empty, error, partial, offline, overflow)? | FC16, CS29 | uncovered | high | Agents write the happy path only | UX-STATE / empty-error-notification |
| M064 | Banner, inline, toast or modal, with what persistence? | CS30, PI13, PI29 | uncovered | high | No rule picks the channel | UX-STATE / empty-error-notification |
| M065 | When is a modal dialog justified? | CG26 | uncovered | medium | Agents over-use modals; 6 `modal: true` sites in the extension | UX-ACT / confirmations-and-modals |
| M066 | Which VS Code surface for which message (notification, status bar, webview, quick pick, progress)? | measured above | partial | high | 183 message calls, 6 modal, 0 `withProgress` | UX-STATE / editor-extension-surfaces |
| M067 | Does the interface protect the user's work and keep input after an error? | CG18, CD17 | uncovered | high | Agents clear forms on failure | UX-STATE / form-state-machine |
| M068 | What may go in a tooltip? | CG25 | uncovered | low | Few tooltips in the fleet | Deferred: misc patterns |
| M069 | When may text be truncated, and how is the full text reached? | CS16 | uncovered | low | Package names in tables | Deferred: misc patterns |
| M070 | How are autosave, optimistic updates, offline and partial failure shown? | PI28 | uncovered | medium | No fleet use today | Deferred: misc patterns |
| M071 | Are defaults sensible, and is the scope of a reset stated? | CG21 | uncovered | low | Settings view only | Deferred: misc patterns |
| M072 | Which TUI states and feedback apply? | DT23 | covered | low | TUI-17 to 25 | Route: TUI rules |

### E. Forms

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M073 | Is every input labelled by a visible label, never a placeholder? | CG5, PR38 | uncovered | high | 51.0 percent of home pages lack form labels ([WebAIM Million](https://webaim.org/projects/million/)) | UX-STATE / form-state-machine |
| M074 | When does validation fire: on blur, on submit or live? | CG8, CD16, PI3, FC15, PR36 | uncovered | high | The sources disagree; the rule must pick one default | UX-STATE / form-state-machine |
| M075 | Is the submit button disabled before the form is valid? | PR37 | uncovered | high | Detectable by grep | UX-STATE / form-state-machine |
| M076 | Error summary plus inline error: what must exist, and where does focus go? | CS19, PI4, CD15, PR39 | uncovered | high | [GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/) | UX-STATE / form-state-machine |
| M077 | Are `autocomplete`, input types and paste correct on each field? | CS20 | uncovered | medium | Settings and auth fields | UX-STATE / form-state-machine |
| M078 | Are required and optional fields both marked? | OC12 | uncovered | medium | Detectable by attribute check | UX-STATE / form-state-machine |
| M079 | Where does the label go, and how many optional fields are allowed? | CG6 | uncovered | low | Few forms | Deferred: forms |
| M080 | Which fields can be dropped, derived or collected later? | CG7, OC11 | uncovered | low | No sign-up form | Deferred: forms |
| M081 | One question per page or grouped, and wizard or not? | PI5, PI6, OC8 | uncovered | low | No multi-step flows | Deferred: forms |
| M082 | Does `field-sizing: content` need a minimum width? | RS30 | uncovered | low | Baseline question | Deferred: platform |
| M083 | Do three repeats of the same error mean the design is at fault? | CG10 | uncovered | low | Needs field data | Deferred: research methods |

### F. Interface text

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M084 | What must an error message contain (what, why, next step, the input)? | CD1, CD3, CG9, FC27 | partial | high | Of 20 scored fleet errors, 9 state why and 11 a next step (`cli-first-run.md`) | UX-TEXT / error-message-anatomy |
| M085 | How is a compiler-style or CLI diagnostic shaped (prefix, case, punctuation)? | CD5, DT21 | partial | high | [rustc guide](https://rustc-dev-guide.rust-lang.org/diagnostics.html) | UX-TEXT / error-message-anatomy |
| M086 | When does a diagnostic carry a stable error code and an explain page? | CD6 | uncovered | medium | grim and ocx have exit codes, not error codes | UX-TEXT / error-message-anatomy |
| M087 | How are suggestions worded and gated? | CD7 | uncovered | medium | Row 4 of `cli-first-run.md` suggests a command that does not exist | UX-TEXT / error-message-anatomy |
| M088 | When is a message part of the interface rather than a log line? | CD33 | uncovered | medium | grim logs leak into user output (`cli-first-run.md`) | UX-TEXT / error-message-anatomy |
| M089 | How is a warning introduced without causing warning fatigue? | DT22 | uncovered | medium | 70 `showWarningMessage` sites | UX-TEXT / error-message-anatomy |
| M090 | Which words are banned in error text? | CD2 | uncovered | high | Checkable by a deny-list | UX-TEXT / labels-and-wordlists |
| M091 | What is the length budget for titles, bodies and buttons? | CD4 | uncovered | medium | Checkable by count | UX-TEXT / labels-and-wordlists |
| M092 | Which button and link labels are allowed (verb plus object, no "click here")? | CD8, CG32, PI23, PR45 | partial | high | docs-quality covers link text in prose, not in UI | UX-TEXT / labels-and-wordlists |
| M093 | Sentence case or title case per surface? | CD10 | partial | medium | VS Code commands use title case by platform convention | UX-TEXT / labels-and-wordlists |
| M094 | How is a settings or toggle label worded? | CD38 | uncovered | medium | Extension configuration blocks | UX-TEXT / labels-and-wordlists |
| M095 | Is humour, an exclamation mark or emoji ever allowed in product strings? | CD29 | uncovered | medium | Agents add emoji | UX-TEXT / labels-and-wordlists |
| M096 | Which pronoun policy applies in system text? | CD40 | uncovered | low | Low cost to fix once decided | UX-TEXT / labels-and-wordlists |
| M097 | Do UI labels quoted in docs match the shipped UI, and how is drift detected? | CD19 | uncovered | medium | Checkable against the extension `package.json` | UX-TEXT / labels-and-wordlists |
| M098 | How is alt text written for UI and docs images? | CD26 | uncovered | medium | `docs-quality.md:184` lists alt text as governed nowhere | UX-TEXT / labels-and-wordlists |
| M099 | Which typography rules apply to UI strings (ellipsis character, quotes), given DOC-PLAIN-01? | CS37 | partial | medium | Possible rule collision (`config-inventory.md`) | UX-TEXT / labels-and-wordlists |
| M100 | Does an `aria-label` start with the visible label (WCAG 2.5.3)? | CD9 | uncovered | high | Checkable in the DOM | UX-TEXT / strings-that-survive |
| M101 | Is a status message self-sufficient when announced alone? | CD14 | uncovered | high | Pairs with M045 | UX-TEXT / strings-that-survive |
| M102 | Is every string built whole (no concatenation, no fragment plurals)? | CD20 | uncovered | high | Agents concatenate | UX-TEXT / strings-that-survive |
| M103 | Which CLDR plural categories apply, and how is a plural written? | CD21 | uncovered | medium | [CLDR plural rules](https://cldr.unicode.org/index/cldr-spec/plural-rules) | UX-TEXT / strings-that-survive |
| M104 | Which `Intl` formatter serves each value, with which fallback? | CD22, CD39 | uncovered | medium | Hand-formatted dates and sizes | UX-TEXT / strings-that-survive |
| M105 | How are dates, durations, numbers and units written in UI? | CD23, CD24 | partial | low | docs-quality covers prose | UX-TEXT / strings-that-survive |
| M106 | Is source English written so it translates, and does each string carry context? | CD25, CD27 | uncovered | low | No localisation in the fleet | Deferred: i18n |
| M107 | Voice versus tone, and who may break voice for legal text? | CD28, CD34 | uncovered | low | Shared with marketing voice work | Deferred: voice |
| M108 | Which reading level applies to product strings? | CD30 | partial | low | DOC-PLAIN covers long form | Route: docs-quality |
| M109 | Which verbs name UI elements in instructions? | CD18 | partial | low | Docs instruction style | Route: docs-quality |
| M110 | Is text written for scanning? | CG33 | covered | low | DOC-PLAIN and DOC-TYPE | Route: docs-quality |
| M111 | How does one know a string works (error rate, task success)? | CD36 | uncovered | low | Needs field data | Deferred: research methods |

### G. CLI interaction

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M112 | Do bare invocation and missing arguments print a short help? | DT1 | partial | high | CLI-12 covers line length only | UX-CLI / help-structure |
| M113 | Does `-h` work at any position? | DT2 | partial | medium | Cheap to test | UX-CLI / help-structure |
| M114 | Does help lead with examples and the common commands first? | CD32, PR43 | partial | high | ocx help is 126 lines with 1 example; `package` is row 14 of 23 (`cli-first-run.md`) | UX-CLI / help-structure |
| M115 | Which command grammar applies (noun-verb or verb-noun)? | DT19 | uncovered | medium | Two fleet CLIs, two grammars | UX-CLI / help-structure |
| M116 | Is help given in context rather than only in a manual? | CG35 | uncovered | medium | Error-to-help links | UX-CLI / help-structure |
| M117 | Which usability heuristics carry over to a CLI, and which CLI patterns need their own rules? | RM9, PI34 | uncovered | medium | Frames the CLI rules | UX-CLI / help-structure |
| M118 | Are `--version` and `-V` accepted, printing one parseable line? | DT3 | uncovered | high | `ocx --version` exits 64 (`cli-first-run.md`) | UX-CLI / discoverability-recovery |
| M119 | Are global flags accepted before and after the subcommand? | DT4 | uncovered | medium | `--json` position varies | UX-CLI / discoverability-recovery |
| M120 | When may a CLI suggest a typo correction, and may it ever run it? | DT8 | uncovered | high | No suggestion for a top-level ocx typo (`plugin_dispatch.rs:92`) | UX-CLI / discoverability-recovery |
| M121 | Are shell completions shipped and offered? | (`cli-first-run.md`) | partial | medium | shell-integration covers the hooks, not the offer | UX-CLI / discoverability-recovery |
| M122 | Do commands rely on recall where they could offer recognition? | CG36 | uncovered | medium | Package references are typed from memory | UX-CLI / discoverability-recovery |
| M123 | Does the CLI accept variable input forms? | CG34 | uncovered | low | Reference syntax tolerance | UX-CLI / discoverability-recovery |
| M124 | What is time to first success, and what is its budget? | DT35, DT36, OC2 | uncovered | high | No fleet number exists | UX-CLI / first-run-and-handoff |
| M125 | What should a first run print when nothing is configured? | OC38 | uncovered | high | Empty-state equivalent for CLIs | UX-CLI / first-run-and-handoff |
| M126 | Does the installer end by naming the first command? | PR44 | partial | high | Neither fleet installer names one (`cli-first-run.md`) | UX-CLI / first-run-and-handoff |
| M127 | Are spinners and animations screen-reader safe, with a static fallback? | DT10, AX20 | uncovered | high | Spinners in both CLIs | UX-CLI / terminal-accessibility |
| M128 | Which palette: the 16 themeable ANSI colours or fixed 256 or truecolour? | DT11, AX22 | partial | medium | CLI-07 covers on and off, not the palette | UX-CLI / terminal-accessibility |
| M129 | What is the precedence of `NO_COLOR`, `FORCE_COLOR`, `CLICOLOR` and `--color`? | DT12, AX19, CD31 | partial | high | grim logs leak ANSI when piped (`main.rs:458-462`) | UX-CLI / terminal-accessibility |
| M130 | Does meaning survive with colour off (symbols, words)? | DT13, AX21 | partial | high | TUI-22 covers TUIs only | UX-CLI / terminal-accessibility |
| M131 | Does WCAG, through WCAG2ICT, or the EAA reach a CLI? | AX23, RS29 | uncovered | high | Decides whether the CLI rules cite criteria ([WCAG2ICT](https://www.w3.org/TR/wcag2ict-22/)) | UX-CLI / terminal-accessibility |
| M132 | What is the first-output deadline, and what shows when output is not a TTY? | DT9 | covered | low | CLI-08, CLI-16 | Route: cli-contract |
| M133 | Does every prompt have a flag equivalent and a TTY check? | DT6 | covered | low | CLI-09 | Route: cli-contract |
| M134 | Which exit-code vocabulary is published? | DT15 | covered | low | Language cli-contract sets | Route: cli-contract |
| M135 | How long may command and flag descriptions be? | DT20 | covered | low | CLI-12 | Route: cli-contract |
| M136 | Does the tool edit config it does not own, with consent? | DT18 | covered | low | shell-integration | Route: shell-integration |
| M137 | Does a TUI restore the terminal on panic and log to a file? | DT23 | covered | low | TUI rules | Route: TUI rules |
| M138 | Where does each setting live, and in what precedence? | DT16 | uncovered | medium | Both CLIs have layered config | Deferred: CLI config |
| M139 | May a secret be accepted as a flag or environment variable? | DT17 | uncovered | medium | Security territory | Deferred: CLI config |
| M140 | Which config format and schema affordances suit human-edited files? | DT37 | uncovered | low | Formats chosen | Deferred: CLI config |
| M141 | Where do help and the crash path point for bug reports? | DT40 | uncovered | low | Low leverage | Deferred: misc patterns |
| M142 | Which keyboard shortcut conventions apply, and how is a command palette discovered? | CS36, PI27 | uncovered | low | Few shortcuts | Deferred: IA |
| M143 | How is API usability evaluated before release? | DT34 | uncovered | low | Process | Deferred: research methods |

### H. Consequential actions

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M144 | Confirmation, undo or nothing, by reversibility and frequency? | CG11, CS21, PI11, PR42 | uncovered | high | [NN/g confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/) | UX-ACT / confirmations-and-modals |
| M145 | Are destructive and safe actions separated, and are live and test modes impossible to confuse? | FCf6, FC5, FC6 | uncovered | high | The 2018 Hawaii false alert ([secondary](https://en.wikipedia.org/wiki/2018_Hawaii_false_missile_alert)) | UX-ACT / confirmations-and-modals |
| M146 | How is a destructive confirmation worded, and which button is the default? | CD11, CD37 | uncovered | high | 6 modal sites in the extension | UX-ACT / confirmations-and-modals |
| M147 | Is there a way out of every flow? | CG19 | uncovered | medium | Cancel paths in webviews | UX-ACT / confirmations-and-modals |
| M148 | Which CLI commands need a prompt, `--force`, `--dry-run` or typed confirmation, and does the CLI print what changed? | DT5, CD12, FC28 | partial | high | CLI-09 covers the TTY check, not the tiers | UX-ACT / cli-destructive-commands |
| M149 | Where must a tool-call approval be required, and what must the dialog show? | AI1, RS20 | uncovered | high | grim exposes an MCP server | UX-ACT / agent-action-approval |
| M150 | How is approval fatigue avoided without removing oversight? | AI3 | uncovered | high | [Anthropic sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing) | UX-ACT / agent-action-approval |
| M151 | Must automatic approvals be shown as automatic? | AI4 | uncovered | medium | [AI SDK tool usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) | UX-ACT / agent-action-approval |
| M152 | May tool annotations drive approval? | AI19, DT30 | uncovered | high | The MCP spec calls annotations untrusted ([spec](https://modelcontextprotocol.io/specification/latest/server/tools)) | UX-ACT / agent-action-approval |
| M153 | Which agent actions need undo, preview or a plan first? | AI18, PR46 | uncovered | high | grim install mutates client configs | UX-ACT / agent-action-approval |
| M154 | Is tool use logged and shown as an audit trail? | AI20 | uncovered | medium | Traceability | UX-ACT / agent-action-approval |
| M155 | Does an agent combine private data, untrusted content and outbound communication? | AI6 | uncovered | high | [Lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | UX-ACT / agent-action-approval |
| M156 | Is every mutating command idempotent, with a status command to confirm it? | DT31 | uncovered | high | Agents retry. Measured on the same mutating-command inventory as M148, so one dive runs both | UX-ACT / cli-destructive-commands |

### I. AI features

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M157 | Is the user told they are dealing with an AI, and when (AI Act Article 50(1))? | AI8, RS19 | uncovered | high | AI8 reports that Article 50 has applied since 2026-08-02 | UX-AI / ai-disclosure-and-labelling |
| M158 | Is content an AI feature generates inside the product marked in a machine-readable way (Article 50(2))? | AI9 | uncovered | medium | In-product output only. Generated release notes are marketing's release communication; generated docs fall under docs-quality DOC-PLAIN-22 | UX-AI / ai-disclosure-and-labelling (in-product); release notes named to marketing |
| M159 | What is the current state of Article 50 (code of practice, guidelines, omnibus)? | AI10 | uncovered | high | [Code of practice](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content), [omnibus](https://digital-strategy.ec.europa.eu/en/news/ai-omnibus-enters-force) | UX-AI / ai-disclosure-and-labelling |
| M160 | Should the AI label be a persistent, accessible control? | AI16 | uncovered | medium | UI half of disclosure | UX-AI / ai-disclosure-and-labelling |
| M161 | Are untrusted tool results and retrieved content kept apart from instructions? | AI5 | uncovered | high | [OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) | UX-AI / output-trust-and-safety |
| M162 | Must model-rendered markdown images and links be restricted? | AI7 | uncovered | high | Exfiltration channel | UX-AI / output-trust-and-safety |
| M163 | Which citation display is acceptable? | AI15 | uncovered | high | [arXiv 2304.09848](https://arxiv.org/abs/2304.09848) | UX-AI / output-trust-and-safety |
| M164 | When is confidence shown, and in which form? | AI12 | uncovered | medium | Agents print numeric confidence | UX-AI / output-trust-and-safety |
| M165 | Does an explanation help or increase overreliance? | AI13 | uncovered | medium | [arXiv 2006.14779](https://arxiv.org/abs/2006.14779) | UX-AI / output-trust-and-safety |
| M166 | Which uncertainty wording, and was it tested? | AI14 | uncovered | medium | [arXiv 2405.00623](https://arxiv.org/abs/2405.00623) | UX-AI / output-trust-and-safety |
| M167 | Which render states must a tool-call component handle? | AI2 | uncovered | high | AI SDK part states | UX-AI / conversation-mechanics |
| M168 | Can the user stop, regenerate or pause mid-stream? | AI27 | uncovered | high | [Shape of AI](https://www.shapeof.ai/) | UX-AI / conversation-mechanics |
| M169 | Is streaming output accessible (live regions, keyboard)? | AI32 | uncovered | high | Pairs with M045 | UX-AI / conversation-mechanics |
| M170 | Is capability stated up front, and does a chat box fit the task? | AI11, PR47 | uncovered | medium | [Microsoft HAI guidelines](https://www.microsoft.com/en-us/research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/) | UX-AI / conversation-mechanics |
| M171 | What happens on AI failure (return of control, alternative)? | AI29 | uncovered | medium | [PAIR errors](https://pair.withgoogle.com/chapter/errors-failing/) | UX-AI / conversation-mechanics |
| M172 | Can users see, edit and turn off memory? | AI31 | uncovered | medium | Memory features in agent clients | UX-AI / conversation-mechanics |
| M173 | How are prompt controls named and grouped? | AI28 | uncovered | low | Small surface | UX-AI / conversation-mechanics |
| M174 | Is there a notice for model or behaviour changes? | AI30 | uncovered | low | No hosted model | Deferred: AI misc |
| M175 | Is cost or quota shown before the action? | AI33 | uncovered | low | No metered feature | Deferred: AI misc |
| M176 | Can a user restore AI-suggested content after editing it? | AI17 | uncovered | low | No suggestion UI | Deferred: AI misc |
| M177 | Inline, fullscreen or picture-in-picture tool UI, and how narrow is an MCP App's CSP? | AI23, AI24, AI25 | uncovered | low | No MCP App in the fleet | Deferred: AI misc |
| M178 | Should a site expose tools through WebMCP? | RS21 | uncovered | low | Draft API | Deferred: AI misc |

### J. Agent-facing interfaces

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M179 | Do MCP tool descriptions say what the tool does and when to use it? | DT25 | partial | high | ai-config-authoring covers skills; `grim mcp` has no owner | UX-AGENT / tool-names-and-descriptions |
| M180 | How are tools named and namespaced, and how many should exist? | DT26 | partial | high | [Anthropic, writing tools](https://www.anthropic.com/engineering/writing-tools-for-agents) | UX-AGENT / tool-names-and-descriptions |
| M181 | How is an agent-facing interface evaluated? | DT29 | uncovered | medium | Decides the check | UX-AGENT / tool-names-and-descriptions |
| M182 | What is the machine-output contract (`--json` shape, schema version, additive change)? | DT14 | partial | high | `ocx about --json` fails (`cli-first-run.md`) | UX-AGENT / machine-output-contracts |
| M183 | Are help and error outputs stable enough to parse? | DT38 | uncovered | medium | Goldens exist only in the extension | UX-AGENT / machine-output-contracts |
| M184 | What is the response-size policy (concise mode, pagination, truncation notice)? | DT27 | uncovered | high | Agents drown in output | UX-AGENT / machine-output-contracts |
| M185 | Are tool and CLI errors actionable for a model (MCP `isError` versus protocol error)? | DT28, AI22 | uncovered | high | Row 19 of `cli-first-run.md` reports not-found as an auth failure | UX-AGENT / correctable-errors-and-retries |
| M186 | Which safe-error rules apply to tool and stream errors? | AI21 | uncovered | medium | Split between user and model | UX-AGENT / correctable-errors-and-retries |
| M187 | Should the site publish `llms.txt` and per-page Markdown? | DT32, DT33 | covered | low | DOC-AGENT-04 | Route: docs-quality |

### K. Navigation, information architecture and data display

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M188 | Hamburger or visible navigation? | CG15, PI20, PR40 | uncovered | low | The theme already decides; 2016 data | Deferred: IA |
| M189 | How deep may menus go? | PI21 | uncovered | low | Docs sidebars | Deferred: IA |
| M190 | When are breadcrumbs skipped? | PI22 | partial | low | docs-quality navigation | Deferred: IA |
| M191 | Search or navigation, and how do facets work? | PI24 | uncovered | medium | Catalog search | Deferred: IA |
| M192 | How many levels of progressive disclosure? | CG16, PI26, OC9 | uncovered | low | Settings view | Deferred: IA |
| M193 | Pagination, load more or infinite scroll? | PI14 | uncovered | low | Catalog lists | Deferred: IA |
| M194 | Table alignment and numerals? | PI15 | uncovered | medium | Catalog and indexer tables | Deferred: tables |
| M195 | Table density, sticky header and default sort? | PI16 | uncovered | low | Same | Deferred: tables |
| M196 | Tables on narrow screens? | PI17 | uncovered | low | Same | Deferred: tables |
| M197 | Which chart types and colours for dashboards? | PI18, PI19 | uncovered | low | No fleet dashboard | Deferred: tables |
| M198 | Which UI state must be deep-linkable? | CS28, PR41 | uncovered | medium | Docs tabs and filters | Deferred: misc patterns |
| M199 | When to deviate from convention, who absorbs complexity, and are Miller and Hick misapplied? | CG20, CG37, CG38 | uncovered | low | Framing, not rules | Deferred: meta |
| M261 | Three divergent copies of CommandBar, SiteHeader and SiteFooter (176/66, 175/85, 45/70/95 lines, 0 identical) | site-shape smell 5 | uncovered | medium | The UX consequence (inconsistent chrome and help order) is measured under M260; whether to extract one component is fleet engineering | Consistency effect: UX-A11Y / page-structure-and-consistency. Extraction: routed to the fleet's `ocx-theme-*` skills and the grimoire docs owners, not a catalog rule |
| M262 | May navigation advertise pages that do not exist (8 of 17 `nav.json` entries are `planned: true`)? | site-shape smell 10 | uncovered | medium | A link to nothing is a navigation and screen-reader defect; checkable by rendering `nav.json` | UX-A11Y / page-structure-and-consistency |

### L. Visual design

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M200 | How is visual hierarchy made and checked? | CG28 | uncovered | low | Judgement-heavy | Deferred: visual |
| M201 | Do spacing and type follow a scale? | CG29, CS32 | partial | low | Theme tokens | Route: css-theming |
| M202 | How many shades per colour, in which colour space? | CG30, PR57 | partial | low | Theme tokens | Route: css-theming |
| M203 | How many borders are too many? | CG31 | uncovered | low | Taste | Deferred: visual |
| M204 | Are shadows and radii taken only from tokens? | PR56 | partial | low | Theme tokens | Route: css-theming |
| M205 | Do glass surfaces keep text legible, and when to adopt a trend? | PR58, RS24, CS34 | uncovered | low | No glass in the theme | Deferred: visual |
| M206 | Which density defaults, and an opt-in compact mode? | CS18 | uncovered | low | Dense docs UI | Deferred: visual |
| M207 | Which motion durations are defensible? | CS9 | uncovered | low | Reduced motion is the duty; durations are taste | Deferred: visual |
| M208 | Which responsive breakpoints and minimum window sizes? | CS31 | partial | low | Theme layout | Deferred: visual |
| M209 | Which design system should an adopter copy? | CS35, PR60 | uncovered | low | Answered by frame correction 10 | Deferred: meta |
| M210 | `color-scheme`, `theme-color` and browser chrome integration? | CS38 | partial | low | Theme | Route: css-theming |
| M211 | Are generic agent layout defaults and sameness overridden? | FC18 | uncovered | low | Aesthetics | Deferred: visual |
| M263 | Does each consumer's design-system dependency match the published version (6 consumers, 5 `@ocx-sh/theme` specifiers, catalog on `^0.5.0` while the theme is 0.7.0)? | site-shape smell 4, contradiction 4 | uncovered | medium | The one checkable rule the audit proposes. It is a dependency-currency check on `package.json`, not an interface-design rule, and css-theming owns how tokens reach consumers | Route: css-theming next revision (generic row: a token consumer pins the current published version, CI flags a lag), and the fleet `ocx-theme-setup` skill for the specific package |

### M. Performance and platform

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M212 | Which Core Web Vitals thresholds and percentile apply? | CS4, CS7, RM14, RS14, PR54 | uncovered | medium | [web.dev vitals](https://web.dev/articles/vitals): 2.5 s, 200 ms, 0.1 at p75 | Deferred: performance |
| M213 | What causes image- and font-driven CLS and LCP regressions? | CS5 | uncovered | medium | Static sites | Deferred: performance |
| M214 | How is INP investigated? | CS6 | uncovered | low | Little JavaScript on the sites | Deferred: performance |
| M215 | How do soft navigations change CWV for an SPA? | RS15 | uncovered | low | grim-gui is a skeleton | Deferred: performance |
| M216 | Lab or field data, CrUX eligibility and exclusions? | RM13, RM15, RM16 | uncovered | medium | The fleet has no field data (`distribution-posture.md`) | Deferred: performance |
| M217 | Do good Core Web Vitals guarantee ranking? | RM17 | uncovered | low | Marketing territory (SEO) | Deferred: performance |
| M218 | When is anchor positioning or customisable select safe to ship? | RS9, RS10 | uncovered | low | Baseline policy | Deferred: platform |
| M219 | Which Baseline target does the project declare? | RS12 | uncovered | medium | Overlaps typescript-quality | Deferred: platform |

### N. Onboarding and activation

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M220 | What is the activation event, and how was it chosen? | OC1, OC49 | uncovered | low | No analytics | Deferred: onboarding |
| M221 | Is there a sandbox or demo path that needs no sign-up? | OC6, OC43 | uncovered | low | No accounts | Deferred: onboarding |
| M222 | Should account creation be forced before value? | OC10 | uncovered | low | No accounts | Deferred: onboarding |
| M223 | Is onboarding segmented by user fit? | OC34, OC50 | uncovered | low | Small audience | Deferred: onboarding |
| M224 | Are checklists and tours worth it? | OC39, OC47 | uncovered | low | None in the fleet | Deferred: onboarding |
| M225 | Is the onboarding artifact itself accessible? | OC40 | uncovered | low | Covered by UX-A11Y if built | Deferred: onboarding |
| M226 | When do surveys and permission prompts fire? | OC35, OC45, OC46 | uncovered | low | None in the fleet | Deferred: onboarding |
| M227 | Is time to value the goal, and how is the trial model chosen? | OC51, OC52 | uncovered | low | Marketing territory | Deferred: onboarding |
| M228 | Does a quickstart reach success in a bounded number of copy-paste blocks? | OC3 | partial | medium | docs-quality owns quickstarts | Route: docs-quality |

### O. Authentication

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M229 | When are API keys provisioned at sign-up, and how are they scoped? | OC4 | uncovered | low | No sign-up | Deferred: auth |
| M230 | Should a CLI sign-in use the OAuth device flow, and how are polling and expiry shown? | OC5 | uncovered | medium | `grim login` exists ([RFC 8628](https://www.rfc-editor.org/rfc/rfc8628)) | Deferred: auth |
| M231 | Are password fields built for password managers, and does the policy fight the user? | OC15, OC16 | uncovered | low | No passwords | Deferred: auth |
| M232 | How do anti-enumeration login errors trade off against usability? | OC17 | uncovered | low | No web login | Deferred: auth |
| M233 | Passkey autofill and creation prompts? | OC18, OC19, RS7 | uncovered | low | No web login | Deferred: auth |
| M234 | Must social login offer a privacy-limited equivalent? | OC20 | uncovered | low | App-store rule | Deferred: auth |
| M235 | Can users delete their account in-app? | OC21 | uncovered | low | No accounts | Deferred: auth |

### P. Commerce, deceptive patterns and consent

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M236 | Is cancelling as easy as signing up? | FCf3, FC7, OC37, OC44 | uncovered | medium | High for software teams with subscriptions; no fleet flow | Deferred: commerce |
| M237 | What is the legal status of click-to-cancel after the vacatur? | FC8, PR52 | uncovered | low | Dated legal fact | Deferred: commerce |
| M238 | Are accept and decline symmetric, and is refusal honoured? | FCf4, FC9, FC10 | uncovered | medium | No consent banner in the fleet | Deferred: commerce |
| M239 | What do DSA Article 25 and the Digital Fairness Act proposal forbid? | FC11 | uncovered | low | Legal | Deferred: commerce |
| M240 | Which deceptive patterns are checkable in code? | FC12, PR51, OC36, CG27 | uncovered | medium | Checkable, but no fleet commerce | Deferred: commerce |
| M241 | Is the full price shown before the last step? | FC13, OC26 | uncovered | low | No checkout | Deferred: commerce |
| M242 | Is guest checkout allowed, and how long may checkout be? | FC14, FCf5, PR53 | uncovered | low | No checkout | Deferred: commerce |
| M243 | What must trial and auto-renewal flows disclose? | OC22, OC23, OC41 | uncovered | low | No paid tier | Deferred: commerce |
| M244 | Are plans comparable on a pricing page? | OC25, OC42 | uncovered | low | Marketing territory | Deferred: commerce |
| M245 | Is a consent banner needed at all, and which signals (GPC) must be honoured? | RS22, RS23, RM21 | uncovered | low | Marketing analytics territory | Deferred: commerce |
| M246 | Is cookieless analytics still tracking? | RM22 | uncovered | low | No analytics by decision | Deferred: commerce |
| M247 | When is session replay a legal exposure, and is consent obtained first? | RM23, RM24 | uncovered | low | No replay | Deferred: commerce |

### Q. Research methods

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M248 | Is five users enough, and how many per method? | RM2, RM3, PR49 | uncovered | low | Process advice | Deferred: research methods |
| M249 | Which method answers which question? | RM4 | uncovered | low | Process advice | Deferred: research methods |
| M250 | How are tasks and interview questions written without priming? | RM5, RM6, RM7 | uncovered | low | Process advice | Deferred: research methods |
| M251 | Which questionnaire, and is a small-sample score reportable? | RM10, RM11 | uncovered | low | Process advice | Deferred: research methods |
| M252 | Which HEART categories and signals? | RM12 | uncovered | low | No telemetry | Deferred: research methods |
| M253 | Can the site run an A/B test, and is the result valid (SRM, peeking, novelty, shallow metrics)? | RM18, RM19, RM20, OC28, OC29, OC31, OC32, OC33 | uncovered | low | Traffic too low | Deferred: research methods |
| M254 | May an AI interviewer run discovery interviews? | RM28 | uncovered | low | Process | Deferred: research methods |
| M255 | Opportunity solution trees and switch interviews? | RM29, RM30 | uncovered | low | Process | Deferred: research methods |
| M256 | Is the research artifact itself accessible? | RM33 | uncovered | low | Process | Deferred: research methods |
| M257 | When should a small team observe logs instead of researching? | RM35 | uncovered | low | Process | Deferred: research methods |
| M258 | Should a UI task have a fixed appetite? | PR59 | uncovered | low | Planning, not UX output | Deferred: research methods |

### R. Meta

| ID | Candidate | Scout rows | Coverage | Priority | Why | Disposition |
|---|---|---|---|---|---|---|
| M259 | How fast does UX guidance decay, and how is each dated fact recorded? | CG40, CS33, AX32, CD35, DT39, FC29, OC30, PI33, RM34, RS27, AI34, PR61 | uncovered | high | Every scout raised it; laws, axe rules and platform limits change yearly | Convention for every dive: deliver dated-facts rows with re-check dates |

## Selected for this wave

Selection order: uncovered ground first, then leverage for the fleet and for software teams, then areas where agents demonstrably get it wrong, then checkability. Eight topics are selected, with 28 dives. Dives within a topic do not overlap, and where two dives read the same source, each brief names the fields it owns. Where two topics touch, the boundary is stated in the brief.

Shared measurement owners, so no measurement runs twice:

| Shared input | Owning dive | Other dives that use it |
|---|---|---|
| Live-region harness (virtual screen reader plus DOM-contract fallback) for discrete events | ux-a11y / announcements-and-motion | ux-ai / conversation-mechanics tests only the streaming case with the same tool; ux-text / strings-that-survive runs no live-region test |
| The 6 `modal: true` sites in the extension and the modal policy | ux-act / confirmations-and-modals | ux-state / editor-extension-surfaces excludes modals |
| Progress indicators | ux-state / loading-and-progress (in-page, including inside webviews) | ux-state / editor-extension-surfaces (native `window.withProgress` only) |
| `grim mcp` tool inventory | Split by field: names, descriptions and input schemas in ux-agent / tool-names-and-descriptions; annotations, mutation and `--allow-writes` gating in ux-act / agent-action-approval | |
| Mutating ocx and grim command inventory, closed-stdin runs and repeat runs | ux-act / cli-destructive-commands | ux-agent / correctable-errors-and-retries triggers error conditions only |
| Exemplar CLI installs | ux-cli / help-structure | ux-cli / discoverability-recovery reuses the install directory |

Hard limits for every dive, on top of the output contract:
- An agent worker cannot run a real screen reader here. A claim about what assistive technology speaks is either measured with a named tool and labelled with that tool's name and version, or labelled UNVERIFIED.
- A legal date, scope or exemption that was not read in a primary text this session must not become a rule row. It may appear only in the dated-facts table, marked UNVERIFIED, with the route that failed and a re-check date.

### 1. UX-VERIFY: ux-verification-claims

**Question:** What must an agent run on an interface change, and what may it claim afterwards about accessibility, performance and usability?

Why now: the gate the fleet has is a Lighthouse score (`ui-code-posture.md`), and agents routinely turn a lint pass into a conformance claim. Rows M001 to M016 and M019 to M025.

#### ux-verify / automated-a11y-coverage

Investigate which of the 55 WCAG 2.2 A and AA success criteria an automated engine can decide, and set the fleet's automated configuration.
Primary sources to fetch:
- the axe-core rule descriptions and API docs (https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md, https://github.com/dequelabs/axe-core/blob/develop/doc/API.md);
- the axe-core release notes for the current version (https://github.com/dequelabs/axe-core/releases);
- the W3C ACT rules list (https://www.w3.org/WAI/standards-guidelines/act/rules/);
- Playwright accessibility testing (https://playwright.dev/docs/accessibility-testing);
- the Deque coverage report, labelled vendor data (https://www.deque.com/automated-accessibility-coverage-report/).
Measure, do not cite:
- run axe with default tags and with `wcag22aa` plus `target-size` on the built ocx.sh, grimoire.rs and one MkDocs site;
- record violations, `incomplete` and `inapplicable` counts per criterion;
- run Lighthouse on the same pages and list every axe violation a score of 100 still hides;
- map each of the six WebAIM Million 2026 categories (RS17) to the axe rule that detects it, so the UX-A11Y preempt list has a check per item;
- check whether eslint-plugin-jsx-a11y, an Astro lint plugin or anything else lints `.astro` files and HTML template strings in the VS Code webviews.
Start from M001 to M007 and M017, and scout rows AX1 to AX5, AX14, AX15, AX33, CS27, RM31, RS17 and FC17.
The deliverable must decide:
- the exact axe tag and rule set, and the CI tier it runs in;
- which criteria the gate covers, which it covers partly and which are human-only, as one table of 55 rows;
- whether a Lighthouse score may appear in a claim at all;
- which coverage figure, if any, the skill may quote, with its source and date.
Out of scope: authoring defaults (UX-A11Y) and the claims wording (the evidence-and-claims dive).

#### ux-verify / rendered-interaction-matrix

Investigate the minimum rendered and interactive pass an agent must run after a UI change, beyond static checks.
Primary sources to fetch:
- WCAG 2.2 Understanding pages for 1.4.10 Reflow, 1.4.4 Resize Text, 2.4.7, 2.4.11 and 2.1.2 (https://www.w3.org/WAI/WCAG22/Understanding/);
- GOV.UK testing with assistive technologies (https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies);
- the WebAIM screen reader survey (https://webaim.org/projects/screenreadersurvey10/);
- Playwright docs for keyboard, emulated media and forced colours.
Measure, do not cite:
- write and run one Playwright script against the theme's dev build that covers 320 CSS px width, zoom at 200 and 400 percent, light and dark, forced colours, reduced motion, and a Tab walk;
- the Tab walk records each focused element's name and whether its focus ring is visible and unobscured;
- report what it finds on three real pages, and time the run.
Start from M008 to M010, M049 and scout rows RS16, RS28, FC21, CS15, CS17 and AX16.
The deliverable must decide:
- the matrix of conditions and the pass condition for each;
- which conditions run in CI and which run in the review skill;
- which screen reader and browser pairs a human pass uses, and when;
- the script, committed under the skill's `checks/` folder.
Out of scope: token contrast values (css-theming), the axe configuration (the automated-a11y-coverage dive) and page landmarks (UX-A11Y page-structure-and-consistency).

#### ux-verify / evidence-and-claims

Investigate what an agent may assert about usability and accessibility after a review, and the shape of a findings report a human can act on.
Primary sources to fetch:
- NN/g, the ten usability heuristics (https://www.nngroup.com/articles/ten-usability-heuristics/) and how to conduct a heuristic evaluation (https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/);
- NN/g on synthetic users, 2024-06-21 (https://www.nngroup.com/articles/synthetic-users/), synthetic users versus human respondents, 2026-10-16 (https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/), and AI simulation studies (https://www.nngroup.com/articles/ai-simulations-studies/);
- the LLM accessibility-audit papers in RM32, opened in full, because the scout saw them only as search results (https://link.springer.com/10.1007/s10209-024-01108-z, https://arxiv.org/html/2504.02110v1);
- W3C WCAG-EM, the evaluation methodology (https://www.w3.org/WAI/test-evaluate/conformance/wcag-em/; locate it on w3.org if moved), and the WCAG 2.2 success-criterion list as the ID whitelist;
- the Spectrum agent audit format named in `product-audit/exemplar-design-systems.md`.
Measure against a seeded answer key, not an impression:
- copy one theme page and one webview template under `~/.cache/research-lang/exemplars/product/seeded/`, and seed 20 known defects: 10 that axe detects and 10 it cannot (focus order, misleading name, unannounced state, colour-only cue, among others). Keep the answer key in a separate file;
- run axe and an unaided LLM code-read review over the seeded copies, three runs each;
- per run, count seeded defects found and missed, false findings, and criterion IDs that are wrong or do not exist in WCAG 2.2;
- label the result as n=20 defects in 2 files. It may set report fields and phrasing bans; it may not set a coverage percentage.
Start from M011 to M016 and scout rows RM1, RM8, RM25 to RM27, RM32, RM36, AX34, CG39, PI30, PR48 and PR50.
The deliverable must decide:
- the evidence classes (measured, rendered-checked, code-read, inferred) and the claim each one permits;
- the forbidden phrasings, for example "accessible", "WCAG compliant" and "users will";
- the fields a "needs human review" item must carry, and the criterion-ID whitelist check;
- the labelling rule for a UX statistic quoted inside a UX finding (sample, date, source, vendor label);
- what a synthetic-user run may be used for.
Cross-territory: statistics and claims in marketing copy, including onboarding benchmarks (OC27, OC48), belong to marketing's claim policy and are named, not covered.

#### ux-verify / conformance-targets-law

Investigate which conformance target the fleet and a typical software team must state, and which legal regimes bind them, from primary texts only.
Primary sources to fetch:
- WCAG 2.2 (https://www.w3.org/TR/WCAG22/) and the WCAG 3 status page (https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/);
- the ADA Title II rule (https://www.ada.gov/resources/2024-03-08-web-rule/);
- Directive (EU) 2019/882 through the Publications Office Cellar, which serves the Official Journal text without the EUR-Lex bot challenge: `curl -sL -H "Accept: application/xhtml+xml" -H "Accept-Language: eng" https://publications.europa.eu/resource/celex/32019L0882` (HTTP 200 with Article 32 present when tested for this map on 2026-11-27; `Accept: application/pdf` returns the PDF). Read Articles 2, 4(5), 14 and 32 and Annex I;
- EN 301 549 on ETSI (https://www.etsi.org/deliver/etsi_en/301500_301599/301549/), and its harmonised-standard reference in the Official Journal, fetched by the same Cellar route once its CELEX number is found on the Commission's harmonised-standards pages;
- one national transposition in its official gazette, for example the German BFSG (locate the current path on gesetze-im-internet.de);
- the Section 508 standards (https://www.access-board.gov/ict/) and the W3C policy listings (https://www.w3.org/WAI/policies/).
Measure, do not cite: diff the EN 301 549 v3.2.1 and v4.1.1 clause lists for web, software and documentation, and count the added and changed clauses.
Start from M019 to M025 and scout rows RS1 to RS3, RS32, RS33, AX24 to AX28, CS25, CS26, PR34, FC19 and FC20.
The deliverable must decide:
- the target string the rule states (version and level);
- for each regime (ADA Title II, EAA, EN 301 549, Section 508): the date, who it binds, whether a free open-source developer tool is reached, and a re-check date;
- what a conformance statement may say;
- the overlay ban.
Hard limit: a legal date or scope not read in a primary text this session must not become a rule row. It goes only into the dated-facts table, marked UNVERIFIED, with the failed route and a re-check date.

### 2. UX-A11Y: ux-a11y-authoring

**Question:** Which accessibility properties must an agent build into interface code and page templates by default, and which ARIA and custom widgets must it refuse to write?

Why now: this is the largest uncovered checkable ground. The theme's targets, focus, contrast and motion fail measurably (`ui-code-posture.md`), the extension has 149 `aria-` uses with no rule over them, and page-level accessibility of the docs sites is declared unowned (`rules/docs-quality.md:184`). Rows M017, M028 to M049, M055 (page half), M057 (terminal half routed to UX-CLI) and M260 to M262.

#### ux-a11y / native-widgets-and-keyboard

Investigate when an agent must use a native element, and the exact keyboard and name contract when it cannot.
Primary sources to fetch:
- the WAI-ARIA APG patterns, read-me-first and each pattern the fleet uses: dialog, tabs, combobox, listbox, menu button, disclosure, switch, toolbar (https://www.w3.org/WAI/ARIA/apg/patterns/);
- ARIA in HTML (https://www.w3.org/TR/html-aria/);
- MDN for the Popover API and Invoker Commands (https://developer.mozilla.org/en-US/docs/Web/API/Popover_API, https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API);
- Primer on links and buttons (https://primer.style/accessibility/design-guidance/links-and-buttons/);
- the VS Code webview UX guidelines (locate them on code.visualstudio.com);
- WebAIM Million 2026 (https://webaim.org/projects/million/), as the ranking input: missing labels, empty links and empty buttons are three of the six categories that make up 96 percent of detected errors (RS17).
Measure, do not cite:
- inventory every interactive custom widget in `ocx-sh/website/packages/theme` and `grimoire-rs/vscode/src/views`;
- for each, record its element, role, name source and keyboard handling;
- count click handlers on non-interactive elements, redundant roles, unlabelled inputs, empty links and empty buttons.
Start from M017, M028 to M037 and M049, and scout rows AX9 to AX13, AX30, CG1, CG2, CG24, CS14, CS15, CS22, FC2 to FC4, FCf2, FCf8, PI25, RS8, RS13, RS17, RS18 and PR33.
The deliverable must decide:
- the native-first list ("use X, never hand-build Y"), ordered by the RS17 ranking;
- the ARIA never-write list, with a Detect line for each;
- the keyboard contract per pattern;
- the accessible-name rule for icon controls, and links versus buttons;
- which `ocx-theme-*` rows are absorbed into the catalog.
Out of scope: the wording of names (UX-TEXT), focus styling (next dive) and page landmarks and headings (page-structure-and-consistency).

#### ux-a11y / focus-contrast-target-size

Investigate the visual accessibility floors an agent must meet in CSS and components: focus indicators, contrast, target size and colour-only cues.
Primary sources to fetch:
- WCAG 2.2 Understanding for 2.4.7, 2.4.11, 2.4.13, 1.4.3, 1.4.11, 1.4.1, 2.5.8 and 2.5.5 (https://www.w3.org/WAI/WCAG22/Understanding/);
- the GOV.UK focus states page (https://design-system.service.gov.uk/get-started/focus-states/);
- Primer size primitives (https://primer.style/product/primitives/size/);
- the APCA repository, as non-normative (https://github.com/Myndex/apca-w3);
- Roselli on WCAG 3 contrast (https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html);
- WebAIM Million 2026 (https://webaim.org/projects/million/): low contrast is the most common detected failure, on 83.9 percent of home pages (RS17).
Measure, do not cite:
- rerun the `ui-code-posture.md` contrast script on both themes of the theme package and of the Grimoire docs, including borders and focus rings;
- compute the rendered size of every control token, applying the 24 px spacing exception;
- trace `command-bar.css:141-143`;
- grep for colour-only status in the theme and webviews.
Start from M039 to M044 and scout rows CS1 to CS3, CS12 to CS14, AX6, AX7, AX21, AX31, CG3, CG4, CG17, PI8, PI10, RS4, RS5, RS17, RS25, RS34, PR28, PR29, PR31, FC1, FC21 and FCf1.
The deliverable must decide:
- the focus rule, with a Detect line that does not flag `outline:none` when a replacement exists;
- the contrast pairs to check and their thresholds;
- the target-size floor per surface (web, touch, editor webview), with the exceptions stated;
- the colour-plus-second-cue rule.
Out of scope: token architecture (css-theming).

#### ux-a11y / announcements-and-motion

Investigate how agent-written UI must announce discrete state changes and handle motion. This dive owns the live-region harness; streaming output is UX-AI conversation-mechanics, and the announced words are UX-TEXT.
Primary sources to fetch:
- WCAG 2.2 Understanding for 4.1.3 Status Messages (https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), 2.3.3 Animation from Interactions (https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), 2.2.2 and 2.3.1;
- the APG switch and button patterns, for pressed state;
- Primer motion and animation (https://primer.style/accessibility/design-guidance/motion-and-animation/) and Carbon motion (https://carbondesignsystem.com/elements/motion/overview/);
- MDN View Transition API (https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API);
- the Guidepup virtual screen reader (https://github.com/guidepup/virtual-screen-reader). Record its version, and what its docs say about live regions and about fidelity: its README says it augments, not replaces, real screen-reader testing.
Measure, do not cite:
- count `animation`, `transition`, `transition: all` and view-transition uses against `prefers-reduced-motion` blocks in the theme, the Grimoire docs and the webviews;
- under the cache directory, write a Vitest test that mounts the theme's copy button, theme switch and command bar markup, activates each, and records the virtual screen reader's spoken-phrase log, including double announcements;
- if the tool does not log live-region output, say so, assert the DOM contract instead (role, `aria-live`, `aria-atomic`, region present before the update), and label every spoken-output claim UNVERIFIED.
Start from M045 to M048 and scout rows AX17, AX18, PI9, CS10, CS11, CS39, RS11, PR35 and FC22.
The deliverable must decide:
- the live-region rule (which role for which event, one region per page, no `alert` for success);
- the state-exposure rule for toggles;
- the reduced-motion rule, with a Detect line;
- the autoplay and flashing limits;
- the harness, committed under the skill's `checks/` folder.

#### ux-a11y / page-structure-and-consistency

Investigate the page-level accessibility of the fleet's rendered pages, docs and app alike, which `rules/docs-quality.md:184` declares governed nowhere, and the consistency duties across the sub-sites served under one domain.
Primary sources to fetch:
- WCAG 2.2 Understanding for 1.3.1, 2.4.1 Bypass Blocks, 2.4.2, 2.4.6, 3.1.1, 3.2.3 Consistent Navigation, 3.2.4 Consistent Identification and 3.2.6 Consistent Help (https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html);
- the WCAG 2.2 definition of "set of web pages" (https://www.w3.org/TR/WCAG22/);
- the APG landmark regions practice (https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/);
- the Starlight override docs and the MkDocs Material template-override docs (locate them on starlight.astro.build and squidfunk.github.io/mkdocs-material).
Measure, do not cite:
- on the built output of ocx.sh, `/docs/`, `/install/`, grimoire.rs and the indexer catalog, record per page template: landmarks, `h1` count, heading-level skips, skip link, `lang`, and the order of navigation, help and footer items;
- diff that order across the three CommandBar, SiteHeader and SiteFooter copies (`product-audit/site-shape.md` section 3 and smell 5), and across sites on different theme specifiers (smell 4);
- render the 8 `planned: true` entries in `nav.json` (smell 10), and record whether each is a link, where it points and what its accessible name says.
Start from M038, M055 (page half) and M260 to M262, and scout rows FC26, PR55, AX5, AX29 and PR30.
The deliverable must decide:
- the landmark, heading, skip-link and `lang` minimum for every page template;
- whether the ocx.sh sub-sites form one "set of web pages", and so what 3.2.3, 3.2.4 and 3.2.6 require of their chrome;
- how a navigation entry for a page that does not exist may render;
- the ownership split as one line each for ux-quality (templates, chrome, rendered page) and docs-quality (Markdown content);
- which checks run on `.astro` and `.html` sources and which only on built pages.
Out of scope: extracting the duplicated chrome and the theme-version currency check (both routed: M261, M263) and widget keyboard contracts (native-widgets-and-keyboard).

### 3. UX-STATE: ux-interface-states

**Question:** Which states must every view, async action and form render, with which indicator at which wait, and how does a rule detect a missing state?

Why now: agents write the happy path, and nothing in the catalog covers web or editor states. The extension has 183 message calls and 0 progress calls. Rows M058 to M064, M066, M067 and M073 to M078.

#### ux-state / loading-and-progress

Investigate the feedback ladder for web and webview UI: response-time budgets, the choice of indicator, click acknowledgement and double-submit protection.
Primary sources to fetch:
- NN/g response times (https://www.nngroup.com/articles/response-times-3-important-limits/) and skeleton screens (https://www.nngroup.com/articles/skeleton-screens/);
- Primer loading (https://primer.style/product/ui-patterns/loading/);
- web.dev INP (https://web.dev/articles/inp);
- the Vercel web interface guidelines (https://github.com/vercel-labs/web-interface-guidelines);
- the catalog's own CLI-08, CLI-16 and TUI-23 text, for alignment.
Measure, do not cite:
- in the theme and inside the webviews' HTML, find every async action (fetch, `postMessage` round-trip, command);
- record whether each shows an in-page indicator, when it appears, and whether repeat activation is blocked;
- time three real actions with throttled network.
Start from M058 to M061 and scout rows CG12, CG13, CG22, CG23, CS8, CS20, PI1, PI2 and AI26.
The deliverable must decide:
- the indicator ladder by expected wait, aligned with TUI-23 so the web and terminal ladders do not contradict each other;
- the acknowledgement deadline;
- the double-submit rule;
- a Detect line for each.
Out of scope: empty and error content (next dive), CLI progress (covered by CLI-08), and native VS Code progress through `window.withProgress` (editor-extension-surfaces).

#### ux-state / empty-error-notification

Investigate the required states of a data view and the choice of non-modal message channel.
Primary sources to fetch:
- NN/g empty states (https://www.nngroup.com/articles/empty-state-interface-design/);
- Primer empty states and notification messaging (https://primer.style/product/ui-patterns/empty-states/, https://primer.style/product/ui-patterns/notification-messaging/);
- the Vercel guidelines on all states;
- the GOV.UK notification banner component (https://design-system.service.gov.uk/components/notification-banner/).
Measure, do not cite:
- list every data view in the theme (search, package lists, catalog renderers) and in the webviews (sidebar, details, settings);
- for each, record which of loading, empty, error, partial, offline and overflow it renders;
- force each missing state and screenshot the result.
Start from M062 to M064 and scout rows CG14, CD13, CS29, CS30, FC16, OC7, PI12, PI13 and PI29.
The deliverable must decide:
- the state matrix every data view must satisfy;
- the empty-state contents, separated from loading;
- the banner, inline or toast decision table, with persistence and timeout rules;
- how a review detects a missing state.
Out of scope: error wording (UX-TEXT), VS Code native surfaces (editor-extension-surfaces) and when a modal is justified (UX-ACT confirmations-and-modals).

#### ux-state / form-state-machine

Investigate the behaviour of forms: labels, validation timing, error placement and focus, preserved input and submit state.
Primary sources to fetch:
- the GOV.UK validation pattern, error message and error summary pages (https://design-system.service.gov.uk/patterns/validation/, https://design-system.service.gov.uk/components/error-message/, https://design-system.service.gov.uk/components/error-summary/);
- NN/g on form errors (https://www.nngroup.com/articles/errors-forms-design-guidelines/);
- Smashing on inline validation (https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/);
- the Baymard inline-validation article cited in PR36;
- WCAG 2.2 Understanding for 3.3.1, 3.3.3 and 1.3.5.
Measure, do not cite:
- inventory every form and input in the theme and the extension (settings, rating, vote, input boxes);
- record label source, validation trigger, error placement, `aria-describedby`, focus after a failed submit, preserved input and the submit `disabled` logic.
Start from M067 and M073 to M078 and scout rows CG5, CG8, CG18, CD15 to CD17, CS19, CS20, PI3, PI4, FC15, OC12 and PR36 to PR39.
The deliverable must decide:
- one default validation timing, and the exceptions;
- the error placement and focus rule;
- the never-pre-disable rule;
- the required and optional marking;
- a Detect line for each.
Out of scope: error message wording (UX-TEXT error-message-anatomy) and long-form or wizard design (deferred).

#### ux-state / editor-extension-surfaces

Investigate which native VS Code surface an extension should use for which message and state.
Primary sources to fetch:
- the VS Code UX guidelines pages for notifications, quick picks, status bar, views, webviews and progress (locate them under code.visualstudio.com/api/ux-guidelines);
- the VS Code API reference for `window.withProgress`, the message functions and `WebviewView`;
- `grimoire-rs/vscode/CLAUDE.md`.
Measure, do not cite:
- reproduce the counts in "Measurements made for this map";
- classify each of the 183 message calls by severity, whether it offers actions, and whether a native surface (status bar, progress notification, inline view state) fits better;
- list each long-running extension-host operation and whether it reports native progress;
- check whether the webviews follow the VS Code theme tokens and keyboard model.
Start from M066 and the measurements table; this dive has no scout rows, because no scout covered editor extensions.
The deliverable must decide:
- the surface decision table for an editor extension;
- the notification budget;
- the native progress rule, taking the wait thresholds from the NN/g response-time page so the consolidator can align it with loading-and-progress;
- which rules apply to webviews as web UI (UX-A11Y and UX-STATE) and which to native surfaces;
- how the rule loads on extension sources.
Out of scope: the 6 modal sites and destructive confirmations (UX-ACT confirmations-and-modals) and indicators inside webview HTML (loading-and-progress).

### 4. UX-TEXT: ux-interface-text

**Question:** What must runtime interface text contain, and which words and string constructions must an agent never ship?

Why now: docs-quality governs prose, not runtime strings. Of 20 fleet errors, 9 state why and 11 a next step, and one suggests a command that does not exist (`cli-first-run.md`). Rows M084 to M105.

#### ux-text / error-message-anatomy

Investigate the required parts of an error, warning or diagnostic message, for GUI and CLI alike.
Primary sources to fetch:
- NN/g error message guidelines (https://www.nngroup.com/articles/error-message-guidelines/);
- the rustc diagnostics guide (https://rustc-dev-guide.rust-lang.org/diagnostics.html);
- the Heroku CLI style guide (https://devcenter.heroku.com/articles/cli-style-guide);
- clig.dev (https://clig.dev/);
- the GOV.UK error message component;
- the Primer content guidelines (https://primer.style/foundations/content);
- the O'Reilly piece behind FC27 (https://www.oreilly.com/radar/?p=19843), for the plain-language limit on errors and confirmations.
Measure, do not cite:
- score 20 error outputs from each of six exemplar CLIs (cargo, gh, uv, kubectl, terraform, deno or similar; clone or unpack under `~/.cache/research-lang/exemplars/product/`) with the four-part legend of `cli-first-run.md` (what, why, next step, input echoed);
- score the extension's 5 production `showErrorMessage` sites the same way;
- report the distributions.
Start from M084 to M089 and scout rows CD1, CD3, CD5 to CD7, CD33, CG9, DT7, DT21, DT22 and FC27.
The deliverable must decide:
- the mandatory parts and their order;
- the diagnostic shape for CLIs;
- when an error code and explain page are required;
- suggestion wording, and the rule that a suggested command must exist;
- the boundary between log lines and interface messages;
- the warning policy.
Out of scope: word deny-lists (next dive) and machine-readable errors (UX-AGENT).

#### ux-text / labels-and-wordlists

Investigate the word-level rules for labels, buttons, links, toggles, alt text and short strings, and how precise a deny-list check can be.
Primary sources to fetch:
- GOV.UK A to Z style guide (https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/) and button component (https://design-system.service.gov.uk/components/button/);
- Primer content guidelines;
- NN/g on "learn more" links (https://www.nngroup.com/articles/learn-more-links/);
- the W3C alt decision tree (https://www.w3.org/WAI/tutorials/images/decision-tree/);
- the VS Code command naming conventions;
- the catalog's DOC-PLAIN-01 and DOC-PLAIN-15 text, to resolve collisions.
Measure, do not cite:
- build a candidate deny-list (for example "please", "oops", "invalid", "click here", "OK" as a lone label), run it over the strings in the theme, the extension and both CLIs, and report true and false positives and precision per term;
- sample 50 images across the theme and the ocx and grimoire docs trees, and classify each alt text as missing, empty-and-decorative, redundant or informative;
- check the extension's `package.json` titles against the README and docs for drift.
Start from M090 to M099 and scout rows CD2, CD4, CD8, CD10, CD19, CD26, CD29, CD38, CD40, CG32, CS37, PI23 and PR45.
The deliverable must decide:
- the deny-list that survives a precision threshold;
- the label grammar, and case per surface, with the VS Code exception;
- the emoji and exclamation rule;
- the alt-text rule for UI and docs images, written so docs-quality can point to it;
- the docs-to-UI drift check;
- how the UI typography rule coexists with DOC-PLAIN-01.
Out of scope: whether a control has a name at all (UX-A11Y).

#### ux-text / strings-that-survive

Investigate how strings must be built so they stay correct when read alone, pluralised, formatted or later translated.
Primary sources to fetch:
- WCAG 2.2 Understanding for 2.5.3 Label in Name (https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html);
- CLDR plural rules (https://cldr.unicode.org/index/cldr-spec/plural-rules);
- MDN `Intl.PluralRules`, `DateTimeFormat`, `RelativeTimeFormat` and `ListFormat`;
- ICU MessageFormat (https://unicode-org.github.io/icu/userguide/format_parse/messages/);
- MessageFormat 2 (https://messageformat.unicode.org/).
Measure, do not cite, statically only (no live-region runs; announcements-and-motion owns those):
- grep the theme, the extension and both CLIs for string concatenation around counts, hand-written plurals (`s` suffixes, `(s)`), hand-formatted dates, sizes and durations, and `aria-label` values that do not start with the visible text;
- list every status-message string and record whether it names its subject and outcome without visual context;
- report counts with commands.
Start from M100 to M105 and scout rows CD9, CD14, CD20 to CD24 and CD39.
The deliverable must decide:
- the whole-string rule and the plural rule;
- which formatter serves each value type in TypeScript and in Rust (name the crates, from their docs);
- the label-in-name rule;
- the self-sufficient status-string rule;
- a Detect line for each.
Out of scope: full localisation workflow (deferred) and live-region mechanics (UX-A11Y).

### 5. UX-CLI: ux-cli-interaction

**Question:** Above the pinned stream, colour, prompt and exit contracts, what does a CLI owe a first-time human and an everyday user?

Why now: the CLIs are the fleet's primary surface. `cli-first-run.md` measured gaps in help, version, typo recovery and first run that no cli-contract rule covers. Rows M112 to M131.

#### ux-cli / help-structure

Investigate the shape of top-level and subcommand help.
Primary sources to fetch:
- clig.dev (https://clig.dev/);
- the GitHub CLI syntax guide (https://github.com/cli/cli/blob/trunk/docs/command-line-syntax.md);
- the Heroku CLI style guide;
- the clap documentation for help templates and `help_heading`;
- the catalog's CLI-12 text.
Measure, do not cite:
- for at least 12 exemplar CLIs (git, cargo, gh, uv, npm, docker, kubectl, terraform, deno, rustup, brew, fly or similar, installed or run from release archives under the cache directory, which discoverability-recovery reuses), record:
  - line counts of `--help` and of bare invocation;
  - examples count;
  - grouping;
  - position of the most common command;
  - whether `-h` works after other arguments;
- compare with ocx 0.6.8 and grim 0.16.0.
Start from M112 to M117 and scout rows DT1, DT2, DT19, CD32, CG35, PR43, RM9 and PI34.
The deliverable must decide:
- the help skeleton (order of sections, examples first or not, grouping, length budget);
- bare-invocation behaviour;
- the command-grammar rule;
- a check that runs the binary and asserts these.
Out of scope: description line length (CLI-12).

#### ux-cli / discoverability-recovery

Investigate how a CLI helps a user who mistypes, cannot remember, or asks which version they have.
Primary sources to fetch:
- clig.dev;
- the clap docs for suggestions and `version` flags;
- the git `help.autocorrect` documentation;
- the cargo and gh behaviour on unknown commands;
- shell completion docs for clap_complete.
Measure, do not cite:
- for the same exemplar CLIs as the help-structure dive (reuse its install directory), run a typo at the top level, a typo at the subcommand level and a typo in a flag;
- run `--version` and `-V`, with the exit code and stdout;
- run a global flag before and after the subcommand;
- check whether completions install and are offered;
- record the outputs verbatim.
Start from M118 to M123 and scout rows DT3, DT4, DT8, CG34 and CG36, and the `cli-first-run.md` findings on `ocx --version` and `plugin_dispatch.rs:92`.
The deliverable must decide:
- the version rule;
- the typo rule (suggest at every layer; never auto-run without opt-in);
- the global-flag position rule;
- the completion offer;
- a binary test for each.
Out of scope: error wording (UX-TEXT).

#### ux-cli / first-run-and-handoff

Investigate what a CLI and its installer owe a new user from install to first success.
Primary sources to fetch:
- clig.dev;
- the installer pages and first-run output of uv, rustup, deno, bun and gh;
- the fleet's `installer-script` skill text;
- `site-shape.md` on how grim's install page starts with ocx's installer.
Measure, do not cite:
- in a clean container, time from the documented install command to the first useful output for ocx, grim and four exemplars;
- record each installer's final lines and each CLI's output with no config present;
- count copy-paste steps.
Start from M124 to M126 and scout rows DT35, DT36, OC2, OC38 and PR44.
The deliverable must decide:
- the installer's final-line rule (name the first command);
- the empty-config output rule;
- a time-to-first-success budget and how it is measured;
- which half belongs in `installer-script` and which in the new CLI reference.
Out of scope: docs quickstarts (docs-quality) and marketing install pages (marketing).

#### ux-cli / terminal-accessibility

Investigate accessibility duties for terminal output.
Primary sources to fetch:
- WCAG2ICT for WCAG 2.2 (https://www.w3.org/TR/wcag2ict-22/);
- the no-color spec (https://no-color.org/) and the FORCE_COLOR and CLICOLOR conventions (locate their primary pages);
- GitHub CLI accessibility notes and its `gh a11y` or accessibility settings docs (locate them on cli.github.com or github.blog);
- the WebAIM screen reader survey;
- the catalog's CLI-07 and TUI-22 text.
Measure, do not cite:
- run ocx and grim with each colour variable combination, piped and on a TTY, and record escape-code presence and the effective precedence;
- capture a spinner's raw byte stream with `script -q -c '<command>' <file>` (util-linux), and count carriage-return redraws and cursor-control sequences per second; this is what a terminal screen reader receives;
- check whether the output uses the 16 base colours or fixed indices.
No real terminal screen reader can run here. Any statement about what is spoken comes from a cited source or is labelled UNVERIFIED.
Start from M057 and M127 to M131 and scout rows DT10 to DT13, DT24, AX19 to AX23, CD31 and RS29.
The deliverable must decide:
- the colour precedence table, aligned with CLI-07;
- the spinner fallback rule, with a byte-stream check;
- the palette rule, and the meaning-without-colour rule for CLI output;
- which WCAG2ICT criteria the CLI reference cites;
- the TUI screen-reader stance.

### 6. UX-ACT: ux-consequential-actions

**Question:** When does an action need confirmation, undo, a dry run, typed confirmation, human approval or nothing, whether it is clicked, typed or called by an agent?

Why now: the same severity question recurs across GUI, CLI and agent tool calls, and no rule answers it. grim mutates client configs, and its MCP server exposes write tools behind `--allow-writes`. Rows M065, M144 to M156.

#### ux-act / confirmations-and-modals

Investigate confirmation versus undo in graphical UI, and when a modal dialog is justified at all. This dive owns the extension's 6 `modal: true` sites.
Primary sources to fetch:
- NN/g confirmation dialogs (https://www.nngroup.com/articles/confirmation-dialog/) and NN/g on modal and nonmodal dialogs (https://www.nngroup.com/articles/modal-nonmodal-dialog/);
- the APG alertdialog pattern (https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/);
- the GOV.UK button guidance on warning buttons;
- the Vercel guidelines on destructive actions;
- the FCC Public Safety and Homeland Security Bureau report on the 2018 Hawaii false alert (locate it on fcc.gov; the scouts had only the Wikipedia summary);
- the VS Code API reference for the `modal` message option.
Measure, do not cite:
- read the 6 `modal: true` sites and every delete, uninstall, overwrite or reset action in the extension and the theme;
- for each, record reversibility, frequency, whether it needs a modal by the NN/g criteria, confirmation wording, default button and whether undo exists.
Start from M065 and M144 to M147, and scout rows CG11, CG19, CG26, CS21, CD11, CD37, PI11, PR42, FC5, FC6 and FCf6.
The deliverable must decide:
- the severity tiers and the required treatment for each;
- when a modal is allowed, for GUI and for VS Code;
- the confirmation wording rule (name the object and outcome; verb labels) and the default-button rule;
- live and test mode separation;
- the way-out rule.
Out of scope: CLI and agent actions (next dives) and non-modal channels (UX-STATE empty-error-notification).

#### ux-act / cli-destructive-commands

Investigate mutating and destructive commands in a CLI, including what happens when an agent runs one twice. This dive owns the mutating-command inventory.
Primary sources to fetch:
- clig.dev on robustness and confirmation;
- the terraform plan and apply, kubectl `--dry-run`, git `clean -n`, and gh repo delete confirmation docs;
- the catalog's CLI-09 text.
Measure, do not cite:
- for three exemplars and for ocx and grim, list every mutating command; use a throwaway `HOME` and project directory under the cache directory, never a real config;
- run each with stdin closed and with no TTY, and record whether it prompts, fails or proceeds;
- record whether it offers `--dry-run`, requires typed confirmation for severe actions, and prints what changed;
- run each a second time, and record whether it reports "already done", repeats the change, or fails, with the exit code, and whether a status command can confirm the end state.
Start from M148 and M156, and scout rows DT5, DT31, CD12 and FC28.
The deliverable must decide:
- the CLI severity tiers (mild, moderate, severe), with the required flag and prompt behaviour for each;
- the dry-run rule and the typed-confirmation rule;
- the "print what changed" rule;
- the idempotency and "already done" rule, with its exit code;
- a binary test using closed stdin and a repeat run.
Out of scope: error classes and machine-readable errors (UX-AGENT correctable-errors-and-retries).

#### ux-act / agent-action-approval

Investigate how a human approves actions an agent takes through a tool server, measured in one real client and documented for a second.
Primary sources to fetch:
- the MCP tools specification at 2025-06-18, 2025-11-25 and latest (https://modelcontextprotocol.io/specification/2025-06-18/server/tools, https://modelcontextprotocol.io/specification/2025-11-25/server/tools, https://modelcontextprotocol.io/specification/latest/server/tools);
- Claude Code permissions and permission modes (https://code.claude.com/docs/en/permissions, https://code.claude.com/docs/en/permission-modes), with the page dates;
- VS Code agent approvals and tool management (https://code.visualstudio.com/docs/agents/run/approvals, https://code.visualstudio.com/docs/agents/run/tools), with the page dates;
- AI SDK tool approval (https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage), Anthropic on sandboxing (https://www.anthropic.com/engineering/claude-code-sandboxing) and the lethal trifecta (https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/).
Measure, do not cite:
- diff the three MCP spec versions for annotations, elicitation and the human-in-the-loop wording;
- in `grimoire-rs/grimoire/src/mcp/`, record per tool only its annotations, whether it mutates, and whether `--allow-writes` gates it (names and descriptions belong to UX-AGENT);
- in Claude Code 2.1.332, write a `--mcp-config` file under the cache directory that starts `grim mcp` against a throwaway `HOME`; run `claude -p --strict-mcp-config` once in the default permission mode and once with `--allowedTools` naming one read tool; record which grim calls run, which are denied, and the denial text;
- for VS Code, record the approval settings and whether annotations change confirmation from the docs only, labelled docs-derived. If Claude Code cannot authenticate in the sandbox, label its rows docs-derived as well.
Start from M149 to M155 and scout rows AI1, AI3, AI4, AI6, AI18 to AI20, DT30, RS20 and PR46.
The deliverable must decide:
- which tool calls need approval, and what the approval prompt must show;
- the rule that annotations are never a trust boundary;
- the fatigue controls (scoped allow-lists, sandbox) and auto-approval visibility;
- the audit-trail rule and the trifecta check.
Out of scope: tool descriptions (UX-AGENT) and rendering model output (UX-AI).

### 7. UX-AI: ux-ai-features

**Question:** What must a human-facing LLM interface disclose, show and refuse to render, and which of those duties are now law?

Why now: AI8 reports that EU AI Act Article 50 has applied since 2026-08-02, a date this wave must confirm from the Official Journal text. Agents build chat and tool-call UIs often, and no catalog artifact covers them. Rows M157 to M173.

#### ux-ai / ai-disclosure-and-labelling

Investigate disclosure and labelling duties for AI interaction and for AI-generated content shown inside a product.
Primary sources to fetch:
- Regulation (EU) 2024/1689 through the Publications Office Cellar: `curl -sL -H "Accept: application/xhtml+xml" -H "Accept-Language: eng" https://publications.europa.eu/resource/celex/32024R1689` (HTTP 200 with Article 50 present when tested for this map on 2026-11-27). Read Article 50, Article 113 on application dates, and the definitions in Article 3;
- the AI omnibus amending act: find its CELEX number from the omnibus notice (https://digital-strategy.ec.europa.eu/en/news/ai-omnibus-enters-force, dated 2026-07-27 per AI10), fetch it by the same Cellar route, and record every change to Article 50 or its dates;
- the Commission code of practice on AI-generated content (https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content, dated 2026-06-10 per AI10) and the guidelines page (https://digital-strategy.ec.europa.eu/en/news/supporting-implementation-ai-act-clear-guidelines);
- Carbon for AI (https://carbondesignsystem.com/guidelines/carbon-for-ai/).
Measure, do not cite: survey 10 developer-product AI features (editor assistants, docs chat, CLI assistants), and record where and when each discloses AI, whether the label is accessible, and whether generated output is marked.
Start from M157 to M160 and scout rows AI8 to AI10, AI16 and RS19.
The deliverable must decide:
- the disclosure rule (when, where, in what form);
- the marking rule for content generated inside the product;
- the accessible-label rule;
- the dated legal facts, each with its Official Journal source and a re-check date.
Hard limit: a legal date or obligation not read in the Official Journal text this session must not become a rule row. It goes only into the dated-facts table, marked UNVERIFIED.
Cross-territory: disclosure in marketing posts and videos, and the marking of generated release notes, belong to marketing; generated docs fall under docs-quality DOC-PLAIN-22. Named, not covered.

#### ux-ai / output-trust-and-safety

Investigate what an interface must do with model output before showing it.
Primary sources to fetch:
- OWASP LLM01 and LLM05 (https://genai.owasp.org/llmrisk/llm01-prompt-injection/ and the LLM05 page on the same site);
- arXiv 2304.09848 on citation verifiability (https://arxiv.org/abs/2304.09848);
- arXiv 2006.14779 on explanations and overreliance (https://arxiv.org/abs/2006.14779);
- arXiv 2405.00623 on uncertainty wording (https://arxiv.org/abs/2405.00623);
- PAIR on explainability and trust (https://pair.withgoogle.com/chapter/explainability-trust/).
Measure, do not cite:
- build a minimal markdown renderer test page;
- feed it model-style output with remote images, auto-linked URLs carrying query data, and HTML;
- record what three common renderers (marked, markdown-it, react-markdown or similar) do by default.
Start from M161 to M166 and scout rows AI5, AI7 and AI12 to AI15.
The deliverable must decide:
- the untrusted-content separation and labelling rule;
- the image and link restriction rule, with a Detect line;
- the citation display rule;
- when and how confidence is shown;
- the explanation stance, citing the effect sizes the papers report.
Out of scope: approval of actions (UX-ACT) and the security of the model pipeline (security territory, named only).

#### ux-ai / conversation-mechanics

Investigate the interaction mechanics of chat and agent UIs, including how streamed output reaches assistive technology.
Primary sources to fetch:
- AI SDK chatbot and tool-usage docs, for part states (https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage);
- Shape of AI (https://www.shapeof.ai/);
- the Microsoft guidelines for human-AI interaction (https://www.microsoft.com/en-us/research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/);
- PAIR errors and failing (https://pair.withgoogle.com/chapter/errors-failing/);
- the OpenAI Apps SDK UI guidelines (https://developers.openai.com/apps-sdk/concepts/ui-guidelines);
- WCAG 2.2 Understanding for 4.1.3, and the Guidepup virtual screen reader docs (https://github.com/guidepup/virtual-screen-reader).
Measure, do not cite:
- build a minimal streaming chat page under the cache directory with three live-region strategies: per token, per sentence, on completion;
- for each, record the virtual screen reader's spoken-phrase log (with the tool version), the number of announcements per 500 streamed tokens, and content that is never announced;
- if the tool does not log live-region output, measure DOM mutation counts per region instead and label every spoken-output claim UNVERIFIED.
Start from M167 to M173 and scout rows AI2, AI11, AI27 to AI29, AI31, AI32 and PR47.
The deliverable must decide:
- the tool-call render-state list;
- the stop and regenerate rule;
- the streaming announcement rule;
- the failure and hand-back rule;
- the memory controls rule and the capability-hint rule for empty chats.
Out of scope: discrete status announcements (UX-A11Y announcements-and-motion).

### 8. UX-AGENT: ux-agent-facing-interfaces

**Question:** When the caller is an agent, what must a tool, CLI or MCP server provide?

Why now: grim ships an MCP server and both CLIs are driven by agents. `ocx about --json` fails, and a not-found error reports as an auth failure (`cli-first-run.md`). Rows M179 to M186.

#### ux-agent / tool-names-and-descriptions

Investigate how MCP tools and agent-facing commands are named and described, and deliver a description checklist a review can apply line by line.
Primary sources to fetch:
- Anthropic, writing tools for agents (https://www.anthropic.com/engineering/writing-tools-for-agents);
- the MCP tools specification, latest (https://modelcontextprotocol.io/specification/latest/server/tools), for `name`, `title`, `description` and `inputSchema`;
- the catalog's `ai-config-authoring` and `grim-authoring` skills, for the description rules they already set.
Measure, do not cite:
- in `grimoire-rs/grimoire/src/mcp/` (server and tool_args), record per tool only its name, title, description and input schema (annotations belong to UX-ACT);
- clone two public MCP servers under the cache directory (the reference servers at https://github.com/modelcontextprotocol/servers and GitHub's github-mcp-server) and record the same fields;
- score every description against a draft checklist (purpose, when to use, when not to use, inputs, outputs, error behaviour, length), and report pass counts per item and per server.
No tool-selection accuracy number is measured; a small eval cannot support a rule. Whether a release eval is warranted, and its minimum size, is an open question in the deliverable.
Start from M179 to M181 and scout rows DT25, DT26 and DT29.
The deliverable must decide:
- the naming and namespacing rule;
- the description checklist, with a Detect line per item;
- the tool-count guidance, from the cited sources;
- what is routed to ai-config-authoring rather than restated.
Out of scope: annotations and approval (UX-ACT agent-action-approval).

#### ux-agent / machine-output-contracts

Investigate the contract for machine-readable output from CLIs and tools.
Primary sources to fetch:
- clig.dev on machine output;
- the gh `--json` and `--jq` docs;
- the kubectl output formats docs;
- the MCP spec on structured content and output schemas;
- Anthropic on response size and pagination in writing tools for agents;
- the current Claude Code tool-output limit from its docs (re-fetch; do not quote it from memory).
Measure, do not cite:
- for ocx, grim and four exemplars, record whether `--json` exists per command, its accepted positions, whether output carries a schema version, NDJSON for streams, and output size for a large listing;
- run `ocx about --json` and record the failure.
Start from M182 to M184 and scout rows DT14, DT27 and DT38.
The deliverable must decide:
- the `--json` rule (position, coverage, stdout only);
- the schema version and additive-change rule;
- the streaming format rule;
- the response-size budget with a truncation notice;
- the stability policy for help and error text that agents parse.

#### ux-agent / correctable-errors-and-retries

Investigate errors from an agent's point of view: can a model choose the right next action from the output alone?
Primary sources to fetch:
- the MCP spec on tool execution errors (`isError`) versus protocol errors;
- RFC 9457 Problem Details (https://www.rfc-editor.org/rfc/rfc9457);
- the gh exit-code docs (https://cli.github.com/manual/gh_help_exit-codes);
- the catalog's exit-code rules in the language cli-contract sets.
Measure, do not cite:
- for ocx and grim, trigger not-found, unauthorised, network failure, conflict and rate-limit or timeout conditions, against a throwaway `HOME` and a local registry;
- record exit code, stream, wording, and whether a model could tell retryable from not retryable and not-found from unauthorised from the output alone;
- for `grim mcp`, trigger the same conditions through one tool call each and record whether they return `isError` results or protocol errors.
Start from M185 and M186, and scout rows DT28, AI21 and AI22, and row 19 of `cli-first-run.md`.
The deliverable must decide:
- the error-class distinctions an agent needs (not-found versus unauthorised, retryable versus not);
- the machine-readable error shape;
- the tool-error rule for MCP servers;
- the safe-error split between user-facing and model-facing text.
Out of scope: human-facing error wording (UX-TEXT) and repeat runs of mutating commands (UX-ACT cli-destructive-commands).

## Deferred

Grouped by theme, with the reason each group waits. Row IDs refer to the map.

- **Commerce, deceptive patterns and consent** (M236 to M247): this is high value for software teams with subscriptions, and the scouts found strong enforcement material. The fleet has no checkout, no paid tier, and no analytics or consent by decision (`distribution-posture.md`). It is the first candidate for the next wave if any adopter sells. The pricing, analytics and consent-banner halves cross into marketing.
- **Authentication** (M051, M229 to M235): there is no web sign-in in the fleet. The CLI device flow (M230, `grim login`) is the one fleet-relevant item and should lead this group.
- **Onboarding and activation** (M220 to M227): there are no accounts and no analytics. Time to first success for CLIs is taken now in UX-CLI.
- **Navigation, IA, tables and dashboards** (M142, M188 to M197): the theme already decides navigation. Catalog and indexer tables (M194) are the fleet item worth a later dive.
- **Visual design** (M200, M203, M205 to M208, M211): this is taste-heavy and weak on checks. Tokens are already routed to css-theming.
- **Performance and platform** (M082, M212 to M219): CWV thresholds are stable, the sites are static, and there is no field data. The Baseline policy crosses into typescript-quality.
- **Forms beyond the state machine** (M052, M079 to M081): there are no long or multi-step forms.
- **Research methods** (M018, M083, M111, M143, M248 to M258): this is process advice. UX-VERIFY takes the part agents misuse, which is claims and synthetic users.
- **i18n and voice** (M106, M107): there is no localisation in the fleet. Voice is shared with marketing.
- **AI miscellany** (M174 to M178): there is no hosted model, no metering and no MCP App.
- **CLI configuration** (M138 to M140): this is real but secondary. Secrets handling crosses into security.
- **Miscellaneous patterns** (M050, M053, M068 to M071, M141, M198): these are low fleet use.
- **Meta** (M026, M027, M054, M199, M209): framing, not rules.

Routed rather than deferred, so the next wave does not pick them up as UX work:
- **Theme version drift** (M263, `site-shape.md` smell 4 and contradiction 4): the checkable rule "a consumer's theme dependency matches the published version" goes to css-theming's next revision as a generic token-consumer row, and to the fleet `ocx-theme-setup` skill for `@ocx-sh/theme`. It is a `package.json` currency check; no interface rule can see it.
- **Extracting the duplicated chrome** (M261, smell 5): fleet engineering for the theme and grimoire docs owners. Its UX effect, inconsistent navigation and help order, is measured in UX-A11Y page-structure-and-consistency.
- **Statistics in marketing copy** (part of M015) and **disclosure and marking in marketing posts, videos and release notes** (parts of M157 and M158): marketing sub-program.

## Artifact set

| Artifact | Kind | What loads it | Contents |
|---|---|---|---|
| `rules/ux-quality.md` | rule | Path glob on interface code and page templates: `**/*.astro`, `**/*.tsx`, `**/*.jsx`, `**/*.vue`, `**/*.svelte`, `**/*.html` (which includes MkDocs `overrides/**/*.html`) and VS Code webview sources (`**/views/**/*.ts` is too broad; the verify dive sets the final glob). It does not load on Markdown | A small body of non-negotiables from UX-A11Y, UX-STATE and UX-TEXT, each with Rule, Detect and Severity, in the Spectrum audit format (`exemplar-design-systems.md`). It owns page-level accessibility of rendered pages, docs sites included: landmarks, headings in templates, skip links, `lang`, chrome consistency, contrast, keyboard order, sidebar and search widgets. It requires `ux-quality-reference` |
| `skills/ux-quality-reference` | reference skill | Required by the rule; description-triggered on UI review and authoring | Files `a11y.md`, `states.md`, `text.md`, `actions.md` (GUI rows), `dated-facts.md` with re-check dates, and `checks/` holding the axe configuration and the Playwright matrix script |
| `skills/ux-cli-reference` | reference skill | Description-triggered on CLI help, errors, first run and destructive commands; pointer rows added to each language's `cli-contract.md` | UX-CLI, the CLI rows of UX-TEXT and UX-ACT, and a binary test-matrix script (closed stdin, piped, colour variables, typo, version) |
| `skills/ux-ai-reference` | reference skill | Description-triggered on chat UI, tool-call UI, agent features, MCP servers and agent-facing output | UX-AI, UX-AGENT, the agent rows of UX-ACT, and the AI Act dated facts |
| `skills/ux-review` | user-invocable skill | Invoked by the user or a review workflow | Runs the UX-VERIFY ladder (axe configuration, rendered matrix, page-structure checks on built docs and app pages, live-region harness, CLI matrix) and emits findings tagged by evidence class, with a "needs human review" section. Spoken-output findings name the virtual screen reader and its version, or are marked UNVERIFIED |
| `bundles/ux-essentials` | bundle | Installed by adopters; nested under a `product-essentials` umbrella | The rule plus the four skills |

Routing, not restating:
- css-theming owns tokens and forced colours. Its next revision receives the theme-version currency row (M263).
- docs-quality owns docs content in Markdown, quickstarts, plain English and `llms.txt`. Its next revision replaces the "governed nowhere" line at `rules/docs-quality.md:184` with a pointer to ux-quality for the rendered page and to the UX-TEXT alt-text rule for images written in Markdown.
- Marketing owns statistics in marketing copy, disclosure in marketing posts and videos, and the marking of generated release notes.
- The language cli-contract sets own streams, colour on and off, the TTY check, help line length and exit codes.
- The TUI rules own TUI states.
- `installer-script` and `shell-integration` keep their scope.
- ai-config-authoring and grim-authoring own skill and descriptor wording.
- The `ocx-theme-*` skills stay fleet-specific.
- Vendor agent configs (the shadcn skill, the Spectrum audit) are named as alternatives.

The portable rows of the `ocx-theme-*` skills move into `ux-quality-reference`. They are the one focus ring, accessible names, the images-blocked test and the rule never to draw icons by hand.

## Frame corrections

1. **grim-gui is a skeleton, not a GUI to govern.** It is a Tauri 2 shell with 74 lines and 0 interactive elements. The GUI rules cannot be grounded in it (`product-audit/ui-code-posture.md`, `product-audit/distribution-posture.md`).
2. **The VS Code extension is the fleet's real GUI and was unmeasured.** It has 42 production files, 24,957 lines, 183 message calls and webviews under its own rule file (`product-audit/config-inventory.md`, and the measurements above). This adds the editor-extension-surfaces dive.
3. **The shared theme is the main web target.** It is `@ocx-sh/theme` (139 files, 16,069 lines, 5 consuming sites). The frame also omitted the catalog and indexer renderers (`product-audit/ui-code-posture.md`, `product-audit/site-shape.md`).
4. **Existing UX configuration lives outside the catalog.** The six `ocx-theme-*` skills (157,752 bytes) and the extension's `CLAUDE.md` carry UX rules that no adopter receives (`product-audit/config-inventory.md`).
5. **An accessibility gate already exists.** ocx.sh gates pull requests on a Lighthouse score of 100, and axe runs in 47 specs on the deep tier. The gaps are the Grimoire docs, the GUIs, and a gate that checks the score only (`product-audit/ui-code-posture.md`).
6. **The CLI and GUI split falsifier fires.** The CLI duties need their own reference skill, loaded by a different trigger from the path-loaded web rule (`product-frame.md` falsifiers, `product-audit/cli-first-run.md`).
7. **The CLI is the primary surface, and its uncovered ground is specific.** It is help structure, `--version`, typo recovery, first run, error anatomy and JSON reliability. Streams, colour on and off, prompts and exit codes are already covered (`product-audit/cli-first-run.md`).
8. **Rules need Detect and Severity, not prose.** The Spectrum agent audit model is the format to copy (`product-audit/exemplar-design-systems.md`).
9. **The checkable gaps are text, motion and target size.** Of the 9 exemplar systems, only 3 state a target-size number. The theme's tokens fall below 24 px, and the Grimoire docs have no reduced-motion handling (`product-audit/exemplar-design-systems.md`, `product-audit/ui-code-posture.md`).
10. **There is no design system to copy wholesale.** Polaris is archived and Material is in maintenance mode. shadcn has no accessibility automation and no reduced-motion handling (`product-audit/exemplar-design-systems.md`).
11. **Vendor agent configs exist and should be routed to, not restated.** Examples are the Spectrum audit and the USWDS skill's scope firewall (`product-audit/exemplar-design-systems.md`).
12. **"Never remove the outline" is a false rule here.** 15 of 16 `outline:none` sites carry a replacement, and only one is untraced. The Detect line must check for the replacement (`product-audit/ui-code-posture.md`).
13. **UX guidance decays like platform facts.** Every scout raised decay. Every reference file carries a dated-facts table with source dates and re-check dates (`ux-topic-map/accessibility.md` row 32, `ux-topic-map/recent-shifts.md` row 27).
14. **The fleet has no analytics or field data, by decision.** No rule may depend on field metrics, and performance and onboarding are deferred (`product-audit/distribution-posture.md`).
15. **There are no commerce flows in the fleet.** The strong deceptive-pattern and cancellation material is deferred, not dropped (`product-audit/distribution-posture.md`, `product-audit/messaging-inventory.md`).
16. **css-theming overlaps and is already heavy.** It loads on 24 globs. ux-quality must not restate tokens, and must keep its own body small (`product-audit/config-inventory.md`).
17. **Rule-ownership collisions are a known failure.** The DOC-PLAIN-15 link-syntax contradiction is the precedent. DOC-PLAIN-01 typography may collide with UI string rules, so UX-TEXT must resolve it explicitly (`product-audit/config-inventory.md`).
18. **The MkDocs sites' UI was not measured.** Three sites use MkDocs Material, which is vendor UI the fleet does not author. The rules apply to their overrides only (`product-audit/site-shape.md`).
19. **Docs content belongs to docs-quality; the rendered docs page belongs to UX.** Revision 1 of this map gave docs pages wholly to docs-quality. That was wrong: docs-quality says page-level accessibility is governed nowhere (`rules/docs-quality.md:184`), and the inventory flags that hole as declared but unowned while Lighthouse accessibility 100 is a fleet gate (`product-audit/config-inventory.md` smell 10 and contradiction 7). ux-quality now owns templates, chrome and the rendered page; docs-quality keeps Markdown content.
20. **The frame's "docs-quality covers docs" overstates it.** Alt text, contrast, keyboard order, table semantics, the sidebar and the search widget are out of docs-quality's scope by its own statement (`rules/docs-quality.md:184`, `product-audit/config-inventory.md` smell 10). The UX set must take them, or they stay unowned.
21. **The css-theming gap in the fleet is drift, not mechanics.** Six consumers sit on five `@ocx-sh/theme` specifiers, and the catalog site is on `^0.5.0` while the theme is 0.7.0 (`product-audit/site-shape.md` smell 4 and contradiction 4). The checkable rule is version currency, and it belongs to css-theming, not to ux-quality.
22. **One domain, several sites, divergent chrome.** Three independent CommandBar, SiteHeader and SiteFooter implementations and 8 of 17 navigation entries marked `planned: true` mean consistency criteria (WCAG 3.2.3, 3.2.4, 3.2.6) are a live question for the fleet, which the frame did not consider (`product-audit/site-shape.md` smells 5 and 10, `ux-topic-map/accessibility.md` row 5).
23. **Agent workers cannot run real assistive technology.** Every dive that tests announcements uses a named virtual screen reader or labels the claim UNVERIFIED, and the review skill's output does the same (`ux-topic-map/accessibility.md` row 34, map row M012).

## Critic responses

Each criticism of revision 1 is listed with what changed. All were accepted except where a row says "answered".

### Missing coverage

| Criticism | Response |
|---|---|
| Page-level accessibility is governed nowhere (`docs-quality.md:184`, `config-inventory.md` smell 10), yet M055 was routed to docs-quality | Accepted. ux-quality owns the rendered page, docs sites included, through its `.astro` and `.html` globs. M038 and the page half of M055 move to the new dive UX-A11Y page-structure-and-consistency; the alt-text rule moves to UX-TEXT labels-and-wordlists (M098). Frame corrections 19 and 20 record the change, and the Artifact set names the pointer docs-quality must add |
| Theme version drift, three divergent chrome copies and 8 of 17 `planned: true` nav entries were neither selected, routed nor deferred (`site-shape.md` smells 4, 5, 10, contradiction 4) | Accepted. New rows M261 to M263. Nav entries (M262) and the consistency effect of the chrome copies (M261) are measured in page-structure-and-consistency. The version-currency check (M263) is routed to css-theming and `ocx-theme-setup`, with the reason in "Deferred": it is a `package.json` check no interface rule can see. Chrome extraction is routed to fleet engineering |
| WCAG 2.2 3.2.6 Consistent Help (AX5, PR30) appears nowhere | Accepted. New row M260, selected in page-structure-and-consistency together with 3.2.3 and 3.2.4. PR30 is now also cited on M050 to M052 |
| RS17, the six WebAIM categories, is cited nowhere | Accepted. M017 now cites RS17 as the ranking input; native-widgets-and-keyboard and focus-contrast-target-size rank their lists by it, and automated-a11y-coverage maps each category to an axe rule |
| FC20 is unreferenced | Accepted. Cited on M019 and M021 and in the conformance-targets-law brief |
| (Found in the same sweep) FC27 was unreferenced | Added to M084 and the error-message-anatomy brief. A script check of every scout row against the map now finds no unreferenced row |

### Weak briefs

| Criticism | Response |
|---|---|
| "Test with a screen reader" cannot be run by a worker (announcements-and-motion, conversation-mechanics, terminal-accessibility) | Accepted. The two web dives use the Guidepup virtual screen reader with its version recorded, fall back to a DOM-contract assertion if it does not log live regions, and label spoken-output claims UNVERIFIED. The terminal dive measures the raw byte stream with `script` and may not claim what is spoken. A hard limit for all dives states this |
| tool-names-and-descriptions: an eval of five tasks supports no rule | Accepted. The accuracy eval is removed; the deliverable is a description checklist scored over grim and two public servers. Whether a release eval is warranted is left as an open question |
| agent-action-approval: no clients, versions or method | Accepted. Claude Code 2.1.332 is measured with `--mcp-config`, `--strict-mcp-config` and `--allowedTools` (flags confirmed with `claude --help`); VS Code is documented from its approvals page, labelled docs-derived |
| evidence-and-claims: no ground truth, n=2, no URL for synthetic-user sources | Accepted. The measurement is now a seeded answer key of 20 defects in 2 files, three runs each, labelled as too small for a coverage percentage. The three NN/g synthetic-user URLs and the RM32 paper URLs are named |
| conformance-targets-law and ai-disclosure-and-labelling will fill legal dates from memory | Accepted. Both briefs name the Publications Office Cellar route, tested for this map on 2026-11-27 (HTTP 200, article text present), and state that an unverified legal date must not become a rule row |

### Overlaps

| Criticism | Response |
|---|---|
| editor-extension-surfaces and gui-destructive-actions both read the 6 modal sites | Accepted. The renamed dive UX-ACT confirmations-and-modals owns the modal sites and the modal policy, including M065 moved from empty-error-notification; editor-extension-surfaces excludes modals |
| editor-extension-surfaces and loading-and-progress both decide extension progress | Accepted. loading-and-progress owns in-page indicators, including inside webview HTML; editor-extension-surfaces owns native `window.withProgress` only |
| agent-action-approval and tool-names-and-descriptions both inventory `grim mcp` | Accepted. Split by field: names, descriptions and schemas versus annotations, mutation and `--allow-writes` gating |
| cli-destructive-commands and correctable-errors-and-retries both run every mutating command | Accepted. cli-destructive-commands owns the inventory and now also the repeat run (M156 moved from UX-AGENT); correctable-errors-and-retries triggers error conditions only |
| Three dives fetch 4.1.3 and test live regions | Accepted. announcements-and-motion owns the harness for discrete events; conversation-mechanics tests streaming only; strings-that-survive runs static string checks only and no longer fetches 4.1.3 |
| M015 overlaps marketing's claim policy | Accepted. UX keeps only the labelling rule for a statistic inside a UX finding; marketing-copy statistics are named to marketing |
| ai-disclosure-and-labelling touches marketing's release communication (M158) | Accepted. M158 is narrowed to content generated inside the product; generated release notes go to marketing and generated docs to docs-quality DOC-PLAIN-22 |
