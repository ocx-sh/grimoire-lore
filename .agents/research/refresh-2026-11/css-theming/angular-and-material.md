---
title: Angular 22.1 to 22.3, Angular CLI and Angular Material against the css-theming claims measured at 22.1.4
pair: css-theming
date_researched: 2026-11-27
window_start: 2026-08-30
model: sonnet
sources_fetched: 14
---

# Angular, CLI and Material delta, 2026-08-30 to 2026-11-27

This is a delta against `skills/css-theming-reference/angular.md`, `gate.md` and `rules/css-theming.md`. Nothing was re-built or re-measured in this pass. Where a claim is marked unchanged, the evidence is a diff of the published npm packages (22.1.4 against 22.3.0) or a read of the current changelog or documentation, not a rebuild.

## Headline

- Angular 23 did not ship and was never due in this window. The release schedule on angular.dev lists v22.3 for November 2026, v22.4 for January 2027, v22.5 for March 2027 and v23.0 for about June 2027. v22.0.0 shipped on 2026-06-03 and is the current major. The newest stable is 22.3.0. The "six-month cadence" premise in the commission does not hold.
- Newest stable releases: `@angular/core` 22.3.0 (2026-11-18, npm 2026-11-18T19:30Z), `@angular/cli` 22.3.0 (changelog 2026-11-18, npm 2026-11-19), `@angular/material` 22.3.0 (2026-11-18). npm `latest` for all three is 22.3.0.
- No claim at risk is falsified. One claim needs a text addition (what the namespacer rewrites), and one needs its version pin bumped. No claim needs a re-measured build, except the one already flagged as unmeasured.

## Claims at risk

### 1. "Reproduced from one full `ng build --configuration production` at 22.1.4 / CLI 22.1.6"

Status: unchanged as a statement of fact about the measurement, but stale as a pin. The measurement was made at 22.1.4 and remains true of that version. Newest stable is 22.3.0 for core, CLI and Material.

Evidence that the behaviour measured still holds: `@angular/platform-browser` 22.1.4 and 22.3.0 were unpacked and compared. `fesm2022/_dom_renderer-chunk.mjs` differs only in version strings, one added `disableThrowOnSyntheticProps` export, a `/* @__PURE__ */` annotation and a docs link. The renderer, `SharedStylesHost` and `ShadowDomRenderer` logic is identical. Source: https://registry.npmjs.org/@angular/platform-browser/-/platform-browser-22.3.0.tgz and the 22.1.4 tarball at the same path.

Pin to bump: write "measured at 22.1.4 / CLI 22.1.6; renderer package diffed unchanged at 22.3.0". A re-measured build is optional, only needed if the pin is to read 22.3.0 as measured.

### 2. "`@angular/cli` 22.1.6 requires `^22.22.3 || ^24.15.0 || >=26.0.0` and refuses Node 24.14.0" (also `gate.md`)

Status: unchanged in substance, changed in version pin.

- npm `engines.node` is identical for `@angular/cli` 22.1.6 and 22.3.0: `^22.22.3 || ^24.15.0 || >=26.0.0`. Source: https://registry.npmjs.org/@angular/cli/22.3.0 .
- The angular.dev version table for 22.x.x reads `^22.22.3 || ^24.15.0 || ^26.0.0` (note: `^26.0.0`, not `>=26.0.0`, on the docs page; the package metadata keeps `>=26.0.0`). Source: https://angular.dev/reference/versions .
- Changed upstream: CLI 22.3.0 (2026-11-18) commit `f52fb536a1` "decouple official Node.js support check from execution gate" moved the check into `bin/version.js` and split it into `isNodeVersionSupported` and `isNodeVersionRunnable`. In 22.3.0 a version newer than the highest supported major, or an odd interim major above the minimum, now runs with a warning instead. Source: unpacked `@angular/cli@22.3.0` `bin/ng.js` and `bin/version.js`, changelog https://github.com/angular/angular-cli/blob/main/CHANGELOG.md .
- Node 24.14.0 is still refused in 22.3.0. It is major 24, below the 24.15 floor, even, and not above the maximum major, so neither function returns true. The code falls to the error branch and sets `process.exitCode = 3`. "Refuses outright" still holds for 24.14.0. It no longer holds as a general statement about every unsupported Node: odd interim majors such as 25 and majors above the highest range now start with a warning. In 22.1.6 only majors 23 and 25 got that warning (verified by diffing `bin/ng.js`).

