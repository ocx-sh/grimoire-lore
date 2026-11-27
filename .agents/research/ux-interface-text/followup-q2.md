---
title: "UX-TEXT follow-up q2: can one string-position extractor per language replace the candidate greps in UX-TEXT-02, -08 and -24?"
program: product
topic: ux-interface-text
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 3
scope: "Measurement over the fleet's own code; three PyPI pages fetched only to date the tool versions. Fleet commits: grimoire-rs/vscode 9230dcd, ocx-sh/ocx 02b8434e, grimoire-rs/grimoire 72d3fce1, ocx-sh/website a9dd6af. Everything was read, nothing in the fleet was changed. Scripts and outputs live in ~/.cache/research-lang/exemplars/product/wave2/ux-text-q2r/ (repair pass, every number below re-run there; the first pass is in ux-text-q2/)."
---

# UX-TEXT follow-up q2: string-position extractors

## Question

Can one string-position extractor per language (Rust `Display` at the boundary, VS Code notification calls, `aria-label`/`alt`/`title` attributes) replace the candidate-list greps in UX-TEXT-02, -08 and -24 with real pass/fail checks?


## Question

Can one string-position extractor per language (Rust `Display` at the boundary, VS Code notification calls, `aria-label`/`alt`/`title` attributes) replace the candidate-list greps in UX-TEXT-02, -08 and -24 with real pass/fail checks?

## Answer

Partly. An extractor is worth building, but it replaces the candidate list in only one of the three rules, and only for narrow, named patterns.

| Rule | Replaced by a pass/fail extractor check? | What the measurement shows |
|---|---|---|
| UX-TEXT-24 (fragment assembly) | A worklist, not a gate. | A position-aware AST check lists 26 candidates in the extension and reaches the known case (`render.ts:718-731`) that the documented regex misses (regex: 0 hits). After reading all 26: 17 true splices, 6 borderline, 3 false positives (65% precision on true, 88% on true plus borderline). Recall is poor: a random sample of 40 of the 499 unflagged template literals contained one real splice the extractor cannot see (`gatePrompt.ts:224-232`, a sentence built from a data table and a list helper). Point estimate of recall 58%, 95% interval about 20% to 98%. |
| UX-TEXT-08 (one event, one message) | Yes for two narrow idioms. No for the general rule. | A cross-type Rust check finds exactly one hit in ocx and none in grim: the known `ProjectError` path printed twice. A TypeScript check "fire-and-forget failure toast with no log call" finds 2 hits, 1 true and 1 the notification sink itself. A within-string repeated-placeholder check is useless: 27 hits, 0 a repeated cause. |
| UX-TEXT-02 (next step) | No. | The CLI rule is already a rendered-output check. A source token check says 83% of ocx and 84% of grim `#[error]` strings lack an action token, against 9 of 20 (45%) rendered errors lacking a next step in the audit. For GUI sites a token check gives 13 pass and 28 no-token across 41 failure sites; of the 28, 4 are real misses, 6 are false positives and 18 cannot be decided from source. It is a worklist generator, not a gate. |

The finding that changes how the rules are written: a call-site extractor must be wrapper-aware. The extension has 30 direct `show*Message` calls, of which 14 are `showErrorMessage` or `showWarningMessage`. Another 27 failure toasts go through two wrappers (`notifyError` 19, `reportGrimFailure` 8). So there are 41 failure sites and a grep on the platform call sees 14 (section 4 has the reconciliation).

## Method

Tools: Python 3.14.10 (`./venv/bin/python -V`), Node v26.13.1 (`node -v`, not used by the extractors), `tree-sitter` 0.27.0, `tree-sitter-rust` 0.24.2, `tree-sitter-typescript` 0.23.2 (`./venv/bin/pip list | grep -i tree`, output: `tree-sitter 0.27.0`, `tree-sitter-rust 0.24.2`, `tree-sitter-typescript 0.23.2`). Python's standard `html.parser` handles attributes. All commands run from `~/.cache/research-lang/exemplars/product/wave2/ux-text-q2r/`, abbreviated `$Q`. The scripts are the first-pass scripts, unchanged, copied into `$Q`; `check02rs.py`, `zb.py`, `check02ts_split.py`, `recall24.py`, `count1.py` and `f24.py` were added in this repair pass.

