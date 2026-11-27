---
title: Exemplar design systems, measured for the conventions they encode
program: product (sub-program ux)
worker: exemplar-design-systems (grounding)
date_researched: 2026-11-27
model: sonnet
sources_fetched: 18
method: Nine design-system repositories shallow-cloned (git clone --depth 1) into ~/.cache/research-lang/exemplars/product/exemplar-design-systems/, then measured with grep, ls and git ls-files. Web pages fetched: WCAG 2.2 SC 2.5.8, SC 2.5.5, SC 2.3.3, GOV.UK error-message component, web.dev tap targets, Carbon Content, Primer UI patterns. Repair pass 2026-11-27 added the commands and URLs below; GOV.UK Styles and USWDS component pages could not be fetched (domain safety check rate-limited), so claims about them were removed. Every command below ran from that cache directory under bash (not zsh: zsh refuses unmatched --include globs and does not word-split variables). File counts are counts of source files, not of components, unless a row says otherwise.
---

# Exemplar design systems

## Corpus and scope

Command (cache directory):
`for d in *; do echo "$d $(git -C $d rev-parse --short HEAD) $(git -C $d log -1 --format=%cs) files=$(git -C $d ls-files | wc -l)"; done`

| Directory | Project | Commit | Last commit | Tracked files | Caveat |
|---|---|---|---|---|---|
| carbon | IBM Carbon (`carbon-design-system/carbon`) | ee5f318 | 2026-11-27 | 10249 | Holds legacy v10 packages beside current `packages/react` and `packages/web-components`. Measured on `packages/react/src/components` (147 entries; `ls carbon/packages/react/src/components | wc -l` = 147) unless noted. |
| govuk-frontend | GOV.UK Frontend | 8877e8c | 2026-11-27 | 1045 | Content guidance pages were not cloned; the repo does hold component templates and 13 files mentioning "error message" (section 7). The error-message web page was fetched. |
| material-web | Material Web | 875a8b6 | 2026-11-25 | 1581 | README says "MWC is in maintenance mode pending new maintainers" (`material-web/README.md`, line near top; `head -30 material-web/README.md \| grep -i maintenance`). |
| polaris | Shopify Polaris React | 3f7954a | 2026-09-10 | 4655 | `polaris/README.md:1` reads "Polaris React (Archived)". Replaced by web components on 2025-10-01: `grep -n 'October 1, 2025' polaris/README.md` returns line 13, "On October 1, 2025, we released our Polaris Web Components for Shopify app development" (also line 10 "The Shopify Polaris React library is deprecated"; the date is the vendor's own, from the cloned README, not an external page). Used because its docs site (`polaris.shopify.com/content`) is in the repo. |
| primitives | Radix Primitives | eb3a2b7 | 2026-10-14 | 703 | Unstyled. Zero visual states by design. |
| react | GitHub Primer React (`primer/react`) | 7cf064c | 2026-11-25 | 9470 | Tokens come from the separate `@primer/primitives` package (`react/packages/react/package.json:83`), so scales are not measurable here. |
| react-spectrum | Adobe React Spectrum, React Aria, Spectrum 2 (S2) | aadf9e2 | 2026-11-25 | 10220 | Measured on `packages/react-aria-components/src` and `packages/@react-spectrum/s2/src`. |
| ui | shadcn/ui | 0e5b2e6 | 2026-11-25 | 6411 | Directory is named `ui`. Measured on `ui/apps/v4/registry/new-york-v4/ui` (62 entries; `ls ui/apps/v4/registry/new-york-v4/ui | wc -l` = 62). |
| uswds | US Web Design System | 029d6d7 | 2026-10-09 | 1645 | 88 entries under `uswds/packages` (`ls uswds/packages | wc -l` = 88). |

Nine systems, not ten. Command that failed: `git clone --depth 1 https://github.com/gitlab-org/gitlab-ui` (no repository at that path). GitLab Pajamas and Atlassian were not substituted. "Six systems agree" below means six of these nine.

## 1. Component states: which are first-class

Method: a state is first-class when the system ships a dedicated component or a named prop for it, not when the word appears. First, a count of source files (excluding tests, stories, demos, node_modules) that mention each state keyword. Script:

```bash
# /tmp scratch script m.sh, bash. R maps system -> source roots.
EX='--include=*.tsx --include=*.ts --include=*.scss --include=*.js --include=*.njk --include=*.html --include=*.jsx --include=*.css --exclude=*.test.* --exclude=*.stories.* --exclude=*.spec.* --exclude=*.docs.* --exclude-dir=__tests__ --exclude-dir=tests --exclude-dir=stories --exclude-dir=demo --exclude-dir=node_modules --exclude-dir=__snapshots__ --exclude=*.d.ts'
# per system, per pattern:  grep -rilE $EX <root> -e '<pattern>' | wc -l
# roots: carbon=carbon/packages/react/src/components  govuk=govuk-frontend/packages/govuk-frontend/src/govuk/components
#   material=material-web (--exclude-dir=docs)  polaris=polaris/polaris-react/src/components  radix=primitives/packages/react
#   primer=react/packages/react/src  spectrum=react-spectrum/packages/react-aria-components/src + react-spectrum/packages/@react-spectrum/s2/src
#   shadcn=ui/apps/v4/registry/new-york-v4/ui  uswds=uswds/packages (--exclude-dir=uswds-core)
# patterns: loading='loading|isLoading|isPending|aria-busy'  readonly='readOnly|read-only|readonly|isReadOnly'
#   disabled='disabled|isDisabled|aria-disabled'  invalid='invalid|isInvalid|aria-invalid|error'  skeleton='skeleton'  empty='empty'
```

| System | loading | read-only | disabled | invalid/error | skeleton | empty |
|---|---|---|---|---|---|---|
| carbon | 25 | 51 | 147 | 108 | 95 | 34 |
| govuk | 0 | 0 | 17 | 43 | 0 | 4 |
| material | 8 | 77 | 291 | 185 | 0 | 43 |
| polaris | 41 | 10 | 104 | 34 | 16 | 17 |
| radix | 6 | 10 | 21 | 24 | 0 | 7 |
| primer | 47 | 8 | 98 | 74 | 26 | 26 |
| spectrum | 24 | 26 | 100 | 58 | 15 | 29 |
| shadcn | 3 | 0 | 28 | 19 | 3 | 4 |
| uswds | 5 | 1 | 22 | 31 | 0 | 5 |

Keyword counts are noisy ("empty" matches CSS `:empty`, "error" matches the word). They are a presence check only. The dedicated-component check is the real measure:

```bash
git -C <repo> ls-files | grep -iE '(^|/)(skeleton|spinner|loading|empty-?state|emptystate|progress|inline-?loading|error-?(message|summary)|inline-?notification|banner|alert)[^/]*(/|\.)' | grep -viE 'test|spec|stories|snap|\.md$|\.png|\.svg|fixture|docs/|apps/|website' | sed -E 's#/[^/]*$##' | sort -u
ls <component-root>     # for the component names quoted below
```

| System | Skeleton | Spinner / loading | Empty state | Error message component | Read-only prop |
|---|---|---|---|---|---|
| carbon | `SkeletonText`, `SkeletonIcon`, `SkeletonPlaceholder`, `DataTableSkeleton`, `AISkeleton` (`carbon/packages/react/src/components/`) | `Loading`, `InlineLoading` | a documented example, not a component: `carbon/packages/react/src/examples/EmptyState/EmptyState.mdx`; plus `NotificationsPanel/NotificationsEmptyState.tsx` | `FullPageError`, `ErrorBoundary`, `InlineNotification` via `Notification` | yes (`readOnly` in `FluidTextInput.tsx`, `FluidSelect.tsx`) |
| govuk | none | none | none | `error-message`, `error-summary` (`govuk-frontend/packages/govuk-frontend/src/govuk/components/`) | no hit under `components/` (`grep -rniE readonly <components> -l` returned no files) |
| material | none | `progress/` (circular, linear) only | none | none (`error`/`errorText` is a property on text field) | yes (`material-web/textfield/internal/text-field.ts`) |
| polaris | `SkeletonBodyText`, `SkeletonDisplayText`, `SkeletonPage`, `SkeletonTabs`, `SkeletonThumbnail` | `Spinner`, `Loading`, `ProgressBar` | `EmptyState` | `InlineError`, `Banner` | yes (`TextField/TextField.tsx:104`, `:217`, `:313`) |
| radix | none | `progress/` only | none | none | only `one-time-password-field.tsx` |
| primer | `Skeleton`, `SkeletonAvatar`, `SkeletonText` (`react/packages/react/src/`) | `Spinner`, `ProgressBar`, Button `loading` prop | `Blankslate` | `InlineMessage`, `Banner`, `FormControl` validation | only in a Figma mapping file (`TextInput/TextInput.figma.tsx`); otherwise native attribute passthrough |
| spectrum | `Skeleton` (S2, `@react-spectrum/s2/src/Skeleton.tsx`) | `ProgressBar`, `ProgressCircle`, Button `isPending` | `IllustratedMessage` | field `errorMessage` prop (see `spectrum-audit/checks/04-accessibility.md`) | yes (`isReadOnly` in `NumberField.tsx`, `Checkbox.tsx`, `Group.tsx`) |
| shadcn | `skeleton.tsx` | `spinner.tsx`, `progress.tsx` | `empty.tsx` | `field.tsx` (`data-invalid` + `aria-invalid`) | none (`grep -rn 'readOnly\|read-only' ui/apps/v4/registry/new-york-v4/ui` returned nothing) |
| uswds | none | none | none | `usa-error-message`, `usa-validation` | none (`grep -rliE readonly uswds/packages --include=*.scss --include=*.twig --include=*.md --include=*.yml` returned nothing) |

Counts, from the table: dedicated skeleton component, 5 of 9 (carbon, polaris, primer, spectrum, shadcn). Dedicated spinner or progress component, 7 of 9 (all but govuk and uswds). Dedicated empty-state component, 4 of 9 (polaris, primer, spectrum via IllustratedMessage, shadcn); carbon has a pattern doc. Dedicated read-only prop, 4 of 9 (carbon, material, polaris, spectrum). Error-message or invalid-state support, 8 of 9 (all but radix).

### The disabled state is built four different ways

Command: `grep -nE 'aria-disabled|disabled|inactive|loading|isPending|softDisabled' <button source>` per system.

| System | Evidence | Behaviour |
|---|---|---|
| govuk | `components/button/template.njk:51` renders `disabled aria-disabled="true"` together | native disabled plus aria |
| carbon | `Button/Button.tsx:293-295` `disabled: PropTypes.bool` | native only |
| primer | `Button/ButtonBase.tsx:58-60` `loading`, `loadingAnnouncement = 'Loading'`, `inactive`; `Button.docs.json:122` defines `inactive` as "looks visually disabled, but can still accept all the same interactions", for outages, with accessible contrast so a tooltip can explain why | three states: disabled, inactive, loading |
| polaris | `Button/Button.tsx:126` `const isDisabled = disabled \|\| loading;` | loading implies disabled |
| material | `button/internal/button.ts:40-47` `softDisabled` links to the W3C ARIA APG "focusable disabled controls" practice | disabled and soft-disabled |
| spectrum | `react-aria-components/src/Button.tsx:114-120` `useDisableInteractions(buttonProps, isPending)`; `isDisabled: props.isDisabled \|\| isPending` | pending implies disabled |
| shadcn | `button.tsx:7` styles `disabled:pointer-events-none disabled:opacity-50` | native attribute only |
| uswds | `usa-button/src/usa-button.twig:32-33` shows both `disabled` and `aria-disabled="true"` variants | both documented |
| radix | `toggle/src/toggle.tsx:47` `data-disabled` | state attribute only |

Loading built into the button: 3 of 9 (primer `loading`, polaris `loading`, spectrum `isPending`). Carbon splits loading into `InlineLoading`; shadcn composes `Spinner` inside a button by hand.

## 2. Accessibility enforcement

Commands:

```bash
# package.json files naming an a11y tool
git -C <d> ls-files '*package.json' | xargs -I{} grep -lE '"(jest-axe|vitest-axe|axe-core|@axe-core/[a-z-]+|axe-playwright|pa11y[a-z-]*|cypress-axe|@storybook/addon-a11y|chai-a11y-axe)"' <d>/{} | wc -l
# source files calling axe
grep -rlE 'toHaveNoViolations|axe\(|checkA11y|AxeBuilder|axe\.run|toBeAccessible|axe-core|runAxe' <d> --include=*.ts --include=*.tsx --include=*.js --include=*.mjs --include=*.cjs --include=*.jsx --exclude-dir=node_modules | wc -l
# lint plugins
grep -rlE 'jsx-a11y|eslint-plugin-github|a11y' <d> --include=eslint.config.* --include=.eslintrc* --include=package.json --exclude-dir=node_modules
```

| System | package.json with an a11y tool | source files calling axe | Lint for a11y | Where it runs |
|---|---|---|---|---|
| carbon | 2 | 28 files use the matcher (`grep -rl 'toHaveNoAxeViolations\|toHaveNoACheckViolations' carbon/packages ...`) | `eslint-plugin-jsx-a11y` (`carbon/eslint.config.mjs:10`, registered `:181`; `carbon/package.json:77`) | custom jest matcher `config/jest-config-carbon/matchers/toHaveNoAxeViolations.ts:33`; 28 of 187 component test files (`ls carbon/packages/react/src/components/*/__tests__/*-test.* \| wc -l` = 187) |
| govuk | 1 | 41 files mention axe | `html-validate` rules `input-missing-label: 'error'` (`.htmlvalidate.js:19`) and `no-missing-references: 'error'` (`:25`) | `shared/helpers/puppeteer.js:4` imports `AxePuppeteer`; `:18` defines `axe(page, overrides)`; 39 files call `axe(` |
| material | 0 | 0 | none | none found. `material-web/testing/` holds harness, tokens and `skip-animations`, no axe |
| polaris | 1 | 1 | `jsx-a11y/label-has-for` etc. in `polaris/.eslintrc.js:72-82`; two a11y rules set `off` | `polaris-react/package.json:78` `@storybook/addon-a11y`, `:95` `axe-playwright` |
| radix | 1 | 17 | none | `primitives/package.json:33` `@axe-core/playwright`, `:46` `axe-core`, `:62` `vitest-axe`; 16 of 45 packages that have a unit test also call axe (`grep -rlE axe primitives/packages/react/*/src --include=*.test.tsx`) |
| primer | 1 | 18 | `eslint-plugin-jsx-a11y` (`react/package.json:75`); three project rules `primer-react/a11y-tooltip-interactive-trigger`, `a11y-explicit-heading`, `a11y-remove-disable-tooltip` (`react/eslint.config.mjs:134,136,138`); `@github/axe-github` (`package.json:55`) | Playwright e2e `react/e2e/components/Axe.test.ts` iterates every Storybook story id (`:36`) with an explicit skip list including TODOs for known violations (`:10-24`); `contributor-docs/testing.md:51,219` state that axe checks stories; `script/test-e2e --grep @avt` |
| spectrum | 2 | 18 | `jsx-a11y` named in `react-spectrum/package.json`; `axe-playwright` at `:153` | Storybook `addon-a11y` (`.storybook/main.mjs:17`, `.storybook/preview.js:45`); 541 test files total (`find react-spectrum/packages -name '*.test.*' -not -path '*/node_modules/*' \| wc -l`) |
| shadcn | 0 | 0 | none in `ui/package.json` or `ui/apps/v4/package.json` | none found |
| uswds | 1 | 1 | `jsx-a11y` in `package.json` | `package.json:69` `test:a11y` builds Storybook then runs `test-storybook`; `:67` puts it inside `test:ci`; `.storybook/test-runner.js:14-16,34` skips stories with `parameters.a11y.disable` and passes `axeOptions` |

Axe automation in CI or unit tests: 7 of 9 (carbon, govuk, polaris, radix, primer, spectrum, uswds). Absent: material, shadcn.

### Agent configuration the systems ship

Command: `git -C <d> ls-files | grep -iE '(^|/)(AGENTS\.md|CLAUDE\.md|llms[^/]*\.txt|copilot-instructions\.md|SKILL\.md)$|\.mdc$|(^|/)skills/'`

| System | Files found |
|---|---|
| carbon | `AGENTS.md` (100 lines), `packages/react/AGENTS.md`, `packages/styles/AGENTS.md`, `packages/web-components/AGENTS.md` |
| radix | `AGENTS.md` (81 lines; commands and constraints only) |
| primer | 24 `.agents/skills/*/SKILL.md`, including `a11y-debugging` (91 lines), `modular-ds-accessibility-contract` (103), `style-guide` (34); `.github/copilot-instructions.md` |
| spectrum | `AGENTS.md` (74), `CLAUDE.md`, 4 `rules/*.mdc`, `.claude/skills/release-notes/SKILL.md`, and `packages/dev/s2-docs/skills/` with 15 files (`react-aria`, `react-spectrum-s2`, `spectrum-audit`) |
| shadcn | `ui/skills/` 31 files (`skills/shadcn/SKILL.md` 296 lines, `migrate-radix-to-base`), `apps/v4/public/llms.txt` (162 lines), `AGENTS.md`, `CLAUDE.md` in templates |
| uswds | `AGENTS.md` (65), `.agents/skills/uswds-accessibility/SKILL.md` (159), `.agents/skills/uswds-code-review/SKILL.md` (423) |
| govuk, material, polaris | none |

Six of nine ship agent configuration (carbon, radix, primer, spectrum, shadcn, uswds). Two of them ship accessibility judgment as a skill for agents working on the system itself: `uswds/.agents/skills/uswds-accessibility/SKILL.md` and `react/.agents/skills/a11y-debugging/SKILL.md`. Only Spectrum and shadcn ship guidance aimed at agents that consume the system (`react-spectrum/packages/dev/s2-docs/skills/react-spectrum-s2/`, `ui/skills/shadcn/SKILL.md`).

### Checkable rule format: Spectrum's audit skill

`wc -l react-spectrum/packages/dev/s2-docs/skills/spectrum-audit/checks/*.md scoring-rubric.md` gives 259 lines across six check files. Each check has the same three fields: Rule, Detect (a syntactic condition), Severity. Example, `checks/04-accessibility.md`, "Accessible names": Detect = "`Button` / `ActionButton` with only an icon child and no `aria-label`; collections (`ListView`, ...) without `aria-label` / `aria-labelledby`", Severity High. `scoring-rubric.md` weights severities Critical 10, High 5, Medium 2, Low 1 and computes `categoryScore = 100 - min(100, sum of weights)`, and states the score is "computed deterministically ... never from a subjective sense". This is the one corpus example of an agent-facing rule set where every rule has a detection recipe.

The USWDS accessibility skill states its bar and its limit in checkable terms (`uswds/.agents/skills/uswds-accessibility/SKILL.md`): "WCAG 2.1 AA minimum"; "`npm run test:a11y` ... failures are blocking, not advisory. Passing Axe is necessary and not sufficient"; contrast "4.5:1 normal text, 3:1 large text and UI components"; "minimum 24x24 CSS px touch target where feasible (WCAG 2.2 SC 2.5.8)"; reflow "no loss of content or functionality at 400% zoom / 320px width". It also has a "scope firewall" forbidding the claim "508 compliant" for a product because it uses USWDS.

## 3. Per-component ARIA documentation

Commands (examples; each is `git ls-files` for the doc set, then `grep -li` for the word):

| System | Doc set measured | Mention accessibility or ARIA | Command |
|---|---|---|---|
| material | 20 component pages (`material-web/docs/components/*.md`) | 20 of 20 | `grep -liE '^#+ *accessib\|aria' material-web/docs/components/*.md \| wc -l` |
| polaris | 110 component mdx pages under `polaris/polaris.shopify.com/content/components` | 53 of 110 mention "accessibility" | `git -C polaris ls-files 'polaris.shopify.com/content/components/*.mdx' 'polaris.shopify.com/content/components/**/*.mdx' \| sed 's#^#polaris/#' \| xargs grep -liE accessibility \| wc -l` |
| carbon | 203 component mdx files (`packages/react/src/components/*/*.mdx`) | 70 of 203 mention "accessib" | `git -C carbon ls-files 'packages/react/src/components/*/*.mdx' \| wc -l` = 203; `find carbon/packages/react/src/components -name '*.mdx' \| xargs grep -liE accessib \| wc -l` = 70 |
| radix | 62 non-test component source files (`packages/react/*/src/*.tsx`) | 1 of 62 contains the literal "WAI-ARIA" | `grep -rlE 'WAI-ARIA\|wai-aria' primitives/packages/react --include=*.tsx --exclude-dir=node_modules \| wc -l`. ARIA patterns are documented on the external site, not in this repo |
| primer | 80 `*.docs.json` files (`packages/react/src/*/*.docs.json`) | 51 of 80 mention accessib or aria | `git -C react ls-files 'packages/react/src/*/*.docs.json' \| sed 's#^#react/#' \| xargs grep -liE 'accessib\|aria' \| wc -l` |
| shadcn | 198 component doc pages (`ui/apps/v4/content/docs/components/*/*.mdx`) | 154 of 198 mention accessib or aria | `grep -rliE 'accessib\|aria' ui/apps/v4/content/docs/components --include=*.mdx \| wc -l` |
| spectrum | 215 pages in `packages/dev/s2-docs/pages/react-aria/*.mdx` | 6 of 215 have an "Accessibility" heading | `grep -liE '^#+ *accessib' <those files> \| wc -l`; headings may be named differently, so treat as a lower bound |
| govuk, uswds | per-component ARIA docs not measured (component guidance pages were not cloned or fetched) | not measured | |

Only Material documents ARIA per component in 100 percent of its pages; elsewhere coverage runs from 1 of 62 (radix source) to 77 percent (shadcn). A per-component accessibility section is not a convention six systems share.

## 4. Minimum target sizes

External facts (fetched 2026-11-27): WCAG 2.2 SC 2.5.8 Target Size (Minimum) is Level AA and requires pointer targets of at least 24 by 24 CSS pixels unless an exception applies (Spacing, Equivalent, Inline, User Agent Control, Essential): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html. SC 2.5.5 Target Size (Enhanced) is Level AAA and requires 44 by 44 CSS pixels (fetched 2026-11-27: https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html, heading "Target Size (Enhanced) (Level AAA)"). web.dev (fetched 2026-11-27: https://web.dev/articles/accessible-tap-targets) states "A minimum recommended touch target size is around 48 device independent pixels"; the Primer skill's 48x48 is a paraphrase of it (`react/.agents/skills/a11y-debugging/SKILL.md:75`).

Command: `grep -rniE 'touch[- ]target|target[- ]size|min-target|minimum target|hit area|hit-area|tap target|44 ?px|44x44|24 ?x ?24|2\.5\.[58]' <d> <includes> | awk -F: '{print $1}' | sort | uniq -c | sort -rn | head -4`

| System | Explicit target-size rule in the repo | Evidence |
|---|---|---|
| uswds | yes, a named token: "$size-touch-target: 6; // 48px to meet WCAG minimum of 44px" | `uswds/packages/uswds-core/src/styles/variables/size-touch-target.scss:1`; also 24x24 in the skill (`uswds-accessibility/SKILL.md`, non-negotiable 6) |
| govuk | yes, a gutter that enlarges radios and checkboxes: `$govuk-touch-target-gutter: 4px; $govuk-touch-target-size: ($govuk-radios-size + $govuk-touch-target-gutter)` | `govuk-frontend/.../components/radios/_mixin.scss:5-7`; 21 hits in radios and 16 in checkboxes mixins (`grep -rniE 'touch[- ]target|target[- ]size|min-target|minimum target|hit area|hit-area|tap target|44 ?px|44x44|24 ?x ?24|2\.5\.[58]' govuk-frontend/packages/govuk-frontend/src/govuk/components/radios | wc -l` = 21, same on `checkboxes` = 16, all in the `_mixin.scss` file of each; run under bash) |
| material | yes, 48px | `material-web/button/internal/shared-styles.scss:9,14` (`touch-target` mixin); `checkbox/internal/_checkbox.scss:61-62` `margin: max(0px, ((48px - container-size) / 2))`; `docs/components/checkbox.md:78` `touch-target="wrapper"` |
| shadcn | no stated rule; default button `h-9` (36px), `size-9` icon (`ui/apps/v4/registry/new-york-v4/ui/button.tsx:23,27`); coarse-pointer sizing in `combobox.tsx:163,187` (`pointer-coarse:size-5`, `pointer-coarse:px-3`) | |
| primer | control sizes are tokens (`height: var(--control-medium-size)`, `react/packages/react/src/Button/ButtonBase.module.css:5`); no 24 or 44 number found in contributor docs (`grep -n 'Targets\|target-size\|2.5.8\|minimum' react/contributor-docs/*.md` returned a single unrelated TypeScript line); the `a11y-debugging` skill cites 48x48 from web.dev (`SKILL.md:75`, source https://web.dev/articles/accessible-tap-targets) | |
| polaris | heights are tokens (`--p-height-600/700/800/900`, `Button.module.css:218-243`); no target-size rule | |
| carbon, spectrum, radix | no explicit rule found in the first four hits; spectrum has 20 hits in `s2/style/properties.json` that were not read | |

Explicit target-size number in code or skills: 3 of 9 (uswds, govuk, material). Where a number is stated it is 44 or 48, not WCAG's AA 24, except the USWDS skill that cites 24.

## 5. Spacing and type scales

| System | Spacing scale | Type scale | Command and evidence |
|---|---|---|---|
| govuk | 10 steps, 0-9: 0, 5, 10, 15, 20, 25, 30, 40, 50, 60 px | 7 responsive steps (80, 48, 36, 27, 24, 19, 16) | `grep -cE '^  [0-9]: [0-9]+(px)?,?$' .../settings/_spacing.scss` = 10; `grep -nE '^  [0-9]+: *\(' .../settings/_typography-responsive.scss` lines 44, 58, 72, 86, 101, 116, 127 |
| carbon | 13 steps `$spacing-01` to `$spacing-13` | not counted | `grep -oE '\$spacing-[0-9]+' carbon/packages/styles/scss/_spacing.scss \| sort -u \| wc -l` = 13 |
| polaris | 22 space tokens (`space-0`, `space-025`, `space-050`, `space-100` ...) | font tokens in `font.ts`, not counted | `grep -cE "'space-[0-9]+'" polaris/polaris-tokens/src/themes/base/space.ts` = 22 |
| uswds | spacing units in `settings-spacing.scss`; em tokens `05em, 1em, 105em, 2em` | 21 named sizes from "micro: 10px" and 1:12px up | `grep -cE '^  [0-9"a-z]+: [0-9]+px' uswds/packages/uswds-core/src/styles/tokens/font/type-scale.scss` = 21 |
| material | tokens are generated (`material-web/tokens/_md-sys-typescale.scss`, `_md-sys-motion.scss`, `_md-sys-shape.scss`, `_md-sys-state.scss`) | in `_md-sys-typescale.scss` | not counted |
| primer | in `@primer/primitives`, not in this repo | same | `react/packages/react/package.json:83` |
| spectrum, shadcn, radix | spectrum: style macro `s2/style/`; shadcn: Tailwind scale; radix: none | | not counted |

Every system that ships tokens in-repo uses a numbered or stepped scale rather than free values. The step count differs: 10 (govuk), 13 (carbon), 22 (polaris). Polaris enforces token use with stylelint: `polaris/stylelint-polaris/plugins/` holds 7 rule directories including `custom-property-allowed-list`, `declaration-property-value-disallowed-list` and `media-query-allowed-list` (`ls polaris/stylelint-polaris/plugins \| wc -l` = 7). Primer extends `@primer/stylelint-config` (`react/stylelint.config.mjs:5`) and ships eslint `primer-react/new-color-css-vars` (`react/eslint.config.mjs:135`). Carbon ships `config/stylelint-config-carbon` with `plugins` and `rules` directories.

## 6. Motion and reduced motion

Commands:

```bash
INC="--include=*.scss --include=*.css --include=*.ts --include=*.tsx --include=*.js --include=*.jsx"
EXC="--exclude-dir=node_modules --exclude-dir=docs --exclude-dir=apps --exclude-dir=__tests__ --exclude=*.test.* --exclude=*.stories.*"
grep -rlE 'prefers-reduced-motion|reduced-motion|reducedMotion|prefersReducedMotion|motion-reduce' $d $INC $EXC | wc -l
grep -rlE 'transition|animation|@keyframes' $d $INC $EXC | wc -l
# shadcn separately (the apps/ exclusion above would hide it):
R=ui/apps/v4/registry/new-york-v4/ui
grep -rlE 'motion-reduce|prefers-reduced|motion-safe' $R | wc -l      # 0
grep -rlE 'animate-|transition|duration-' $R | wc -l                  # 39
```

| System | Files handling reduced motion | Files with transition or animation |
|---|---|---|
| carbon | 61 | 198 |
| govuk | 0 | 2 |
| material | 9 | 75 |
| polaris | 6 | 102 |
| radix | 0 | 21 |
| primer | 13 | 38 |
| spectrum | 21 | 253 |
| shadcn (registry only) | 0 | 39 |
| uswds | 2 | 8 |

Six of nine handle reduced motion in source (carbon, material, polaris, primer, spectrum, uswds). govuk, radix and shadcn have zero. Shadcn animates 39 of 62 registry files with no `motion-reduce` or `motion-safe` variant in any of them, and its `Spinner` (`spinner.tsx:5-9`) is `role="status" aria-label="Loading"` with `animate-spin`. Examples of handling: `carbon/packages/styles/scss/components/loading/_animation.scss:25,45`; `react/packages/react/src/Skeleton/skeleton.module.css:20` (animation gated by `prefers-reduced-motion: no-preference`); `react-spectrum/packages/@react-spectrum/s2/src/Skeleton.tsx:34` (`useMediaQuery('(prefers-reduced-motion: reduce)')`); `uswds/packages/uswds-core/src/styles/mixins/utilities/_transition.scss:24`. Polaris has 12 duration tokens (`cd` to the cache directory, then `grep -cE "'motion-duration-[0-9]+'" polaris/polaris-tokens/src/themes/base/motion.ts` = 12). WCAG 2.2 SC 2.3.3 Animation from Interactions is Level AAA; honoring `prefers-reduced-motion` is a sufficient technique (C39, SCR40) (https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html, fetched 2026-11-27). Uswds states reduced motion as a rule for agents (`uswds-accessibility/SKILL.md`, non-negotiable 7).

Forced-colors and focus-visible, same method (`grep -rlE 'forced-colors|-ms-high-contrast'`, `grep -rlE ':focus-visible|focus-visible:'`): forced-colors files carbon 14, govuk 10, material 42, polaris 29, radix 0, primer 13, spectrum 116, uswds 19, shadcn 0 (of 62). `:focus-visible` files carbon 10, govuk 0, material 17, polaris 39, radix 1, primer 19, spectrum 46, uswds 0, shadcn 22 (of 62). GOV.UK and USWDS use the `:focus` pseudo-class and zero `:focus-visible`; GOV.UK builds its focus style from `$govuk-focus-width` with a transparent outline for forced colors (`.../helpers/_focused.scss:25,65,84`).

## 7. Content and writing guidelines that ship with the system

Command: `grep -rliE 'sentence case|sentence-case|capitali[sz]ation|title case' <d> --include=*.md --include=*.mdx --include=*.yaml --include=*.yml --exclude-dir=node_modules --exclude=CHANGELOG.md | wc -l`; and the same with `'error message'`.

| System | Files on capitalisation | Files on error messages |
|---|---|---|
| carbon | 3 | 3 |
| govuk | 1 | 13 |
| material | 0 | 8 |
| polaris | 19 | 17 |
| radix | 0 | 0 |
| primer | 0 | 1 |
| spectrum | 6 | 30 |
| shadcn | 0 | 15 |
| uswds | 0 | 2 |

Only Polaris ships a content-guideline set inside the repo: `ls polaris/polaris.shopify.com/content/content/` gives `alternative-text.mdx` (261 lines), `error-messages.mdx` (155), `fundamentals.mdx` (85), `grammar-and-mechanics.mdx` (1382), `inclusive-language.mdx` (333), `naming.mdx` (829), `index.mdx` (12), 3057 lines in all (`wc -l`). Its rules include "Use sentence case (capitalize the first word only)" (`grammar-and-mechanics.mdx:94`), "Start sentences with verbs so they feel like actionable instructions" (`fundamentals.mdx:80`) and, for errors (`error-messages.mdx:18-30`): explain what is wrong and what to do; be specific; do not overapologize; "Avoid error jargon like 'invalid'"; do not use "us/we" unless the vendor caused the problem. The page gives Do and Don't pairs under headings (examples at lines 61-137).

GOV.UK's error-message guidance (fetched from https://design-system.service.gov.uk/components/error-message/, 2026-11-27, because it is not in the cloned repo): explain what went wrong and how to fix it; match the field label; use the same text beside the field and in the error summary; keep what the user typed; avoid "Please", "Sorry", "valid/invalid", "oops", "forbidden", "illegal", "you forgot", and the generic "This field is required". The component implements one rule in code: a visually hidden "Error:" prefix defaulting to the word "Error" (`govuk-frontend/.../components/error-message/template.njk:3`, `<span class="govuk-visually-hidden">{{ visuallyHiddenText }}:</span>`), overridable for other languages (the page gives Welsh "Gwall:"). The error summary takes focus on initialisation (`.../error-summary/error-summary.mjs:7`).

Two systems independently ban the word "invalid" in error text (polaris `error-messages.mdx:24`, govuk page above). No other cloned system states an error-wording rule in its repo.

## 8. Testable requirement versus prose advice

What was counted as testable: a lint rule, a test helper that fails CI, a stated numeric value in code, or an agent check with a Detect recipe.

| System | Testable encodings found | Prose-only |
|---|---|---|
| govuk | html-validate `input-missing-label`, `no-missing-references` (`.htmlvalidate.js:19,25`); axe helper in puppeteer tests (`shared/helpers/puppeteer.js:18`); hidden "Error:" prefix in template | error wording (on web page) |
| primer | 3 `primer-react/a11y-*` eslint rules (`eslint.config.mjs:134,136,138`); axe over every story (`e2e/components/Axe.test.ts:36`); `checkStoriesForAxeViolations` helper required for every component (`contributor-docs/testing.md:57,63`) | style guide skill (34 lines) |
| uswds | `test:a11y` blocking in `test:ci` (`package.json:67,69`); `usa-validation`, `usa-error-message` components; named `size-touch-target` token | accessibility skill is prose plus a verification loop (manual screen reader matrix) |
| spectrum | `spectrum-audit` checks with Detect + Severity + deterministic score | docs prose |
| carbon | axe matcher (`toHaveNoAxeViolations.ts:33`), `jsx-a11y`, stylelint-config-carbon | `AGENTS.md` conventions |
| polaris | stylelint token allow-lists (7 plugin dirs) | 3057 lines of content guidance, none machine-checked |
| radix | axe in 16 of 45 tested packages | "WAI-ARIA" comment in 1 of 62 source files |
| shadcn | `data-invalid` + `aria-invalid` pairing rule in `skills/shadcn/SKILL.md:50`; "Dialog, Sheet, and Drawer always need a Title" (`:56`) | none machine-checked in repo |
| material | `skip-animations` and token tests in `testing/` | docs |

## 9. Conventions at least six of nine agree on

| # | Convention | Systems (count) | Evidence |
|---|---|---|---|
| A | Automated axe checking runs in the project's own CI or unit tests | carbon, govuk, polaris, radix, primer, spectrum, uswds (7) | table in section 2 |
| B | Error or invalid state is a first-class state on form controls, usually paired with an error-message element or `aria-invalid` | carbon, govuk, material, polaris, primer, spectrum, shadcn, uswds (8) | section 1 keyword table (invalid/error column nonzero) and `shadcn/SKILL.md:50`, `govuk .../error-message/template.njk` |
| C | A dedicated spinner or progress component exists | carbon, material, polaris, radix (Progress only), primer, spectrum, shadcn (7) | section 1 component table |
| D | Forced-colors (high contrast) is handled in styles | carbon, govuk, material, polaris, primer, spectrum, uswds (7) | section 6 |
| E | Reduced motion is handled in styles | carbon, material, polaris, primer, spectrum, uswds (6) | section 6 |
| F | Numbered or stepped spacing scale instead of free values (measured where tokens are in-repo) | carbon, govuk, polaris, uswds, material, spectrum (6) | section 5 |
| G | Disabled is a first-class state and appears in every system's button or control source (counts 17 to 291 files) | 9 | section 1 |
| H | Agent-facing configuration shipped in the repo | carbon, radix, primer, spectrum, shadcn, uswds (6) | section 2, agent table |

## 10. Conventions on which they visibly disagree

| Topic | Positions | Evidence |
|---|---|---|
| Loading on a button | built-in prop (primer `loading`, polaris `loading`, spectrum `isPending`) versus a separate inline component (carbon `InlineLoading`) versus manual composition (shadcn, uswds, govuk) | `ButtonBase.tsx:59`, `Button.tsx:98`, `Button.tsx:114-120` |
| What "disabled" means | native only (carbon, shadcn, radix) versus native plus `aria-disabled` (govuk) versus a separate focusable "soft/inactive" state (material `softDisabled`, primer `inactive`) versus both documented (uswds) | section 1 disabled table |
| Read-only | first-class (carbon, material, polaris, spectrum) versus not modelled (govuk, uswds, shadcn, primer in component source) | section 1 |
| Empty state | component (polaris, primer, spectrum, shadcn) versus pattern doc (carbon) versus absent (govuk, material, radix, uswds) | section 1 |
| Focus indicator | `:focus-visible` used (carbon 10, polaris 39, spectrum 46, shadcn 22) versus none (govuk 0, uswds 0) | section 6 |
| Minimum target size | explicit number in code (uswds 48px, material 48px, govuk radios gutter) versus unstated and below 44px (shadcn default `h-9` = 36px) versus token only (primer, polaris) | section 4 |
| Where content guidance lives | in the system repo (polaris, 3057 lines, `ls polaris/polaris.shopify.com/content/content/`) versus on the system's website (carbon: https://carbondesignsystem.com/guidelines/content/overview/ "Content" page; primer: nav entries /product/getting-started/foundations/content/ and /product/scenario-patterns/copy/ at https://primer.style/product/ui-patterns/, text not read; govuk: https://design-system.service.gov.uk/components/error-message/). Not verified for uswds (fetch rate-limited). The govuk repo itself also has 13 files mentioning "error message" (section 7 command) | fetched 2026-11-27 |
| Accessibility bar | WCAG 2.1 AA minimum with a 24x24 rule from 2.2 (uswds skill); web.dev 48x48 (primer skill) | `uswds-accessibility/SKILL.md`, `a11y-debugging/SKILL.md:75` |
| Reduced motion | handled (6 systems) versus zero files (govuk, radix, shadcn) | section 6 |
| Who runs axe | every story automatically (primer, uswds via test-storybook) versus per-test opt-in (radix 16 of 45 packages, carbon 28 of 187 test files) | section 2 |

## Smells

1. shadcn/ui ships no a11y automation (0 package.json hits) and no reduced-motion handling across 39 animated files, while shipping a 296-line agent skill. Agents following that skill inherit those gaps.
2. Accessibility checks are opt-in per component in two systems (radix 16 of 45, carbon 28 of 187), so "tested with axe" is not a property of the system.
3. Primer's own axe suite carries a skip list with TODOs for known violations (`Axe.test.ts:10-24`), including color-contrast and nested-interactive failures on loading and skeleton stories. Loading states are where a11y checks fail.
4. Passing axe is declared insufficient by USWDS itself ("necessary and not sufficient"), but only that system says so.
5. Archived or maintenance-mode sources: Polaris React is archived (`README.md:1`); Material Web is in maintenance mode. Their conventions are frozen at the last release.
6. Target-size numbers disagree (24, 36, 44, 48) with no system stating which WCAG criterion it targets except the USWDS skill.
7. Per-component ARIA documentation is uneven (section 3): 1 of 62 radix source files, 6 of 215 Spectrum pages with an Accessibility heading (lower bound), 70 of 203 Carbon pages.
8. Keyword-count tables are presence checks, not coverage; they overcount (`empty`, `error`).

## Patterns worth encoding

1. A rule for agents is only worth shipping if it has a Detect recipe and a severity, as in `spectrum-audit/checks/04-accessibility.md`. For ux-quality, write each rule as Rule, Detect (a grep or AST condition), Severity.
2. Require the state set for any data-bearing component: loading, empty, error, disabled; add read-only for editable fields. Name the five states as the checklist, and detect their absence by looking for a dedicated component or a prop (section 1 table). Agreement is 7 to 8 of 9 for error and loading, 4 of 9 for empty, so encode empty-state as "required for lists and tables" and not for every component.
3. Treat a loading state as one that needs its own announcement: Primer `loadingAnnouncement = 'Loading'` (`ButtonBase.tsx:59`), shadcn `Spinner role="status" aria-label="Loading"`, Primer skeleton example `aria-busy` with the comment "so the screenreader doesn't announce the skeleton state" (`Skeleton.examples.stories.tsx:54`).
4. Pair every animation with a reduced-motion branch: six systems do it in source, the three that do not are the cautionary cases. Detect: `grep -L 'prefers-reduced-motion'` over files containing `animation` or `@keyframes`, or Tailwind `motion-reduce:` beside `animate-`.
5. Make the form-error contract explicit: same text beside the field and in the summary, a visually hidden "Error:" prefix, no "valid/invalid", no "Please", no generic "This field is required" (GOV.UK page, Polaris `error-messages.mdx:18-30`). Two independent systems agree on banning "invalid", and a banned-phrase list is machine-checkable.
6. Run axe over every story or page, not per component by hand (primer `Axe.test.ts:36`, uswds `test:a11y`), and treat failure as blocking, with a skip list that carries a reason (primer). Say in the rule that passing axe is not sufficient (uswds).
7. State target size as a number with its criterion: 24x24 CSS px as the AA floor (SC 2.5.8, w3.org), 44-48 as the design target (uswds token, material 48px). shadcn's 36px default shows why an agent will otherwise pick a smaller number.
8. Soft-disabled for controls that must explain themselves (material `softDisabled`, primer `inactive`): keep the control focusable and give it an accessible reason. Encode as an option, not a requirement, because only two systems model it.
9. Token enforcement as lint (polaris stylelint allow-lists, primer `new-color-css-vars`): the closest the corpus gets to testable visual-consistency rules.
10. Scope firewall wording: do not claim whole-product conformance from using a conformant component library (`uswds-accessibility/SKILL.md`).

## What this contradicts in the frame

- The frame lists "ux-quality" as a rule that loads on interface code. The corpus supports that, and adds that six of nine well-maintained systems already ship agent configuration in their own repos (section 2). The catalog is not early; a ux-quality set will sit next to vendor skills such as `shadcn/SKILL.md` and `spectrum-audit`. It should route to them where an adopter uses that library, rather than restate them.
- The frame treats "UX guidance for command-line tools and for graphical interfaces" as the unknown to test. This corpus is all graphical and web; it provides no evidence either way for command-line interfaces. That question stays open for another worker.
- The frame assumes accessibility and UX guidance is largely prose that must be turned into checks. In this corpus, accessibility is already the most machine-checked topic (7 of 9 run axe), while content and writing guidance is the least (only Polaris ships it in-repo, 3057 lines, none machine-checked). The checkable gap is in content, motion (3 of 9 have none) and target size (3 of 9 state a number), not in axe coverage.
- The frame names Polaris and Material as candidate exemplars. Both are inactive in 2026 (Polaris React archived; Material Web in maintenance mode). Spectrum 2, Primer, Carbon and USWDS are the currently active sources.
- The frame does not mention that `prefers-reduced-motion` and forced-colors are absent from the most-copied systems (shadcn 0 and 0 files; radix 0 and 0). An adopting codebase that copies shadcn components inherits those gaps unless the rule adds them.