Pin to bump: "22.1.6" to "22.3.0" in `angular.md` and `gate.md` is safe; the range string stays. Optionally add the warning-instead-of-refusal behaviour for odd and newer majors.

### 3. Custom-property rewrite and `provideCssVarNamespacing`

Status: unchanged in mechanism; changed in documented scope; no rename, no default change.

- The API did not leave a preview tier, because it never carried one. In the 22.3.0 type declarations it is tagged `@publicApi` (stable) and sits in `@angular/platform-browser`: `declare function provideCssVarNamespacing(namespace?: string): EnvironmentProviders`. The doc comment reads "If not provided, it defaults to the `APP_ID`. An underscore is appended unconditionally." Source: https://registry.npmjs.org/@angular/platform-browser/-/platform-browser-22.3.0.tgz (`types/platform-browser.d.ts`). The 22.1.4 declaration is identical except for a docs `@see` link.
- Default unchanged: the official guide states "Angular does not namespace custom properties until you ask it to", and that `provideCssVarNamespacing()` uses `APP_ID` (default `ng`). Passing `'my-app_'` yields `--my-app__primary-color`, so the underscore is appended unconditionally, which matches the baseline `${ns ?? appId}_`. Source: https://angular.dev/guide/components/styling#namespacing-css-custom-properties .
- `--global--` unchanged: the guide says Angular removes `--global` and leaves the rest, "including applications that never configure a namespace". It stresses two hyphens; a single hyphen does not opt out.
- Wording risk in `angular.md`: the heading and first paragraph say Angular "rewrites every custom property" at "≥22.1". The official guide frames namespacing as opt-in by provider. The baseline's own live reproduction (default gives `var(--consumer-token)`, `provideCssVarNamespacing('acme')` gives `var(--acme_consumer-token)`) already shows the opt-in behaviour, so the facts are right but the heading overstates. Suggested text edit, no re-measure: say the compiler always emits the `%NS%` placeholder, and the runtime substitutes an empty string unless `provideCssVarNamespacing` is installed.
- New documented facts to add (text edit): the namespacer covers declarations, `var()` references, `@property` rules and style bindings including `[style.--x]` and host-object style bindings. `@property` namespacing arrived in 22.1.6 (2026-09-09, commit `cbb8702143` "namespace `@property` declarations"), after the 22.1.4 measurement, so the baseline measured a compiler that did not yet namespace `@property`. It does not rewrite static `style="--p: ..."` attributes, runtime-loaded global stylesheets, or external styles the build does not inline. The guide says it applies to every compiled component, including installed libraries, and a mismatch is silent. Sources: https://angular.dev/guide/components/styling and https://github.com/angular/angular/blob/main/CHANGELOG.md (22.1.6 and 22.1.0 entries `f98547675c`, `8c8b2f7783`).
- `rules.md` CSS-API-02 relies on the `--global--` spelling for public tokens and stays valid.
- Still unmeasured, and stays so: namespacing interacting with Angular Material's partially compiled components. The guide's warning about libraries reading theme properties from a global stylesheet is upstream confirmation of the risk but not a measurement. Needs a re-measured build if the corpus wants to assert Material behaviour under namespacing.

### 4. Emulated tuples `_ngcontent-ng-c<hash>` and `_nghost-`, and style-less component downgrade to `None`

Status: unchanged for the tuples; "could not determine" for the downgrade as a fresh doc claim, but the mechanism is confirmed unchanged.