1. `extract_rs.py` parses every non-test `.rs` file (directories `tests`, `benches`, `examples`, `test`, `target` skipped; `#[cfg(test)]` and `#[test]` items skipped) and emits `#[error("...")]`, `write!`/`writeln!`, `println!`/`eprintln!`, `info!`...`trace!` and `format!`/`panic!`/`assert!`/`anyhow!`/`bail!` strings.
2. `extract_ts.py` finds every `show(Error|Warning|Information)Message` call, classifies the first argument, resolves one hop through a `const`, and records the button arguments.
3. Attribute positions: the template literal (webview) or the `.astro` body is fed to `HTMLParser`, each `${...}` replaced by a sentinel.
4. `wrappers.py`: a function is a wrapper when it passes one of its own parameters as first argument into a sink or an already-found wrapper, repeated to a fixed point.

## Findings

### 1. What an extractor can and cannot classify in Rust

Commands and output:

```
$ ./venv/bin/python extract_rs.py /home/mherwig/dev/ocx-sh/ocx/crates > ocx_rs.json
$ ./venv/bin/python extract_rs.py /home/mherwig/dev/grimoire-rs/grimoire/src /home/mherwig/dev/grimoire-rs/grimoire/crates > grim_rs.json
$ ./venv/bin/python count1.py
ocx 3254 {'fmt': 1386, 'log': 753, 'error_attr': 831, 'display_write': 215, 'print': 69} boundary 1115 (34%) log 753 (23%) fmt 1386 (43%)
grim 2674 {'log': 481, 'fmt': 1653, 'display_write': 172, 'error_attr': 365, 'print': 3} boundary 540 (20%) log 481 (18%) fmt 1653 (62%)
```

`count1.py` sums `error_attr + display_write + print` as "boundary" and divides each group by the total. Reading: 34% of ocx and 20% of grim positions are syntactically certain boundary positions. 23% and 18% are logs, whose user visibility depends on verbosity (the grim `WARN` line reaching users is UX-TEXT-07). 43% and 62% are `format!`-family calls whose destination is unknown from syntax: it may be an error message, a path, a cache key or a log field. Resolving them needs data-flow analysis a per-file extractor does not give. This is the ceiling on "stop precision being capped by log and panic text": panics and logs are separable, `format!` is not.

### 2. UX-TEXT-24: fragment assembly (TypeScript and webview)

Documented regex, run in `grimoire-rs/vscode`:

