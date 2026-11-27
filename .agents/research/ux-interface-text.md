---
title: "UX-TEXT: interface text"
topic: ux-interface-text
program: product
sub_program: ux
date: 2026-11-27
revised: 2026-11-27
model: opus
id_family: UX-TEXT
consolidates:
  - ux-interface-text/error-message-anatomy.md
  - ux-interface-text/labels-and-wordlists.md
  - ux-interface-text/strings-that-survive.md
grounding:
  - product-audit/cli-first-run.md
  - product-audit/ui-code-posture.md
  - product-audit/exemplar-design-systems.md
  - product-audit/config-inventory.md
---

# UX-TEXT: interface text

The question this topic decides: what must runtime interface text contain, and which words and string constructions must an agent never ship? "Runtime interface text" means every string a running product shows a person: CLI stderr and stdout prose, VS Code notifications, command titles and setting descriptions, webview and web UI labels, status messages, alt text. Documentation prose is out (docs-quality owns it).

Paths are relative to this file unless absolute. Fleet paths are relative to `/home/mherwig/dev`. Figures marked *re-measured* were re-run for this consolidation on 2026-11-27, with the command beside them; all other figures come from the cited dive or audit, which carries its own command.

## Verdict

1. **The next step is the rule that matters most.** Measured, "what happened" is solved: 115 of 120 exemplar errors and 20 of 20 fleet errors say it. "What to do next" is the gap: 42 of 120 exemplar errors (35%) and 11 of 20 fleet errors give one, and one fleet next step names a command that does not exist. The ruleset therefore makes the next step (UX-TEXT-02) and its correctness (UX-TEXT-04) MUSTs, ahead of every style rule. One independent study points the same way, read from its abstract only (the full text was not read): developers "will accept a deficient argument structure if it provides a resolution to the problem" ([Barik et al., ESEC/FSE, November 2018](https://www.microsoft.com/en-us/research/publication/how-should-compilers-explain-problems-to-developers/), abstract fetched 2026-11-27). The method and effect size were not checked, so the ranking rests on the measurement above, not on this study.
2. **A suggested fix is code and gets a test.** Every command, flag or setting that a message tells the user to use must parse in the product's own CLI. This is the single cheapest high-yield check in the topic. The fleet fails it today: `ocx install` is suggested twice and a unit test pins the wrong text.
3. **Never ship "Something went wrong".** The error dive allowed it as the first clause of an unknown-cause fallback, as Polaris does. The word-list dive banned it. Decision: ban it. The code at the call site always knows which operation failed, so the fallback is "<operation> did not complete" plus one recovery action. A zero-tolerance grep beats a grep that needs a human to read every hit.
4. **Interface text is composed, never relayed.** A log record (timestamp, level, module path, raw OS or parser error) is not a message, and `err.message` is not a toast. The message is written at the boundary and the raw cause goes to the log or Output channel. The extension already does this split (`notify.ts:112-124`). The grim CLI does not (a timestamped `WARN` line is the user message).
5. **Deny-lists survive only as anchored or zero-hit patterns.** Measured precision: bare `here` 0%, bare `invalid` 36%, `click` 67%. So `here` is banned only as link or button text, and `invalid` is not banned at all: it must be followed by the expected form. The zero-hit tells take the severity their source gives, not the severity a zero count makes cheap. Emoji in UI content and humorous interjections in errors are MUST (Primer and VS Code say "do not"). `please`, apologies and a trailing `!` are SHOULD (the sources say "usually", "in most cases" and "sparingly"). `successfully` is not banned: WCAG 4.1.3 uses "Your form was successfully submitted" as a good status message. That agents add these words is a hypothesis, not a measurement. The fleet repos carry agent configuration (`CLAUDE.md` and `.claude/` in all three), and their 4,510 strings still have zero hits.
6. **"please" is a SHOULD with owner-listed exceptions.** GOV.UK says "There's usually no need to say 'please'". Microsoft allows it for an inconvenient request or when the product is at fault. Neither source bans it, so a MUST would overclaim. An agent cannot judge "inconvenient", so the agent default is to leave it out. An exception is a voice decision for the owner.
7. **No reading-grade and no character budgets.** The O'Reilly piece behind the commission's plain-language premise sets no limit. Primer states a 7th-grade target with no method, and WCAG 3.1.5 is AAA and formula-free. Readability formulas misfire on the paths and identifiers that fill CLI text. Atlassian's word counts are undated vendor data, and the 200-character settings budget in the word-list dive was the researcher's own calibration. The rules use sentence counts instead, because a sentence count can be checked. Only one of them has a source: the GUI message body (UX-TEXT-13, Atlassian's 1 to 2 sentences, vendor data). The two-sentence threshold for a VS Code setting description (UX-TEXT-22) is this topic's own calibration. VS Code gives no number.
8. **Case and typography are decided by surface.** Web UI uses sentence case (Primer, GOV.UK). VS Code command titles use Title Case (VS Code contributor wiki). CLI output uses ASCII punctuation only, matching the existing CLI-12 rule for clap help. DOC-PLAIN-01 stays scoped to documentation prose; applying it to runtime strings would raise about 181 findings in `ocx` for a rationale (machine translation of docs) that does not apply.
9. **Plurals: `(s)` is a MUST ban now; whole-sentence plural selection is a SHOULD until the owner puts translation on the roadmap.** `(s)` is wrong output in English today. A noun-swap ternary is correct English and only a translation hazard. The fleet is English-only, so forcing the full plural machinery now would be cost without a user.
10. **Label-in-name belongs to UX-A11Y.** UXA-NAME-02 already owns it. This topic records one cross-topic conflict for that owner: WCAG 2.5.3 requires the accessible name to *contain* the visible label; *starting* with it is best practice. UXA-NAME-02 says "must start". This topic recommends MUST contains, SHOULD start.
11. **Territory handed off.** Error placement and input retention go to UX-STATE `form-state-machine`. Did-you-mean presence and candidate count go to UX-CLI `discoverability-recovery` (DISC-5 to DISC-11). Rust `Display` wording goes to ERR-05 and ERR-06. Colour decisions go to CLI-07. Machine-readable errors go to UX-AGENT. This topic keeps the words and the rendered shape.

## The ruleset

Severity: MUST, SHOULD, CONSIDER. "UI string paths" means the source files whose literals reach a user: CLI `Display`/`#[error]` text and `eprintln!`/`println!` calls, VS Code `show*Message` and `package.json` `contributes`, webview and Astro text nodes and `alt`/`title`/`aria-label`/`placeholder` attributes. Tests, panics and comments are excluded. No extractor separates them perfectly yet (see Open questions), so every grep below lists candidates and the stated precision says how many need a human read.

### A. Errors and warnings

**UX-TEXT-01 (MUST).** Every error message states what failed, in terms of the user's action, and quotes the offending input (path, name, value, flag) whenever one exists.
- Why: what plus the input is the minimum that lets the user find the problem. 75 of 84 applicable exemplar samples and 17 of 20 fleet errors do it. The misses (`No target files found.`, ocx row 10 `network operation attempted in offline mode`) are the ones a user cannot act on.
- Verify: per error path, a test passes an invalid input X and asserts that the rendered stderr, dialog or toast contains X. Reading heuristic: could someone who saw only this message name the file or flag at fault?

**UX-TEXT-02 (MUST).** Every error carries a next step that is an action available in the product: a command, a flag, a setting, an environment variable or a button. When no action exists, the message says so and says what the product did. "Contact support" with no contact, and "try again" when nothing will change, do not count.
- Why: the next step is absent in 49% of 120 exemplar errors and 9 of 20 fleet errors. Spectrum and Atlassian require it, and WCAG 3.3.3 (AA, page updated 2026-03-09) requires known corrections.
- Verify: in CLI snapshots, the last non-blank line of a failing command matches `^help: `, or a `note:` line states that no action exists and what the product did. This check is mechanical. GUI sites have no mechanical check: a reviewer reads each `show(Error|Warning)Message` site and confirms that the string or an action button names a command, flag, setting, environment variable or button, or states that none exists. No verb list is used, because a fixed list fails correct next steps (`create`, `add`, `check`, `rename`).

**UX-TEXT-03 (MUST).** State a cause only when the code checked it. When one signal admits several causes, name every cause it admits. When the cause is unknown, name the operation that did not complete and give one recovery action. Never ship `Something went wrong`, `An error occurred`, `Unknown error`, a bare `Error` or `Failed`, or raw exception text as the message.
- Why: Atlassian says never invent a cause; NN/g and Apple HIG name the generic message as the failure pattern. Measured fleet defect: a registry 401 for a repository that does not exist is reported as `registry authentication failed` (`grimoire/src/oci/access/error.rs:75`, audit row 19), which sends the user to `grim login` instead of to the name they mistyped.
- Verify: `git grep -nIiE "(something went wrong|an error occurred|unknown error)" -- <ui-string-paths>` returns nothing (0 hits measured across 4,510 fleet strings, so precision is undefined and the cost is zero). For each `because`, `due to` or `caused by` in an error literal, point at the condition in code that established it. Lint candidate for TypeScript: `show(Error|Warning)Message\([^)]*\b(e|err|error)\.message` is a finding unless the message is composed around it.

**UX-TEXT-04 (MUST).** Every command, subcommand, flag, setting key or file that a message suggests must exist. Test it with the product's own parser.
- Why: a copy-pasted fix that fails is worse than no fix. Measured fleet defect, below in Applied.
- Verify (adapt the binary name): `` rg -o 'run `([^`]+)`' crates src --replace '$1' -I | sed -E 's/[ ]*[{<].*$//' | sort -u | while read c; do ./target/debug/<cli> ${c#<cli> } --help >/dev/null 2>&1 || echo "MISSING: $c"; done `` prints nothing. The `sed` cuts each suggestion at its first placeholder. This script covers only commands and subcommands written as ``run `...` ``. It does not cover suggestions phrased as ``use `...` `` or ``pass `...` ``, flags, setting keys, environment variables or files. For those, the error's own unit test asserts the suggested name: a flag appears in `<cli> <subcommand> --help` output, a setting key exists in the config schema or `package.json` `contributes.configuration`, and a file path is created or documented by the product. Also grep tests for the same backticked command: a test asserting a nonexistent command is a finding, not a constraint.

**UX-TEXT-05 (MUST).** A CLI's rendered diagnostic has one shape per binary. The first line is a self-contained `error: <what failed>[: <input>]`. Context lines start with `note:`. The next step is the last line and starts with `help:`. One prefix convention per binary: never `error:` from the parser and a bare path-led line from the runtime.
- Why: the rustc dev guide and GNU fix summary-first wording, and clig.dev puts the key line last. The self-contained first line plus a `help:` last line satisfies both. Measured: grim mixes clap's `error:` with path-led runtime errors (`grimoire/src/config/config_error.rs:148`, `grimoire/src/skill/skill_error.rs:62`). The wording of each Rust `Display` string (lowercase, unpunctuated, no `error:` opener) is ERR-05; this rule governs the rendered output.
- Verify: snapshot tests over a corpus of bad invocations, `<cli> <bad args> 2>&1`: line 1 matches `^error: `, line 1 does not match `\.$`, and when the error has a next step the last non-blank line matches `^help: `. Require 100% on new errors. Gate the existing set as a ratchet.

**UX-TEXT-06 (SHOULD).** State a suggestion as a statement (``help: run `x` ``, clap's `tip: a similar subcommand exists: 'add'`). Write "Did you mean ...?" only when a prompt follows and will act on the answer.
- Why: the rustc dev guide says not to phrase suggestions as questions. A question with no prompt asks the user to answer a program that is no longer listening. DISC-11 already requires candidates stated as names.
- Verify: `git grep -nIi "did you mean" -- <ui-string-paths>`; each hit is followed in code by a prompt call. 0 hits in ocx and grim today (clap's `tip:` wording).

**UX-TEXT-07 (MUST).** Interface text is never a log record. At default verbosity, a user-facing message carries no timestamp, logger level tag, module path, source location, retry counter, raw OS or runtime parse error (`strconv.ParseInt: ...`), stack trace or full child-process command line. Those go to the log, the Output channel or `--verbose`, composed separately from the message.
- Why: clig.dev says not to treat stderr as a log file. Measured: kubectl prints five klog lines before its one human sentence, and grim prints a timestamped tracing `WARN` line as its user-facing notice (`grimoire/src/install/installer.rs:800`). The TypeScript half of the split (log the chain to a diagnostic channel) is TS-ERR-05; the ANSI half is CLI-07.
- Verify: `<failing command> 2>&1 | grep -E '^[A-Z][0-9]{4} |[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]+|\b(TRACE|DEBUG|INFO|WARN|ERROR)\b +[a-z_:]+|\b[a-z_]+\.(go|rs|ts|js):[0-9]+'` returns nothing, run over every failing-path fixture. `<failing command> 2>&1 | grep -E '(strconv\.|std::|Traceback|NullPointer|    at .*\.(js|ts):[0-9]+)'` returns nothing.

**UX-TEXT-08 (MUST).** One event, one message. Never print the same cause twice in one run. Never print a warning that the same run then repeats as an error. Raise one toast per failure, and none on a user-cancelled action.
- Why: the rustc guide says to avoid multiple messages for the same error. Measured: deno prints the same "Module not found" text as a warning and as an error, and ocx prints a path twice (`ocx_project/src/error.rs:645`, audit row 11). Chain duplication inside Rust is ERR-06.
- Verify: the gate is a snapshot assertion per failing-path fixture. The snapshot records the exact rendered output, and the reviewer who accepts it confirms that each cause appears once. Two greps list candidates for that review. They are not pass/fail checks, because a repeated `note:` or `help:` line or a shared heading can be correct. Across lines: `<failing command> 2>&1 | sed -E 's/^[A-Za-z]+:? *//' | awk 'length>=30' | sort | uniq -d`, which catches deno's warning-then-error repeat. Within one line: `<failing command> 2>&1 | grep -E "(/[^ :'\`]{4,}).*\1"`, which catches ocx row 11, a path printed twice in one line. Both were tested on those two fixtures on 2026-11-27. In the extension, each `showErrorMessage` and `showWarningMessage` site has one adjacent `appendLine` or log call and a guard for the cancellation path.

**UX-TEXT-09 (SHOULD).** Do not print a success-shaped progress line (`Removing x from dependencies`, `Created deno.json`) before an operation whose validation then fails. Validate first, then report progress.
- Why: a success line followed by an error misreports the outcome. Measured in cargo and deno. The fleet was not measured.
- Verify: for each failing-path test, assert that no line before the first `error:` line contains a past-tense or progressive success verb (`Created|Removed|Removing|Installed|Installing|Added|Adding`).

**UX-TEXT-10 (MUST).** Emit a warning only when a condition may cause a later problem and the user can act on it or silence it. A warning names the action or the opt-out (flag, config key, lint level). A deprecation warning names the replacement and the version of removal. An informational fact is not labelled as a warning and does not print at default verbosity. A security-relevant notice is a labelled `warning:`, never an unlabelled info line.
- Why: Atlassian's definition of a warning and the rustc guide's "warning fatigue". Measured: `gh config set nosuch x` warns with no action. ocx prints `no trust policy covers ...; installing ... without signature verification` with no level label on every unsigned install, because the source uses `log::info!` (`ocx_package_manager/src/tasks/auto_verify.rs:430-431`). The audit ranks this as training users to ignore the one security-relevant line. The fleet's model deprecation is audit row 10: `warning: ocx package info is renamed to ocx package description pull and is removed in 0.7`.
- Verify: each `warn!`/`warning:`/`showWarningMessage` string contains a verb phrase, flag name or config key. `git grep -nIiE 'deprecat|is renamed' -- <ui-string-paths>` hits each contain `use|renamed to|replaced by` and a version. `git grep -nE 'log::info!|info!\(' -- <crates>` hits that reach stderr at default verbosity are read.

**UX-TEXT-11 (SHOULD).** Validate flags, arguments and syntax before contacting the network or a cluster, so that a user's mistake is reported instead of the environment error that would mask it.
- Why: clig.dev says to validate input early. Measured: kubectl masks `get nosuchres`, `--output=nosuch` and `delete pod` behind a connection error in 3 of 20 samples.
- Verify: a test with no network and a malformed argument asserts that the output names the argument, not the connection.

**UX-TEXT-12 (MUST).** Never invent an error code. A diagnostic code exists only together with its explain entry (`--explain <CODE>` or a docs page), and both ship in the same change. Mint a code only when the full explanation would not fit in the message, and only with the owner's approval. Exit codes are not a second code.
- Why: the rustc threshold ("when the explanation would give more information than the error itself") and Google's "document all codes". A code with no page is a dead end. ocx and grim have sysexits-style exit codes and no diagnostic codes today. In CLI text the code sits in the header (`error[E0382]:`, greppable). In GUI text it goes last (Spectrum).
- Verify: `comm -3 <(git grep -ohE '\bE[0-9]{4}\b' -- crates src | sort -u) <(ls docs/errors | sed 's/\.md$//' | sort -u)` prints nothing, and `<cli> --explain <CODE>` exits 0 for each code.

**UX-TEXT-13 (SHOULD).** In a GUI notification or dialog, the title or first clause names the situation (never "Error" alone), the body is at most two sentences, and longer detail goes behind `Show Output`, `Show details` or a docs link. A longer message is allowed only with a code comment that names the reason.
- Why: Apple HIG on alert titles. Atlassian (vendor, undated) gives 1 to 2 sentences for a body, and VS Code toasts truncate. The word counts Atlassian gives for titles and buttons are not adopted (Verdict 7). The extension's four-sentence anchor-escape message (`grimoire-rs/vscode/src/views/forceRetry.ts:120`) is the one fleet case and is a security message, so it qualifies for the commented exception.
- Verify: count sentences (`[.!?](\s|$)`) in the literal at each `show(Error|Warning|Information)Message` site and each toast. More than 2 requires an adjacent comment.

### B. Labels and words

**UX-TEXT-14 (SHOULD).** Write every button and action label as a verb plus its object, naming the result (`Install skill`, `Run grim lock`, `Show Output`). In a dialog that asks for a decision, never use `OK`, `Yes`, `No`, `Submit` or `Done` as the choices. Always offer `Cancel` where the action can be cancelled. `OK` is allowed only on a purely informational alert.
- Why: Primer and GOV.UK give the verb-first shape, and Apple HIG bans `OK` as the default for non-informational alerts. A bare `No` tells the user nothing about what they are declining.
- Verify: `git grep -nE "show(Warning|Error|Information)Message\([^)]*['\"](OK|Ok|Yes|No|Submit|Done)['\"]" -- 'src/*.ts'` and `git grep -nE ">(OK|Ok|Yes|No|Submit|Done)<" -- <ui-string-paths>` return nothing outside informational alerts.

**UX-TEXT-15 (SHOULD).** Pick case by surface. Web UI labels, buttons, field names and headings use sentence case with no end punctuation. VS Code `contributes.commands[].title` uses Title Case, with prepositions of four letters or fewer lowercase unless first or last. VS Code view titles and headings use sentence case with no trailing period.
- Why: Primer and GOV.UK for the web. The VS Code rule is a platform fact from the [VS Code Coding Guidelines wiki](https://github.com/microsoft/vscode/wiki/Coding-Guidelines) (undated, fetched 2026-11-27); the extension API pages say nothing on case. Re-check: open the wiki page and search "title case".
- Verify: `python3 -c "import json;[print(c['title']) for c in json.load(open('package.json'))['contributes']['commands']]"` and check that every word longer than four letters starts uppercase. For the web, read each label: only the first word and proper nouns are capitalised.

**UX-TEXT-16 (SHOULD).** Do not use `here`, `click here`, or a bare `Learn more`, `Read more` or `More` as the visible text of a link or button. Label every link so it makes sense out of context: front-load the destination's keywords (`Read the install guide`).
- Why: [Primer](https://primer.style/product/getting-started/foundations/content/) (undated): "Never say 'here' or 'click here'". [NN/g](https://www.nngroup.com/articles/learn-more-links/) (2015-12-13) on standalone "Learn more". [WCAG 2.4.4](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html) Link Purpose (Level A, page updated 2026-10-04) accepts surrounding context, so a bare "Learn more" can pass the standard. This rule is stricter than the standard because an agent cannot verify the context. The rule is a SHOULD because nothing shows that it changes what an agent writes. The fleet has 0 hits, and no agent-output sample was measured. DOC-PLAIN-15 governs link syntax only, so no catalog rule covers link wording today. This rule owns `click here`. UX-TEXT-17 no longer lists it.
- Verify: `git grep -nIiE ">(here|click here|learn more|read more|more)</(a|button)>|\[(here|click here|learn more|read more)\]\(" -- <ui-string-paths>` returns nothing. Measured: 0 hits, 0 false positives.

**UX-TEXT-17 (MUST for emoji and humorous interjections; SHOULD for `please`, apologies and a trailing `!`).** This rule covers product strings: UI, CLI, notifications, command titles and error text. A surface the owner designates as marketing or community is exempt.
- MUST: never write an emoji in a product string. Codicon references such as `$(refresh)` are icons, not emoji, and are allowed. Never write `oops`, `whoops`, `uh-oh` or `yikes` in a product string.
- SHOULD: leave out `please`, `sorry` and `apologise`/`apologize`, unless the owner has listed the case as an exception (Verdict 6). Do not end a string with an exclamation mark.
- Not in this rule: `successfully` is allowed, because WCAG 4.1.3 uses "Your form was successfully submitted" as a good example. `click here` belongs to UX-TEXT-16. The generic error phrases belong to UX-TEXT-03.
- Why, MUST part: [Primer](https://primer.style/product/getting-started/foundations/content/) (undated) says "Do not use emoji in UI content, or to replace words" and, for errors, "Do not try to be funny or humorous". [VS Code command palette](https://code.visualstudio.com/api/ux-guidelines/command-palette) (undated, fetched 2026-11-27) says not to "Use emojis in command names".
- Why, SHOULD part: the sources are hedged. Primer says "In most cases, exclamation marks are not appropriate" and "In most cases, apologizing won't fix the problem". [Microsoft](https://learn.microsoft.com/en-us/style-guide/punctuation/exclamation-points) (ms.date 2018-01-19) says "Use exclamation points sparingly". [GOV.UK A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/) says "There's usually no need to say 'please'".
- Measured: 0 hits for every listed term in 2,431 extension, theme, `ocx` and hook strings plus 2,079 grim CLI strings (`labels-and-wordlists.md` section 9). That agents add these words is not measured, and the fleet repos carry agent configuration. The rule is a cheap guard, not a fix for an observed defect.
- Verify, MUST part: `git grep -nP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" -- <ui-string-paths>` and `git grep -nIPi "\b(oops|whoops|uh-oh|yikes)\b" -- <ui-string-paths>` return nothing outside tests and comments.
- Verify, SHOULD part: `git grep -nIPi "\b(please|sorry|apologi[sz]e)\b" -- <ui-string-paths>` and `` git grep -nP "\w!['\"\`]" -- <ui-string-paths> `` hits are each read, and each kept hit names its owner exception.

**UX-TEXT-18 (SHOULD).** Wherever a message says `invalid`, state the expected form in the same message (`invalid mode 'x' (expected 'env', 'bin' or 'none')`). In a GUI field error, do not use the word: say what to enter.
- Why: GOV.UK and Polaris ban "invalid" in field errors; the rustc guide prefers it to "illegal" in compiler diagnostics. A ban would be wrong for the CLI and imprecise (raw `invalid` grep precision 36%). What every source agrees on is "be specific".
- Verify: `git grep -nIE '"[^"]*\binvalid\b[^"]*"' -- <ui-string-paths> | grep -vE 'expected|must|allowed|one of|valid values|\{|: '`. Measured precision 60% (6 of 10 in `ocx`; 9 static candidates in grim, not traced), so a human reads each hit.

**UX-TEXT-19 (SHOULD).** Replace `click` with `select`, `choose`, `press` or `open`. Replace `e.g.`, `i.e.` and `etc.` with `for example`, `that is` or a complete list. Write `and`, not `&`.
- Why: GOV.UK A to Z: not every user clicks, and screen readers can read "eg" as "egg".
- Scope: this rule covers runtime strings only. No DOC-PLAIN rule covers `e.g.` in documentation (`grep -nE 'e\.g\.' skills/docs-quality-reference/plain-english.md` matches no rule row), so this rule and docs-quality do not overlap.
- Verify: `git grep -nIiE '\bclick(s|ing)?\b|\b(e\.g\.|i\.e\.|etc\.)|[a-z] & [a-z]' -- <ui-string-paths>`. Measured precision: `click` 67% (read each hit; "one-click" as a noun is arguable), `e.g.`/`i.e.`/`etc.` 100% (10 of 10), `&` 100% (1 of 1).

**UX-TEXT-20 (MUST).** Give every `<img>` an `alt` attribute and never omit it. Use `alt=""` for a decorative image or one that repeats adjacent text, a short statement of meaning for an informative image, and the destination or action for an image inside a link or button. Put a complex image's content in the page text. Never start alt text with "image of" or "picture of". A brand mark that serves as a heading or link takes the brand name.
- Why: the [W3C alt decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/) (updated 2024-05-13). An `<img>` with no `alt` makes some screen readers read the file name. Re-check: the decision-tree page date.
- Verify: `python3 -I -c "import re,sys;[print(f) for f in sys.argv[1:] if re.search(r'<img\b(?![^>]*\balt=)[^>]*>', open(f).read(), re.S)]" <files>` prints nothing (multi-line tags need `re.S`). `git grep -nE '!\[\]\(' -- '*.md' '*.mdx'` lists empty Markdown alt, and each hit needs a decorative judgement.

**UX-TEXT-21 (MUST).** Every UI label quoted in a manifest description, README or docs page (`**Bold**` names, `Grimoire: X` palette entries) equals a shipped command title, setting key or UI source string. Fix the quoting text, not the shipped name, unless the owner approves a rename.
- Why: a stale label sends the reader to a control that does not exist. Measured fleet drift below.
- Verify: a script collects quoted tokens from `package.json` `description`/`markdownDescription`, `README.md` and `docs/*.md`, and asserts each is in the set of command titles, setting keys and string literals under `src/`. Measured: 1 failing token of 12 in the extension.

**UX-TEXT-22 (SHOULD).** Keep a VS Code setting description short, and link to documentation for the long form. Write a boolean setting's description as the statement the checkbox turns on. Never put "Extension", "Configuration" or "Settings" in a configuration category `title`.
- Why: platform facts from [VS Code UX guidelines, settings](https://code.visualstudio.com/api/ux-guidelines/settings) ("Don't create long descriptions" and "Link to documentation for complicated settings", with no number) and [contribution points](https://code.visualstudio.com/api/references/contribution-points) (a boolean description renders as the checkbox label; the category title restriction). Both pages are undated and were fetched 2026-11-27. Re-check: those two pages.
- Calibration: VS Code sets no length. This topic uses "more than two sentences" as the point at which a description counts as long. That number is this topic's calibration, not a platform fact. It matches 6 of the 7 fleet descriptions, which have 1 to 3 sentences. No character budget is set (Verdict 7).
- Verify: `python3 -c "import json,re;p=json.load(open('package.json'))['contributes']['configuration']['properties'];[print(k) for k,v in p.items() if (d:=v.get('markdownDescription') or v.get('description') or '') and len(re.findall(r'[.!?](\s|$)', d))>2 and not re.search(r'\]\(|https?://', d)]"` prints the descriptions longer than the calibration that carry no docs link. Each one printed is shortened or given a link. The sourced part of the check is the link. The sentence count only selects which descriptions to read.

**UX-TEXT-23 (SHOULD).** CLI output strings use ASCII punctuation only: no em or en dash, no curly quotes, no Unicode ellipsis. Use a colon, a hyphen or a new sentence. Gate changed lines only. DOC-PLAIN-01 does not apply to runtime strings.
- Why: a legacy or non-UTF-8 console renders these as mojibake, and CLI-12 already requires ASCII for clap help, so the help text and the runtime text should follow one rule. GUI strings may use typographic quotes and `…`, keeping one convention per surface.
- Precedence: UX-TEXT-05 overrides this rule for the next step. The `ocx_console` pattern ``{text} — run `{command}` `` (`ocx-sh/ocx/crates/ocx_console/src/user_interface.rs:87`) is not fixed by swapping the em dash for a hyphen or a colon. Its fix is a separate last line, ``help: run `{command}` ``, as UX-TEXT-05 requires. The punctuation fix in this rule applies only to text that UX-TEXT-05 does not restructure.
- Verify: `git diff -U0 origin/main -- 'crates/**/*.rs' 'src/**/*.rs' | grep '^+' | grep -P '"[^"]*[\x{2013}\x{2014}\x{2018}\x{2019}\x{201C}\x{201D}\x{2026}][^"]*"'` returns nothing.

### C. Strings that survive

**UX-TEXT-24 (SHOULD; MUST once the owner adopts translation).** Build every user-visible sentence as one string or one template literal with named placeholders. Do not assemble a sentence from concatenated fragments, a spliced suffix or a separately chosen noun.
- Why: [ICU](https://unicode-org.github.io/icu/userguide/format_parse/messages/), [W3C](https://www.w3.org/International/articles/composite-messages/) and [Microsoft Learn](https://learn.microsoft.com/en-us/globalization/internationalization/concatenation) (2024-03-26) agree that a translator cannot reorder, pluralise or punctuate fragments. That rationale is a translation one. The fleet is English-only, so this rule takes the same severity as UX-TEXT-26 (Verdict 9). In English, whole strings are still easier to grep, test and read alone.
- Verify: there is no complete mechanical check. `` git grep -nP "\+\s*['\"\`]\s*(and|of|in|items?|results?)\b" -- 'src/*.ts' `` catches only `+` concatenation that is followed by one of those five words. It misses template-literal splices, such as the fleet case at `render.ts:722`, and every other word. Everything else is found by review: delete the placeholders, and the sentence fails if its remaining words are not in one literal.

**UX-TEXT-25 (MUST).** Never write `(s)` (or `(es)`, `(ies)`) in a user-visible string.
- Why: `1 file(s)` is wrong output in English today, not only a translation hazard. CLDR and gettext show suffixing fails in other languages too.
- Verify: `git grep -nE '"[^"]*[A-Za-z]\((s|es|ies)\)[^"]*"' -- '*.rs' '*.ts' ':!*test*'` returns no user-facing hit. Read each hit: `http(s)://` is a false positive.

**UX-TEXT-26 (SHOULD; MUST once the owner adopts translation).** Choose a whole sentence per plural category: `Intl.PluralRules` in TypeScript, one helper per crate in English-only Rust (`icu_plurals` once locale-aware). Give zero its own sentence (`No updates available`). Select the category on the value as displayed, so a value formatted as `1.0` selects `other`.
- Why: CLDR defines six categories and English uses two; English never returns `zero`, so zero needs an explicit branch. Measured on Node v26.13.1: `new Intl.PluralRules("en",{minimumFractionDigits:1}).select(1)` is `other`. A noun-swap ternary gives correct English, which is why this is a SHOULD while the fleet is English-only.
- Verify: `` git grep -nP "===?\s*1\s*\?\s*['\"\`][A-Za-z ]*['\"\`]\s*:\s*['\"\`][A-Za-z ]*['\"\`]" -- 'src/*.ts' ':!*test*' `` and, in Rust, `(==|!=) 1 \{ "[A-Za-z ]*" \} else \{ "[A-Za-z ]*" \}` outside the helper module return nothing. A unit test calls the helper with `0`, `1`, `2` and the display-formatted `1.0`.

**UX-TEXT-27 (SHOULD).** Format each value type with the platform formatter, never by hand. TypeScript: `Intl.NumberFormat` (numbers, compact, units), `Intl.DateTimeFormat` (absolute dates), `Intl.RelativeTimeFormat` (ago and in), `Intl.ListFormat` (and and or lists), `Intl.DurationFormat` behind a feature detect. Rust: route sizes, times and counts through one helper module per workspace (the `ocx_console/src/human.rs` pattern), and switch to `icu_*` when a string must be locale-aware. Never use `Intl.MessageFormat`: it is a TC39 Stage 1 proposal, not an API.
- Why: the `Intl` objects handle grouping, locale and agreement, and all but `DurationFormat` are Baseline "Widely available" per MDN (`DurationFormat` is Baseline 2025, newly available since March 2025). `bytesize` 2.7.0 and `humantime` 2.4.0 document no localisation. Platform facts re-checkable on the MDN pages (Baseline box) and the [TC39 proposal](https://github.com/tc39/proposal-intl-messageformat) README (stage line).
- Verify: `git grep -nE "toFixed\(|\b(min|h|d) ago\b|\.join\(', '\)\s*\+|toISOString\(\)\.slice|Intl\.MessageFormat" -- 'src/*.ts' ':!*.test.ts'` returns no user-facing hit. In Rust, `git grep -nE 'format!\(.*(1024|/ 60|/ 3600)' -- '*.rs' ':!*test*'` hits sit only inside the helper module.

**UX-TEXT-28 (MUST).** Label a byte size by the base the code divides by: 1024 is `KiB`/`MiB`/`GiB`, 1000 is `kB`/`MB`/`GB`. Follow the surface's existing convention, and ask when it has none.
- Why: a 1024-based value labelled `KB` is a wrong number by 2.4% at kilo and 7.4% at giga. `Intl.NumberFormat` with `unit: "kilobyte"` is SI and has no binary unit (measured on Node v26.13.1: `1,536 kB`); `bytesize` exposes `iec()` and `si()` explicitly.
- Verify: `git grep -nE "/ ?1024.*\b(KB|MB|GB)\b" -- src crates` returns nothing.

**UX-TEXT-29 (SHOULD).** Never hard-code a locale tag in UI formatting. Pass the host's language (`vscode.env.language` in an extension) or `undefined`, from one `locale` constant.
- Why: `new Intl.NumberFormat('en-US')` pins US grouping and date order for every user, even in an English-only product (MDN shows `en-US`, `en-GB` and `ko-KR` producing three date orders).
- Verify: `git grep -nE "['\"]en-US['\"]" -- 'src/*.ts' ':!*test*'` hits only the single constant.

**UX-TEXT-30 (MUST).** A status or notification string names its subject and its outcome, and makes sense with no surrounding UI. Never ship `Done`, `Saved`, `Success`, `OK` or `Copied <identifier>` where the kind of thing copied or saved is unclear.
- Why: a toast, a screen-reader announcement, a log line and a later reading all deliver the string alone. WCAG 4.1.3 (AA, page updated 2026-10-04) gives the shape: "5 results returned". The announcement mechanism is UX-A11Y's; the words are this rule's.
- Verify: `` git grep -nE "(showInformationMessage|showWarningMessage|setStatus|set_status|println!)\(\s*['\"\`]?(Done|Saved|Success|Error|OK|Failed|Copied)\.?['\"\`]?\s*[,)]" -- src crates `` returns nothing. Alone test on every other status string: paste it into a blank page; the reader can say what happened and to what.

Dropped from the dive candidates, with the reason: EM-9 field placement and EM-10 input retention (owned by UX-STATE `form-state-machine`, FORM rules); SS-9 and SS-10 label-in-name (owned by UX-A11Y UXA-NAME-02, conflict recorded in Verdict 10); SS-13 topic-comment restructuring, SS-14 MessageFormat 2 catalogues and SS-15 ICU apostrophe escaping (no catalogue exists; they wait on the localisation decision); UXT-LBL-13 "logo" in alt text (folded into UX-TEXT-20, and a WCAG non-failure); EM-20 security-sensitive generic messages (an owner decision, listed below); UXT-LBL-15's 200-character budget (the dive's own calibration, not a source).

## Applied to the fleet

"Re-measured" commands were run from `/home/mherwig/dev` on 2026-11-27 against `grimoire-rs/vscode` 9230dcd (2026-11-24), `ocx-sh/ocx` 02b8434e (2026-11-26) and `grimoire-rs/grimoire` 72d3fce1 (2026-11-24).

### Already satisfied

| Rule | Evidence |
|---|---|
| UX-TEXT-01, -02 | Exemplar fleet errors carry all four parts: `ocx_cli/src/app/project_context.rs:35` (`no ocx.toml found in /tmp/cx or any parent; run ocx init to create one`), `ocx_index/src/error.rs:255`, `ocx_cli/src/build_receipt.rs:143` (audit `cli-first-run.md` rows 2, 3, 9). grim-gui `Install grim or set GRIM_BIN to an absolute path.` (`grim-gui/src/view.ts:26`). |
| UX-TEXT-06 | clap's `tip: some similar subcommands exist: ...` in nested ocx and all grim commands (audit section 3). |
| UX-TEXT-07, -08 (extension) | `notify.ts:112-124` logs the raw message with `output.appendLine` and composes the toast separately; `notifyError(..., { dedupe: true })` suppresses bursts. |
| UX-TEXT-10 (deprecation half) | `warning: ocx package info is renamed to ocx package description pull and is removed in 0.7` (audit row 10). |
| UX-TEXT-15 | *Re-measured* `grep -n '"title"' grimoire-rs/vscode/package.json`: all 22 command titles (`package.json:78` `Search` to `:197` `Collapse All`, including `:89` `Check for Updates` with a lowercase preposition) are Title Case. `Install grim` (`:106`) keeps the CLI name lowercase as a proper noun. Theme strings are sentence case: `ocx-sh/website/packages/theme/src/components/DependencyExplorer.astro:105-106` `Search dependencies…`, `:112` `Loading dependency data…`, `ui/DataTable.astro:86` `Filter rows…`. |
| UX-TEXT-16, -17 | 0 hits for every listed term and for link-text `here`/`learn more` across 4,510 fleet strings (`labels-and-wordlists.md` section 9, the table rows for `please` to `^(OK\|Ok)$` and the grim CLI zero-hit row). |
| UX-TEXT-20 (sites) | All 3 theme `<img>` carry `alt`; 0 images without `alt` in the built ocx.sh and Grimoire dists (`ui-code-posture.md` sections 2 and 3). |
| UX-TEXT-27, -28 (ocx) | *Re-measured* `grep -nE 'pub fn human_\|HumanBytes\|just now\|in 3 hours' ocx-sh/ocx/crates/ocx_console/src/human.rs`: `human_bytes` at `:7` (doc comment `:6`, "binary units (e.g. `4.21 MiB`)"), `human_time` at `:18`, `human_instant` at `:42`. Tests pin `3 hours ago` (`:58`), `in 3 hours` (`:59`) and `just now` (`:66`). Binary units are confirmed in the dependency: `human_bytes` calls `indicatif::HumanBytes` (`:9`), which formats with `NumberPrefix::binary` (indicatif 0.18.6 per `ocx-sh/ocx/Cargo.lock:3283-3284`, `src/format.rs:143` in the cargo registry copy). |
| UX-TEXT-30 (mostly) | 11 of 13 extension post-action notifications name subject and outcome (`Created grimoire.toml`, `grim installed at ${target}`); 0 bare `Done`/`Saved`/`Success`. |

### Violated

| Rule | Evidence |
|---|---|
| UX-TEXT-04 | *Re-measured* `grep -n "ocx install" ocx-sh/ocx/crates/ocx_package_manager/src/error.rs`: line 357 ``run `ocx install {}` ``, line 362 ``run `ocx install {}` online to populate it``, and line 614 a test asserting ``text.contains("`ocx install example.com/cmake")``. `ocx install` is not a command: it falls into the plugin dispatcher (`ocx_cli/src/app/plugin_dispatch.rs:92`, audit rows 1 and 4). The test pins the defect, so an agent told "keep tests green" will preserve it. The correct suggestion is `ocx package install`. |
| UX-TEXT-02 | 9 of 20 fleet errors have no next step (audit rows 5, 6, 8, 10, 11, 16, 17, 18, 19), for example `grimoire/src/config/config_error.rs:148` (`no grimoire.toml found by walking up ...`, no `grim init` hint, unlike ocx row 2). grim-gui `grim failed (exit ${code ?? "unknown"})` (`grim-gui/src/view.ts:30`) has none. |
| UX-TEXT-03 | `grimoire/src/oci/access/error.rs:75`: a 401 from a repository that does not exist is reported as `registry authentication failed` (audit row 19). The signal admits two causes and the message names one. |
| UX-TEXT-05 | grim mixes clap `error:` with path-led runtime errors (`config_error.rs:148`, `skill/skill_error.rs:62`); audit section 4 "Format differences". |
| UX-TEXT-07 | grim's no-client notice is a timestamped tracing `WARN` line (`grimoire/src/install/installer.rs:800`), with ANSI on a pipe because the subscriber is built without `with_ansi` (`grimoire/src/main.rs:458-462`; *re-measured* `grep -n with_ansi grimoire-rs/grimoire/src/main.rs` prints nothing). The ANSI half also violates CLI-07. |
| UX-TEXT-08 | `ocx_project/src/error.rs:645` prints the path twice: `/tmp/cx4/ocx.toml: ocx.toml already exists at '/tmp/cx4/ocx.toml'` (audit row 11). |
| UX-TEXT-10 | `ocx_package_manager/src/tasks/auto_verify.rs:430-431`: the unsigned-install notice is `log::info!`, unlabelled, at default verbosity, on every install. |
| UX-TEXT-14 | *Re-measured* `sed -n 92p grimoire-rs/vscode/src/views/hookPrompt.ts`: `showWarningMessage(message, yes, 'No')`, a decision dialog with a bare `No`. |
| UX-TEXT-18 | `invalid` with no expected form: 6 in `ocx` (`managed.rs:128`, `mirror.rs:126`, `patch.rs:75`, `error.rs:11`, `:327`, `:493`), 9 static candidates in grim (`catalog_error.rs:62` `invalid catalog file`, `config_error.rs:63` and `lock_error.rs:98` `invalid TOML`, others in the dive). |
| UX-TEXT-19 | `e.g.`: 7 in grim (for example `grimoire/src/config/config_error.rs:76`), 2 in `ocx` (`error.rs:473`, `:510`), 1 in the extension (`package.json:347`). `&`: `grimoire/src/tui/render.rs:1428` `Filter & sort`. `click`: `grimoire-rs/vscode/src/notify.ts:39` `Click to show Grimoire output`. |
| UX-TEXT-20 (READMEs) | *Re-measured* `head -4 ocx-sh/ocx/README.md grimoire-rs/grimoire/README.md`: line 3 of each is `<img src="./assets/logo.svg" width="192" />` and `<img src="./assets/logo.png" width="192" />`, with no `alt`. The README is also a marketing surface; the fix is the same attribute. |
| UX-TEXT-21 | *Re-measured* `grep -n "Check for Artifact Updates" grimoire-rs/vscode/package.json`: line 338 tells the user to run "Grimoire: Check for Artifact Updates"; the command is titled `Check for Updates` (line 89). |
| UX-TEXT-22 | *Re-measured* with the UX-TEXT-22 verify script, plus a length print, in `grimoire-rs/vscode`. `grimoire.checkArtifactUpdates` (`package.json:338`) is 708 characters and 5 sentences, with no docs link. `grimoire.path.executable` (`package.json:310`) is 193 characters and 3 sentences, with no link. The script flags it too, so it needs a read. The other five are 83 to 223 characters and 1 or 2 sentences. |
| UX-TEXT-23 | `ocx`: 35 runtime strings with an em dash, including the next-step separator ``{text} — run `{command}` `` (`ocx_console/src/user_interface.rs:87`, a `log::info!` line). Gate as a ratchet. That one site is fixed under UX-TEXT-05, as a `help:` line, and not by swapping the dash. |
| UX-TEXT-24 | `grimoire-rs/vscode/src/webview/render.ts:722` closes a sentence with a spliced noun and a spliced sync note. |
| UX-TEXT-25 | `ocx`: 18 `(s)` strings, for example `ocx_cli/src/api/data/index.rs:113` `{roots} root document(s)`. grim, *re-measured* with the dive's awk pattern over non-test `src/` and `crates/`: 4 true hits, namely `src/command/publish.rs:1230` `({} file(s))`, `src/install/install_error.rs:328` `settings value(s)`, `src/install/uninstall.rs:133` `settings value(s)` and `src/install/vendor_copilot.rs:629` `oauth field(s)`. There is 1 false positive, `src/tui/registry_form.rs:45` `http(s)`, so the dive's count of 5 is 4 true. |
| UX-TEXT-26 | Extension: 8 noun-swap ternaries plus 2 hand plurals, for example `src/webview/model.ts:1284`, `src/webview/render.ts:190`, `:217`. *Re-measured* with the dive's Rust pattern `(==\|!=) 1 [{] "[A-Za-z ]*" [}] else [{] "[A-Za-z ]*" [}]`, non-test code only. `ocx` has 8: `ocx_cli/src/api/data/package_cascade_repair.rs:225`, `self_setup.rs:362`, `status.rs:404`, `update.rs:398`, `upgrade.rs:98`, `ocx_cli/src/command/upgrade.rs:214`, `ocx_package/src/cascade/apply.rs:271` and `ocx_package/src/prune.rs:409`. grim has 15: `src/api/export_report.rs:210`, `src/command/status.rs:4263`, `uninstall.rs:583`, `update.rs:701`, `src/install/settings_phase.rs:449`, `:462`, `:2244`, `:2277`, `:2358`, `:2362`, `src/lock/edit.rs:295`, `src/resolve/graph.rs:3596`, `src/tui/app.rs:1365`, `src/tui/config_dialog.rs:384` and `src/tui/registry_form.rs:445`. SHOULD while English-only. |
| UX-TEXT-27 | Extension hand-rolls relative time (`src/webview/model.ts:2578-2593`) and size (`src/webview/render.ts:1865`, `toFixed(1)`). |
| UX-TEXT-28 | *Re-measured* `sed -n 1865p grimoire-rs/vscode/src/webview/render.ts`: `` `${(size / 1024).toFixed(1)} KB` ``. A 1024 base labelled `KB`. |
| UX-TEXT-29 | `'en-US'` hard-coded at `src/webview/model.ts:1241` and `src/webview/render.ts:1515`. |
| UX-TEXT-30 | `Copied ${message.repo}` at `src/views/details.ts:730` and `src/views/sidebar.ts:518`: copied the name, the link or the install command? |
| UX-TEXT-13 | `src/views/forceRetry.ts:120` is four sentences with no comment naming the reason. |
| Cross-topic (UX-A11Y UXA-NAME-02) | The vote button's visible text is only a count and its name is `Upvote this artifact` (`src/webview/render.ts:172-179`). |

### New commitments

| Rule | What the fleet must add |
|---|---|
| UX-TEXT-04 | A suggestion-parse test in each CLI's `task verify`. Neither CLI has one. |
| UX-TEXT-05 | A bad-invocation snapshot corpus per CLI, gated as a ratchet. |
| UX-TEXT-12 | Neither CLI has diagnostic codes. The commitment is to mint none without an explain entry and owner approval. |
| UX-TEXT-09, -11 | Not measured in the fleet. Add a failing-path test when a command that validates and then mutates is touched. |
| UX-TEXT-17 | A zero-tolerance grep for the MUST part (emoji and humorous interjections) over UI string paths. This is a cheap guard for a zero-hit state, not a fix for an observed defect. The SHOULD part is reviewed, not gated. |

Count correction for the topic map: row M089 cites "70 `showWarningMessage` sites", and the error dive reports none (its grep searched only `showErrorMessage`). *Re-measured* `git -C grimoire-rs/vscode grep -c "<call>" -- 'src/*.ts' ':!src/test' ':!*.test.ts'` summed: `showWarningMessage` 11, `showErrorMessage` 5, `showInformationMessage` 17.

## AI-agent failure modes

Ranked by how often each bites, grouped by mechanism.

**1. Shortest-path string building (most frequent).** The agent writes the string the shortest way the language allows.
- `showErrorMessage(e.message)` or `` `Failed to ${verb}: ${err}` ``: the raw cause relayed as the message (UX-TEXT-03, -07).
- `` `${n} item${n === 1 ? '' : 's'}` `` or `item(s)` (UX-TEXT-25, -26).
- A sentence assembled from three template fragments to "reuse" a noun (UX-TEXT-24).
- `(size / 1024).toFixed(1) + ' KB'`, a `min ago` ladder, `.join(', ') + ' and '` (UX-TEXT-27, -28).

**2. Stock copy from training data.** This mechanism is not measured. No agent-output sample was scored. The fleet repos carry agent configuration, and they have 0 hits for these strings. Treat the items as plausible, not observed.
- "Oops! Something went wrong. Please try again." (UX-TEXT-03, -17).
- "Click here", "Learn more" on every link (UX-TEXT-16).
- A success toast ending in `!` with a party emoji, or a bare `Done` (UX-TEXT-17, -30). "Successfully saved" is not a defect if it names the subject (WCAG 4.1.3).
- `OK`/`Cancel` or `Yes`/`No` as dialog choices (UX-TEXT-14).

**3. Plausible invention.** The agent fills a slot with something that looks right.
- A suggested command or flag that does not exist, by analogy with other CLIs (`ocx install`, `--force` on a command without it) (UX-TEXT-04).
- An invented cause (`Network error` for any thrown value), or one cause named where the signal admits two (UX-TEXT-03).
- An invented error code (`E0042`) with no explain page (UX-TEXT-12).
- An invented API (`Intl.MessageFormat`) or an invented limit (a reading grade, a character budget) (UX-TEXT-27, Verdict 7).

**4. One string for two audiences.** The same text serves the log and the user.
- `logger.warn(...)` printed as the user's notice, with timestamp and level (UX-TEXT-07).
- A security-relevant notice emitted at info level, or an info fact labelled `warning:` (UX-TEXT-10).
- A warning and an error for the same event, or a toast plus a second dialog (UX-TEXT-08).

**5. Paraphrase from memory, then pinning it.** The agent quotes a label or a command without checking the source.
- Docs or a manifest naming a command title that does not exist (UX-TEXT-21).
- A test that asserts the wrong suggestion, so later agents preserve the defect to keep tests green (`error.rs:614`, UX-TEXT-04).

**6. Surface-blind style transfer.** One convention applied to every surface.
- Title Case web headings and buttons, or sentence-case VS Code command titles (UX-TEXT-15).
- DOC-PLAIN-01 applied to runtime strings, or an em dash written into CLI output (UX-TEXT-23).
- Three error prefixes in one binary because each file was written alone (UX-TEXT-05).

## What an agent must ask a human

- **Voice.** Any use of "please", an apology, humour, first person (`may I install here?` at `grimoire-rs/vscode/src/views/scopes.ts:597`) or "we". The product-name prefix in notifications (`Grimoire:`). Default to none of them until the owner decides.
- **Localisation.** Whether strings will be translated, into which languages, and which catalogue (Fluent, ICU MessageFormat, MessageFormat 2). This decision sets UX-TEXT-26 to MUST and brings back the dropped SS-13 to SS-15.
- **Renaming a shipped command or setting.** It breaks keybindings and docs. Fix the quoting text first (UX-TEXT-21), and ask before renaming.
- **Error codes and exit codes.** Minting a public diagnostic code, changing a code's meaning, or changing an exit code is a public contract change.
- **Security-sensitive messages.** How much a login, token or permission failure reveals (the WCAG 3.3.3 exception) is a security decision. Keep a reviewed list of deliberately generic messages.
- **Legal, consent, privacy and regulated wording.** Preserve it verbatim; never reword it.
- **Byte-size convention** when a surface has none (IEC `KiB` or SI `kB`).
- **Time zone and form for an instant that is evidence** (UTC or viewer-local; relative, absolute or both).
- **Auto-correct.** Whether to run a guessed command instead of suggesting it (UX-CLI DISC-9 and DISC-10 own the behaviour).
- **Image intent** when the surrounding text does not settle whether an image is decorative or informative.
- **Support contact or bug-report URL** in a message (a privacy and ownership decision).

## Decay

| Rule | Fact it rests on | Source and date | Refresh interval | How to re-check |
|---|---|---|---|---|
| UX-TEXT-15 | VS Code Title Case for command titles | VS Code Coding Guidelines wiki, undated, fetched 2026-11-27 | 12 months | Open the wiki page; search "title case" |
| UX-TEXT-22 | VS Code settings and contribution-point guidance | code.visualstudio.com UX guidelines, undated, fetched 2026-11-27 | 12 months | Re-read the settings and contribution-points pages |
| UX-TEXT-17 | VS Code no emoji in command names; Primer no emoji in UI content | VS Code command palette page and Primer content page, both undated | 12 months | Re-read both pages |
| UX-TEXT-27 | MDN Baseline status; `Intl.DurationFormat` newly available since March 2025 | MDN pages modified 2025-07-10 to 2026-11-13 | 6 months (DurationFormat should reach "Widely available" about 30 months after March 2025, so September 2027) | MDN Baseline box per object |
| UX-TEXT-27 | `Intl.MessageFormat` is TC39 Stage 1 | TC39 proposal README, last presentation 2024-02 | 6 months | Proposal README stage line |
| UX-TEXT-27, -26 | `icu` crates 2.4.0, `bytesize` 2.7.0, `humantime` 2.4.0 | docs.rs, fetched 2026-11-27 | 6 months | docs.rs version headers |
| UX-TEXT-28 | `Intl.NumberFormat` has no binary byte unit | Measured on Node v26.13.1, 2026-11-27 | On each Node major | `node -e 'console.log(Intl.supportedValuesOf("unit"))'` |
| UX-TEXT-16, -30, -02 | WCAG 2.4.4 (A), 4.1.3 (AA), 3.3.3 (AA) | W3C Understanding pages updated 2026-10-04 and 2026-03-09 | 12 months, and on any WCAG 2.x or 3.0 publication | Page "Updated" line |
| UX-TEXT-20 | W3C alt decision tree | updated 2024-05-13 | 24 months | Page date |
| UX-TEXT-05, -06, -12 | rustc dev guide diagnostic rules; clap `tip:` wording | rustc dev guide live, fetched 2026-11-27; clap as shipped in ocx 0.6.8 and grim 0.16.0 | 12 months; clap wording on each clap major | Re-read the diagnostics page; run a typo against the new clap |
| UX-TEXT-17, -18, -19 | GOV.UK A to Z and error-message guidance; Polaris error messages | GOV.UK latest dated change Jan 2024; Polaris repo HEAD | 12 months | Re-read the pages |
| UX-TEXT-01 to -04 (rationale) | 120-output exemplar measurement and 20-output fleet measurement | 2026-11-27, tool versions in the dive | Re-measure the fleet on each ocx or grim minor release | Rerun the dive's appendix and the audit's section 4 |

## Open questions

### Another research round

- Which string positions in Rust and TypeScript actually reach a user (`Display` impls rendered at the boundary, notification calls, `title`/`aria-label`/`alt` attributes, clap help), and can one extractor per language feed every UX-TEXT grep so precision stops being capped by log and panic text?
- After the fleet fixes UX-TEXT-02 and -04, what is the measured next-step rate of ocx and grim, and does a second reader score the 120 exemplar outputs the same way (the scores are one researcher's reading and the raw text was not archived)?
- In VS Code, does the notification UI already show the source extension, so that a `Grimoire:` prefix repeats it? (The Microsoft devblog post on command naming was found but not fetched.)
- Are LLM-rewritten runtime error messages effective (arXiv 2409.18661 was seen only as a search result)? This matters if an AI feature rewrites errors at runtime; UX-AI owns the feature.
- Do coding agents, with no rule loaded, actually write the tells that UX-TEXT-16 and -17 list (emoji, `!`, "Oops", "please", "Learn more") when they author a toast, an error or a link? A scored sample of agent output would settle whether these rules change behaviour. Without one, they stay low-value guards.
- What does field-level error wording look like in the theme's components and the registry form, measured against GOV.UK and Polaris pairs? The fleet has almost no forms, so no web field-error string was scored.

### Owner decisions

- Is translation on the roadmap? This sets UX-TEXT-26 severity and whether a catalogue is adopted.
- Voice: the exception list for "please" and apologies (UX-TEXT-17, SHOULD part); "you" versus "I" and "we"; the `Grimoire:` notification prefix.
- Fix `package.json:338` to say "Check for Updates", or rename the command.
- `KiB` (follow the code's 1024 base) or switch the extension to SI.
- Keep `'en-US'` as the display locale, or follow `vscode.env.language`.
- Whether ocx and grim will ever have diagnostic codes with explain pages.
- Which authentication and permission failures stay deliberately generic.
- Whether `forceRetry.ts:120` keeps its four sentences as a documented security exception.

Cross-territory, one line each: README logo `alt` is shared with marketing (README copy) and the fix is the same attribute; UXA-NAME-02 should adopt "contains" as its MUST (Verdict 10); grim's tracing ANSI on a pipe is a CLI-07 violation for the Rust set.

## Sub-artifacts

- [error-message-anatomy.md](ux-interface-text/error-message-anatomy.md): parts and order of an error, CLI diagnostic shape, codes, suggestions, log boundary, warning policy; 120 scored outputs from six CLIs and the extension's five `showErrorMessage` sites.
- [labels-and-wordlists.md](ux-interface-text/labels-and-wordlists.md): label grammar, case per surface, the deny-list with measured precision over 4,510 fleet strings, links, emoji, alt-text census, docs-to-UI drift, the DOC-PLAIN-01 collision.
- [strings-that-survive.md](ux-interface-text/strings-that-survive.md): whole strings, CLDR plurals, formatter per value type in TypeScript and Rust, label-in-name, self-sufficient status strings, fleet plural and formatter measurements.

## Key sources

- https://rustc-dev-guide.rust-lang.org/diagnostics.html (rustc diagnostics: shape, codes, suggestions; live, fetched 2026-11-27)
- https://clig.dev/ (Command Line Interface Guidelines: errors, stderr is not a log; undated)
- https://www.nngroup.com/articles/error-message-guidelines/ (NN/g error guidelines; 2023-05-14)
- https://design-system.service.gov.uk/components/error-message/ (GOV.UK error message; latest change Jan 2024)
- https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/ (GOV.UK A to Z: click, please, eg, and)
- https://primer.style/product/getting-started/foundations/content/ (Primer content: labels, here, emoji, humour; undated)
- https://atlassian.design/foundations/content/designing-messages/error-messages (Atlassian: never invent a cause, sizes; vendor data, undated)
- https://github.com/microsoft/vscode/wiki/Coding-Guidelines (VS Code case per surface; undated)
- https://code.visualstudio.com/api/ux-guidelines/settings (VS Code settings descriptions; undated)
- https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html (WCAG 3.3.3; updated 2026-03-09)
- https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html (WCAG 2.4.4; updated 2026-10-04)
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html (WCAG 4.1.3; updated 2026-10-04)
- https://www.w3.org/WAI/tutorials/images/decision-tree/ (W3C alt decision tree; updated 2024-05-13)
- https://cldr.unicode.org/index/cldr-spec/plural-rules (CLDR plural categories)
- https://www.w3.org/International/articles/composite-messages/ (W3C composite messages: whole strings)
- https://www.microsoft.com/en-us/research/publication/how-should-compilers-explain-problems-to-developers/ (Barik et al., ESEC/FSE, November 2018: resolution beats structure; abstract only, fetched 2026-11-27, full text not read)

## Revision log

Revised 2026-11-27 after an adversarial check. No new dive was commissioned. Every fix comes from the existing dives, one abstract fetch and fleet re-measurements at the same commits (`grimoire-rs/vscode` 9230dcd3, `ocx-sh/ocx` 02b8434e, `grimoire-rs/grimoire` 72d3fce1). No ID was renumbered or retired.

- UX-TEXT-17: removed `successfully`. No fetched source bans it, and WCAG 4.1.3 uses "Your form was successfully submitted" as a good example. The only basis for the ban was a 0-hit count.
- UX-TEXT-17: split the severity. MUST keeps emoji and the humorous interjections `oops`, `whoops`, `uh-oh` and `yikes`, because Primer and VS Code say "do not". `please`, `sorry`, `apologise` and a trailing `!` moved to SHOULD, because the sources say "usually", "in most cases" and "sparingly". `please` also left the MUST list the skeptic proposed: GOV.UK's "usually no need" is SHOULD-strength.
- UX-TEXT-17: removed `click here`, which duplicated UX-TEXT-16. The generic error phrases now live only in UX-TEXT-03.
- UX-TEXT-16: MUST to SHOULD. WCAG 2.4.4 accepts context, no agent-output sample was measured, and the fleet has 0 hits. The rule is not merged with -17, because link labels and tone words are checked by different greps on different syntax. The overlap was removed instead.
- UX-TEXT-16, -17 and failure mode 2: removed the unmeasured claim that "agents add these" and marked it as a hypothesis. Added an Open question for an agent-output sample.
- UX-TEXT-22: the two-sentence threshold is now labelled this topic's calibration. The verify now flags long descriptions that have no docs link, which is the form VS Code states. The contradiction with "no budget" is resolved.
- Verdict 7: corrected "sentence counts ... sourced". Only UX-TEXT-13's count has a source, and it is vendor data.
- UX-TEXT-02: replaced the fixed verb list, which failed correct next steps. CLI uses the `help:` last-line check. GUI uses a stated review.
- UX-TEXT-04: the verify now says that its script covers commands only. Added unit-test assertions for flags, setting keys and files.
- UX-TEXT-08: the gate is now a snapshot assertion per fixture. `uniq -d`, restricted to lines of 30 or more characters, and a new within-line duplicate grep are candidate lists only. Both were tested on the deno and ocx row 11 fixtures.
- UX-TEXT-24: MUST to "SHOULD; MUST once the owner adopts translation", matching UX-TEXT-26 and Verdict 9. The rationale is a translation one. The verify claim was narrowed to what the regex actually catches.
- Verdict 1 and Key sources: Barik et al. is labelled abstract-only. The quoted sentence was confirmed in the abstract on 2026-11-27. The ranking now rests on the measurement.
- Verdict 5 and 6: rewritten to match the UX-TEXT-17 split. `please` is a SHOULD with owner-listed exceptions.
- UX-TEXT-23: added a precedence note. UX-TEXT-05's `help:` line, not a dash swap, fixes the ``{text} — run `{command}` `` separator at `user_interface.rs:87`. UX-TEXT-19: added a scope note. No DOC-PLAIN rule covers `e.g.`, so there is no overlap.
- Applied rows UX-TEXT-15, -22, -25, -26 and -27: added file:line for every count. Re-measurement found two corrections. grim has 4 true `(s)` strings plus 1 `http(s)` false positive. `grimoire.path.executable` (`package.json:310`, 3 sentences, no link) is a second UX-TEXT-22 candidate that the earlier row missed.
- New commitments UX-TEXT-17: the zero-tolerance grep now covers the MUST part only.