- The renderer package is byte-equivalent in logic between 22.1.4 and 22.3.0 (see claim 1), and the changelog shows no change to attribute naming. The official guide (https://angular.dev/guide/components/styling) states no note about empty styles downgrading to `None`; it is a compiler/runtime behaviour documented only in the changelog (perf commit `97fb86d331` "set encapsulation to `None` for empty component styles", #57130, from an older release). No later revert appears in the 22.1.5 to 22.3.0 entries.
- New in the window that touches Emulated output: 22.2.0 (2026-09-23) `d0d7f57e08` "scope nested CSS rules" and `a4f1a94948` "do not encapsulate nested selectors if parent contains ::ng-deep"; 22.2.2 (2026-10-08) `fa63bfad14` "avoid leaking ::ng-deep detection state between rules". Native CSS nesting inside component styles is now scoped, and a nested selector under an `::ng-deep` parent is not scoped. The specificity table in `angular.md` covers flat rules only; nested-rule output changed and was not re-measured. A re-measured build is needed only if the corpus wants a nested-rule row.

### 5. `ShadowDomRenderer` calls `sharedStylesHost.addHost(shadowRoot)`

Status: unchanged. At 22.3.0 the constructor reads `if (this.sharedStylesHost) { this.sharedStylesHost.addHost(this.shadowRoot); }`, and `addHost` is defined at the same place in `SharedStylesHost`. Add one nuance: the call is guarded by `if (this.sharedStylesHost)`, which the baseline text does not mention. Source: unpacked `@angular/platform-browser@22.3.0` `fesm2022/_dom_renderer-chunk.mjs`.

New upstream fact to add: a fourth mode `ViewEncapsulation.ExperimentalIsolatedShadowDom` (value 4, tagged `@experimental 21.0` in the source, so it predates this window) is documented as strictly isolating, with global styles unable to affect the shadow tree. It is the only documented answer to the leak in this claim, and it is experimental. The guide's ShadowDom section itself still says nothing about shared styles being copied in. Sources: https://angular.dev/guide/components/styling and `ViewEncapsulation` in `@angular/core@22.3.0` `types/core.d.ts`. The baseline rule "ShadowDom is not isolation" holds for `ShadowDom`; whether the Experimental mode truly blocks the `addHost` copy was not measured. That needs a re-measured build before any rule recommends it.

### 6. Layer precedence decided by runtime mount order; gate note on `externalRuntimeStyles`

Status: unchanged. `SharedStylesHost` and the DOM renderer are unchanged between 22.1.4 and 22.3.0, so runtime `appendChild` ordering is the same. The `externalRuntimeStyles` option has no entry in the Angular CLI changelog for 22.1.6 to 22.3.0 (searched the full file), so the gate routing note stands. The CLI changelog does show build-side style work (shared stylesheet bundling cache, critical CSS plans, CSP nonce on stylesheet links in 22.3.0), none of which changes mount order semantics on the evidence read.

Open question on mount-order mitigation: no upstream answer appeared. No changelog entry, guide section or API in the window gives ordered or explicit layer placement for component styles. The nearest upstream facts are the guide's note that Emulated and ShadowDom do not guarantee component styles override outside styles, and the Experimental isolated mode above. The corpus question stays open.

### 7. "`::ng-deep` ... Angular discourages new use and offers no successor"

Status: unchanged. The current guide says "The Angular team strongly discourages new use of `::ng-deep`. These APIs remain exclusively for backwards compatibility." No successor or replacement is named, and none was found in the changelog window. Behaviour fixes only (22.2.0, 22.2.2 above). Source: https://angular.dev/guide/components/styling .

### 8. Angular Material 22.1.4: 91/91 `None`, `--mat-sys-*` and `--mat-<component>-*` only, zero `--mdc-*`, `mat.*-overrides()` as contract

Status: unchanged, and re-verified on 22.3.0 by unpacking the packages.

- `@angular/material@22.3.0` `fesm2022`: 91 occurrences of `encapsulation: i0.ViewEncapsulation.None`, no `Emulated` or `ShadowDom`. The 22.1.4 package gives the same 91.
- Zero files in 22.1.4 or 22.3.0 contain `--mdc-`.
- `var(--mat-…)` reads in 22.3.0 are dominated by `--mat-sys` (2258), then per-component families (`--mat-list`, `--mat-chip`, `--mat-button`, `--mat-form`), consistent with the claim.
- `guides/theming.md` on `main` still presents `mat.theme-overrides` and per-component `mat.<component>-overrides` as the customization API, and says the overrides API validates token spelling. Source: https://github.com/angular/components/blob/main/guides/theming.md .
- Changelog items for 22.1.5 to 22.3.0 are additive: a stepper header-icon-shape styling token (`9fb490792`), chip touch-target styles, a datepicker period-button specificity fix, exported aria injection tokens. These add `--mat-<component>-*` surface, not a rule change. Source: https://github.com/angular/components/blob/main/CHANGELOG.md .

Pin to bump: "Angular Material 22.1.4" to "22.3.0" (section heading and anchor `#angular-material-2214` in `angular.md` and the Contents line).

## Version pins to bump

| Location | Old | New | Needs re-measure |
|---|---|---|---|
| `angular.md` build provenance line | 22.1.4 / CLI 22.1.6 | keep as measured; add "renderer unchanged at 22.3.0" | No |
| `angular.md` and `gate.md` Node engine sentence | `@angular/cli` 22.1.6 | 22.3.0 (range unchanged) | No |
| `angular.md` Material heading | 22.1.4 | 22.3.0 | No (package scan done) |
| `angular.md` "Angular ≥22.1 rewrites every custom property" | unconditional wording | opt-in via `provideCssVarNamespacing`, placeholder always emitted | No |

## Behavioural changes that need a re-measured build, not a text edit

1. Namespacing with Angular Material (already flagged as unmeasured in the baseline; the new guide warning raises its priority).
2. `ViewEncapsulation.ExperimentalIsolatedShadowDom`: whether it blocks the `addHost` copy of global styles. Only matters if a rule would recommend it.
3. Nested CSS rule output under Emulated since 22.2.0, only if the specificity table is to cover nesting.

## Normative candidates

- Candidate: "Do not install `provideCssVarNamespacing` in an app that consumes Angular Material without first checking that global theme properties are not read by compiled component styles." Rationale: the official guide states library components are namespaced too and a global-stylesheet theme property silently stops matching. Verification: grep the app config for `provideCssVarNamespacing`, then assert in a live browser that `getComputedStyle` of a Material component still resolves its `--mat-sys-*` values.
- Candidate: "Public tokens in component styles use the `--global--` spelling." Rationale: unchanged and confirmed by the current guide; already CSS-API-02. Verification: `grep -rE -- '--global-[^-]' src` flags single-hyphen mistakes the guide says do not opt out.
- Candidate (low priority): "Prefer a `--mat-<component>-*` token through `mat.<component>-overrides()` over `::ng-deep`." Rationale: the guide strongly discourages new `::ng-deep` and names no successor, while Material's overrides API is the supported route. Verification: grep for `::ng-deep` in changed files and flag any that target `.mat-` or `.mdc-` selectors.

## Sources fetched

1. https://raw.githubusercontent.com/angular/angular/main/CHANGELOG.md
2. https://raw.githubusercontent.com/angular/angular-cli/main/CHANGELOG.md
3. https://raw.githubusercontent.com/angular/components/main/CHANGELOG.md
4. https://raw.githubusercontent.com/angular/components/main/guides/theming.md
5. https://angular.dev/guide/components/styling
6. https://angular.dev/reference/releases
7. https://angular.dev/reference/versions
8. https://registry.npmjs.org/@angular/cli (dist-tags and release times)
9. https://registry.npmjs.org/@angular/core (dist-tags and release times)
10. https://registry.npmjs.org/@angular/material (dist-tags and release times)
11. `@angular/platform-browser` 22.1.4 and 22.3.0 tarballs
12. `@angular/cli` 22.1.6 and 22.3.0 tarballs
13. `@angular/material` 22.1.4 and 22.3.0 tarballs
14. `@angular/core` 22.3.0 tarball

Not fetched or not read in full: the dedicated angular.dev API page for `provideCssVarNamespacing` returned the site homepage shell, so its stability was read from the published type declarations instead. The Angular blog posts were not opened. The roadmap page was not opened; the release schedule came from the angular.dev releases page.