```
$ git grep -nP "\+\s*['\"`]\s*(and|of|in|items?|results?)\b" -- 'src/*.ts' | wc -l
0
```

The documented ternary grep lists 40 lines, mostly CSS class toggles. The first AST version (`check24.py`) printed `Counter({'ternary-splice': 60, 'concat-literals-only': 22, 'concat-nonliteral': 3})`; `' active'`, `'true' : 'false'` and similar are CSS or ARIA state, not words. Position awareness fixes that (`check24b.py`: each substitution is classified by where it lands in the parsed HTML; `${synced}` resolves one hop to its `const` ternary):

```
$ ./venv/bin/python check24b.py /home/mherwig/dev/grimoire-rs/vscode/src > o24b.txt
Counter({('attr-nonvisible', True): 38, ('text', True): 24, ('text', False): 19, ('attr-nonvisible', False): 5, ('attr', False): 4, ('attr', True): 2})
$ ./venv/bin/python f24.py        # visible text or visible attribute, with words around: 24 + 2 = 26 rows
```

All 26 rows were read, including the 3 left unread in the first pass:

| Class | Count | Rows (`f24.py` row number: file:line) |
|---|---|---|
| True splice (a word, phrase or optional sentence chosen inside a sentence) | 17 | 2 `notify.ts:115`; 4 `forceRetry.ts:121`; 5 `updateRefusal.ts:89`; 6 `settings.ts:611`; 7 `render.ts:217`; 8 `:282`; 9 `:532`; 11, 12 `:718` (noun swap, sync note); 13 `:731`; 14, 15 `:1195`; 16 `:1336`; 18 `model.ts:1284`; 19 `:1593`; 24 `model.ts:2573` (optional sentence appended after a complete one, same shape as row 5); 26 `settings/render.ts:50` |
| Borderline | 6 | 10 `render.ts:549`, 20-23 `model.ts:2274, :2283, :2290, :2300` (scope word `Project`/`Global` inside a label); 3 `scopes.ts:670` (`${why}` clause chosen inside an output-channel log line, not a dialog or webview) |
| False positive | 3 | 1 `installer.ts:335` (binary file name by platform); 25 `details/main.ts:147` (CSS class from a nested-template misparse); 17 `model.ts:1278` (each branch is a whole sentence, `Stopped at X of Y.` or `Loading X of Y...`, chosen then prefixed) |

Result: 17 of 26 true (65%), 6 borderline (23%), 3 false (12%). The known case `render.ts:722` is found (rows 11 and 12). Row 24 was read in `model.ts:2560-2575`, row 3 in `scopes.ts:662-678`, row 17 in `model.ts:1270-1283`.

**Recall.** Ground truth does not exist, so a sample was labelled. Population: every template literal in `src/**/*.ts` with at least one substitution and words (528, `recall24.py`), minus the 24 flagged lines, gives 499 unflagged. 40 were drawn with `random.seed(24)` and read in full (the sample is in `recall24_sample.json`).

```
$ ./venv/bin/python recall24.py
template literals with substitutions and words: 528 flagged lines: 24 not flagged: 499
```

Of the 40, one is a real splice the extractor cannot see: `gatePrompt.ts:227`, `${p.short} ${p.verb}`, part of the consent sentence assembled at `gatePrompt.ts:221-233` from `CONSENT_PARTS` entries (`noun`, `says`, `verb`) joined by a `list()` helper (nouns, `says` text and `ask` are three separately built fragments). The remaining 39 are single-placeholder strings, list joins (`gatePrompt.ts:175`), HTML structure or keys. One miss in 40 scales to about 12 missed splices in 499, so recall is about 17 / (17 + 12) = 58%. The exact binomial 95% upper bound for 1 of 40 is 13.2%, which scales to 66 missed and a lower recall bound of about 20%. The missing class is "sentence built from a data table plus a helper", which no template-literal extractor sees.

Verdict for -24: a worklist with 65% precision on true and unknown, probably mediocre, recall. A ratchet on the true count is sound only for the pattern it covers; it cannot certify the rule. The checkable form is therefore a pattern ban plus review, not "no fragment assembly".

### 3. UX-TEXT-08: one event, one message

**(a) Within-string repeated placeholder** (`check08rs.py`, over the JSON from section 1):

```
$ ./venv/bin/python check08rs.py > o08rs.txt
$ grep -cE '^(ocx|grim) ' o08rs.txt
27          # 18 ocx, 9 grim
```

The first pass reported 23; that figure does not reproduce. 27 is the current count at the stated commits. All 27 were read in full (each line's format string). In 24 the repeat is deliberate: the second mention is the remedy (`run \`ocx remove {name}\``, `pass --token-host {host}`). In 3 it is not user text at all: `rust.rs:314` is generated Rust (`field_{position}`), `mcp.rs:272` prints the literal text `${VAR}` and two `libc_lint.rs` rows print `${self.installPath}` as a literal token. Zero hits are a same-cause duplicate. This check stays out of the ruleset.

**(b) Cross-type wrapper** (`check08x.py`: a `Display` impl writing `self.a` and `self.b`, where `b` has an enum type and one of that enum's `#[error]` strings interpolates `{a}`):

```
$ ./venv/bin/python check08x.py /home/mherwig/dev/ocx-sh/ocx/crates
enums with #[error]: 517 structs: 1199 Display impls: 116
CROSS-TYPE ProjectError ocx_project/src/error.rs 104 prints self.path then self.kind; ProjectErrorKind variant at line 125 also prints {path}: ocx.toml already exists at '{path}'
hits 1
```

Over `grimoire/src` and `grimoire/crates`: `hits 0` (368 enums, 76 `Display` impls; run the same way with those two paths). The one hit is audit row 11, [product-audit/cli-first-run.md](../product-audit/cli-first-run.md) section 4 (`/tmp/cx4/ocx.toml: ocx.toml already exists at '/tmp/cx4/ocx.toml'`). Precision 1 of 1, recall unknown: the `#[error("{path}: {source}")]` form with `#[source]` needs type resolution and is not covered.

**(c) TypeScript failure toast with no log** (`check08ts.py` after regenerating `vsc_sites.json`):

```
$ ./venv/bin/python extract_ts.py /home/mherwig/dev/grimoire-rs/vscode/src > vsc_sites.json
$ ./venv/bin/python check08ts.py
Counter({(True, True): 7, (False, False): 5, (False, True): 2})
extension.ts 431 Warning True True 1 cancel
notify.ts 97 Error False False 1 -
views/forceRetry.ts 59 Warning False False 1 cancel
views/forceRetry.ts 120 Error False True 1 cancel
views/updateRefusal.ts 92 Error False True 2 cancel
views/updateRefusal.ts 104 Error True True 2 cancel
views/details.ts 745 Warning True True 1 cancel
views/details.ts 895 Warning False False 1 -
views/ratingAuth.ts 48 Warning False False 1 -
views/hookPrompt.ts 92 Warning True True 1 cancel
views/vote.ts 165 Warning False False 1 cancel
views/staleLock.ts 61 Warning True True 1 cancel
views/staleLock.ts 134 Error True True 1 cancel
views/switchReplacement.ts 70 Warning True True 1 cancel
```

Columns: file, line, call, log in the same block, log anywhere in the function, number of `show*Message` calls in the function, cancel guard present. The tuple key is (log in block, log in function): 7 sites have a log in the block, 2 only in the function (`forceRetry.ts:120`, `updateRefusal.ts:92`), 5 nowhere (`notify.ts:97`, `forceRetry.ts:59`, `details.ts:895`, `ratingAuth.ts:48`, `vote.ts:165`). Of the 7 lacking a block log, `forceRetry.ts:59`, `ratingAuth.ts:48`, `vote.ts:165` are consent prompts, `forceRetry.ts:120` and `updateRefusal.ts:92` log at function level, `notify.ts:97` is the sink, and `details.ts:895` is a real failure with no log. The zero-button restriction (`zb.py`, which prints the button count per site):

```
$ ./venv/bin/python zb.py | grep -E 'buttons=0'
notify.ts 97 showErrorMessage buttons=0 log_in_block=False | arg0: message
views/details.ts 895 showWarningMessage buttons=0 log_in_block=False | arg0: outcome.message
```

Two hits, one true (`details.ts:895`), one the sink (precision 1 of 2; the sink is an allow-list entry).

Verdict for -08: the general rule stays a snapshot assertion. Two narrow checks can be gates: the Rust cross-type check and the TypeScript zero-button check. The cancellation guard column ("cancel") is a loose regex (`=== undefined|choice|cancel`) and was not validated.

### 4. UX-TEXT-02: next step

**Rust.** The CLI check is a rendered `^help: ` line. A source-level proxy was measured anyway (`check02rs.py`: does the `#[error]` string contain a backticked token, a `--flag`, an `UPPER_CASE` variable, or `run|use|set|pass` plus a word?):

```
$ ./venv/bin/python check02rs.py
ocx error_attr 831 no-fmt(transparent/bare) 80 with fmt 751 unique fmt 691 | token 127 no token 624 83% without | whole-string placeholder only 44
grim error_attr 365 no-fmt(transparent/bare) 40 with fmt 325 unique fmt 299 | token 51 no token 274 84% without | whole-string placeholder only 21
```

The gap between 831 and 751 is the 80 `#[error(transparent)]` attributes, which have no format string; grim's 365 minus 40 gives 325. The 751 and 325 are the strings the proxy tests. (The first-pass script was not saved; `check02rs.py` is a rewrite with the same token definition, and it reproduces the first-pass counts 127/624 and 51/274 exactly.)

The rendered baseline is the audit, not a measurement here: [product-audit/cli-first-run.md](../product-audit/cli-first-run.md), section 4 table, the Next column. Re-derived:

```
$ sed -n '79,98p product-audit/cli-first-run.md | awk -F'|' '{print $7}' | sed 's/^ *//' | cut -d, -f1 | sort | uniq -c
      1 mcp\
      9 no
      1 yes
      9 yes
```

Row 12 contains an escaped `\|` that shifts its columns (`mcp\` is that row; its Next value is `yes`), so 9 "no" and 11 "yes" of 20: 45% without a next step, rows 5, 6, 8, 10, 11, 16, 17, 18, 19. The proxy (83-84%) does not track the rendered rate (45%). In a seeded sample (`random.seed(7)`) many strings state a constraint whose fix is implied (`repository must be lowercase`), some are internal, some carry a next step in a verb the list lacks (`choose a different tag`, grim `oci/release.rs:109`). Not usable as pass/fail.

**TypeScript.** `check02ts.py` extracts failure sites (direct `showErrorMessage`/`showWarningMessage` plus the two sink wrappers) and tests for a next-step token. The split by call type, from `check02ts_split.py` (`check02ts.py` with three counters appended):

```
$ ./venv/bin/python check02ts_split.py | grep -E "^(sites|SPLIT)"
sites 41 with step token 13 without 28
SPLIT total by callee {'notifyError': 19, 'showWarningMessage': 9, 'showErrorMessage': 5, 'reportGrimFailure': 8}
SPLIT without token by callee {'notifyError': 19, 'showErrorMessage': 1, 'reportGrimFailure': 7, 'showWarningMessage': 1}
SPLIT with token by callee {'showWarningMessage': 8, 'reportGrimFailure': 1, 'showErrorMessage': 4}
```

So 41 = 14 direct (9 warning, 5 error) + 19 `notifyError` + 8 `reportGrimFailure`. The 13 that pass are mostly direct calls with a button (confirmation prompts), so the pass count is high for a reason unrelated to error text. Of the 28 flagged (the full list is printed by the script):

| Class | Count | Examples |
|---|---|---|
| Real miss | 4 | `settings.ts:601`, `:610` (`grimoire.toml does not exist yet.`), `:544`, `:620` |
| False positive: next step written as prose | 6 | `extension.ts:424`, `:458` (`update grim ...`), `switchReplacement.ts:87`, `:104` (`remove it manually`), `settings.ts:591`, `extension.ts:268` (`See <url>`) |
| Undecidable from source: a dynamic cause relayed from grim | 18 | `extension.ts:293`, `:757`, `:842`, `sidebar.ts:664`, `:902`, `details.ts:895`, `:990`, `:1695`, `:1708`, `pickVersion.ts:71`, `hookPrompt.ts:111`, `:133`, `staleLock.ts:82`, `:145`, `settings.ts:559`, `:604`, `notify.ts:97`, `:115` |

**Wrapper reconciliation.** `wrappers.py` (fixed-point discovery) over the extension:

```
$ ./venv/bin/python wrappers.py /home/mherwig/dev/grimoire-rs/vscode/src
wrappers: ['addRegistry', 'confirmOverwrite', 'handleMessage', 'initScope', 'notifyError', 'offerLock', 'offerRatingCredential', 'onMessage', 'openConfigFile', 'reportGrimFailure']
Counter({'notifyError': 19, 'reportGrimFailure': 8, 'offerLock': 4, 'confirmOverwrite': 2, 'onMessage': 2, 'initScope': 2, 'addRegistry': 1, 'handleMessage': 1, 'offerRatingCredential': 1, 'openConfigFile': 1}) 41
```

Reconciliation of the figures that looked contradictory: (i) 30 = all direct `show*Message` calls including 16 `showInformationMessage` (`extract_ts.py` output: 16 information, 9 warning, 5 error); (ii) 14 = the direct error and warning calls, the only direct calls that are failure sites; (iii) 27 = `notifyError` 19 + `reportGrimFailure` 8, the failure wrappers; 14 + 27 = 41 failure sites; (iv) the 41 printed by `wrappers.py` is a different quantity, the total call count of all 10 discovered wrappers, and equals 41 by coincidence. The 8 non-sink functions are the 8 names left after removing `notifyError` and `reportGrimFailure` from the 10 (`addRegistry`, `confirmOverwrite`, `handleMessage`, `initScope`, `offerLock`, `offerRatingCredential`, `onMessage`, `openConfigFile`) with 14 call sites between them. They are false wrapper hits (a `message` parameter passed into a prompt), so the parameter-flow heuristic needs a reviewed allow-list. The first-pass sentence "27 more toasts via wrappers, 30 direct" mixed (i) and (iii) and is withdrawn.

### 5. Attribute positions (`aria-label`, `alt`, `title`, `placeholder`)

```
$ ./venv/bin/python attrs_astro.py /home/mherwig/dev/ocx-sh/website
astro files 143 {'static': 41, 'dynamic': 53}
$ git grep -nE '(aria-label|alt|title|placeholder)=' -- '*.astro' | wc -l     # in ocx-sh/website
95
```

94 attribute occurrences against 95 grep lines. The extractor adds no recall over grep for attribute names. It adds the static versus dynamic split: 56% (53 of 94) of values are expressions whose text is not in the file. It does not separate a component prop named `title` from an HTML attribute. In webview templates the section 2 parse separates visible positions from `class` and `data-*`.

## Effect on the ruleset

| Rule | Effect | Exact change |
|---|---|---|
| UX-TEXT-02 | confirm (MUST); change Verify | GUI sentence: "Run a wrapper-aware extractor that lists every `show(Error\|Warning)Message` call and every call to a function that passes its first parameter into one (fixed point). In `grimoire-rs/vscode` that is 41 failure sites, not the 14 a direct grep finds. A reviewer confirms for each listed site that a button, the text or a registered command title names a next step. Token matching only orders the list: it passed 13 and flagged 28, with 4 real misses and 6 prose false positives among the flagged, and 18 undecidable." CLI half unchanged (rendered `^help: ` line). Add: "Do not gate on action tokens in Rust `#[error]` strings: 83 to 84% lack them against 45% of rendered errors." |
| UX-TEXT-08 | change Verify | Add Gate 1 (Rust): no `Display` impl writes `self.<a>` and `self.<b>` where an `#[error]` string of `<b>`'s enum interpolates `{<a>}` (fleet: 1 hit, `ocx_project/src/error.rs:104` against `:125`; grim 0). Add Gate 2 (TypeScript): every `show(Error\|Warning)Message` call with no button argument has a log call (`appendLine`, logger) in its function, or is the declared sink (fleet: `details.ts:895` fails). Keep the snapshot, and the two existing greps labelled "candidates only". State that a repeated placeholder inside one string is not a duplicate-cause check (27 hits, 0 duplicates). |
| UX-TEXT-24 | change Verify; severity unchanged (SHOULD) | Replace the regex with the position-aware extractor as a candidate generator: "In a visible text or visible-attribute position with other words around it, a substitution that is a ternary of two string branches, or an identifier whose one-hop `const` is such a ternary, is a candidate. A reviewer classifies each. Fleet state: 26 candidates, 17 true, 6 borderline, 3 false. The extractor does not see a sentence built from a data table and a joining helper (`gatePrompt.ts:221-233`); review for those by reading every function that returns or passes a user-facing `message`." Gate as a ratchet on the true count, and do not claim zero-defect. A `+` chain of literals is not a finding. Keep "Everything else is found by review." |
| UX-TEXT-26 | confirm | The extractor's plural noun-swap rows overlap this rule (`render.ts:217`, `:718`, `:1195` twice, `model.ts:1284`). No change. |
| UX-TEXT-03, -07 | confirm | 18 to 23% of Rust positions are logs, whether a log reaches users stays a runtime fact. |
| NEW UX-TEXT-31 | new, SHOULD | **Text.** Route every user-facing failure notification through one named function per extension (for example `notifyError`), and keep its call sites enumerable by name. Rationale: 27 of 41 failure sites use a wrapper, and a check on the platform call alone sees 14. Verification: run fixed-point wrapper discovery (`wrappers.py`: a function whose first argument expression mentions its own parameter and is passed into `show*Message` or a found wrapper); the list is exactly the declared sink and its declared callers plus a reviewed allow-list. Fleet state: 10 wrappers found, 2 real (`notifyError`, `reportGrimFailure`), 8 on the allow-list (`addRegistry`, `confirmOverwrite`, `handleMessage`, `initScope`, `offerLock`, `offerRatingCredential`, `onMessage`, `openConfigFile`). |

## Dated facts

| Fact | Source and date |
|---|---|
| Fleet commits ocx 02b8434e, grim 72d3fce1, vscode 9230dcd, website a9dd6af | `git -C <repo> rev-parse --short HEAD` on 2026-11-27 |
| Python 3.14.10 and Node v26.13.1 | `./venv/bin/python -V` and `node -v` on this machine, 2026-11-27 (local tool versions; Node is not used by any extractor). The earlier attribution to `pip list` was wrong. |
| `tree-sitter` 0.27.0 was released November 23, 2026 | https://pypi.org/project/tree-sitter/0.27.0/ (fetched 2026-11-27; PyPI page, vendor data) |
| `tree-sitter-rust` 0.24.2 was released March 27, 2026 | https://pypi.org/project/tree-sitter-rust/0.24.2/ (fetched 2026-11-27; vendor data) |
| `tree-sitter-typescript` 0.23.2 | https://pypi.org/project/tree-sitter-typescript/0.23.2/ was fetched 2026-11-27 but did not render a release date; the version is confirmed only by `pip list` |
| Rendered baseline: 9 of 20 errors with no next step (45%) | `product-audit/cli-first-run.md` section 4, command in section 4 above, 2026-11-27 |
| Every count is a measurement at the stated commits | commands inline; scripts and outputs in `$Q` |

## What could not be determined

- Recall of -08 (b) and (c) and of -02: no ground-truth list. Missing: a second reader labelling all 30 direct `show*Message` sites and a random 100 Rust error strings. Recall of -24 was sampled (58%, 95% interval about 20% to 98%) with one miss in 40; a larger sample (200 or more) is needed to narrow it.
- Whether a data-table-driven sentence (`gatePrompt.ts`) is detectable by any static check. Missing: a data-flow tool over TypeScript; not attempted.
- Rust `format!` destinations (43% of ocx and 62% of grim positions). Missing: a built workspace and a call-graph tool (rust-analyzer or MIR).
- Whether the `#[error("{path}: {source}")]` shape hides other duplicates; it needs type resolution of the `#[source]` field.
- The 18 TypeScript failure sites that relay grim's own message depend on the rendered text of each grim error.
- Attribute values that are expressions (53 of 94 in `ocx-sh/website`) were not resolved; component props named `title` were not separated from HTML attributes.
- The release date of `tree-sitter-typescript` 0.23.2 (page did not render).
- No agent-authored sample was scored, so whether an extractor gate changes what an agent writes is untested.
