---
title: Error, warning and diagnostic message anatomy for GUI and CLI
program: product
sub_program: ux
topic: ux-interface-text
worker: error-message-anatomy
date_researched: 2026-11-27
model: sonnet
sources_fetched: 20
---

# Error, warning and diagnostic message anatomy

Scope: the required parts of a runtime error, warning or diagnostic message, their order, the CLI diagnostic shape, error codes, suggestion wording, the log-versus-message boundary and the warning policy. Not covered: word deny-lists (next dive) and machine-readable errors (UX-AGENT). Scout row IDs (M084 to M089, CD1 and so on) did not resolve in the scout files under `ux-topic-map/`; the rows were matched by content (`content-design.md` rows 1 to 7, 15 to 17, 36).

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)
9. [Appendix: scored outputs](#appendix-scored-outputs)

## Summary

- Four parts in this order: what failed (naming the input), why (only when known), next step, code (last, only if it earns it). The sources agree on the first three; only the code position is disputed.
- Measured on 120 error outputs from six CLIs: every output says what happened (115 yes, 5 part), but only 42 (35%) give a next step in the message, and 59 (49%) give none. "What" is solved; "next step" is the gap.
- Only 34 of 120 (28%) have all applicable parts. The best CLI (terraform) had 10 of 20; cargo 6, gh 8, deno 4, kubectl 3, uv 3.
- The five extension `showErrorMessage` call sites are better than the CLIs on next step (3 of 5 carry an action button) but four of five delegate the "why" to grim's own message text, so quality tracks the CLI message.
- The commission's FC27 premise is not supported: the O'Reilly piece (Pujari, 30 Sep 2026) sets no plain-language or length limit. The only numeric limits found come from Atlassian (vendor design system) and WCAG 3.1.5 (AAA, "lower secondary education level").
- CLI diagnostic shape: first line is a self-contained `error: <what failed>: <input>`; cause and context follow as `note:` lines; the last line is `help: <imperative next step>`. This satisfies rustc (summary first, help separate) and clig.dev (the line the eye lands on is the fix).
- Give an error a code and an explain page only when the explanation says more than the message can (rustc threshold). Every code needs an explain page; a code with no page is a dead end. Lints and warnings get no codes.
- A suggestion is stated, not asked (rustc), and the suggested command or flag must exist: measured defect in the OCX fleet, `ocx install` is suggested by an error but the plugin dispatcher rejects it (`product-audit/cli-first-run.md` section 4 row 4).
- Test every suggested command with the CLI's own parser: extract backticked commands from error strings and run them with `--help`.
- Interface text is not a log line. Measured: kubectl prints five identical klog lines (`memcache.go:381`) before its one human sentence; grim leaks a timestamped ANSI `WARN` tracing line as the user-facing message (audit row 20 and colour leak).
- A message string is composed for the user at the boundary; the raw cause goes to a log channel. The extension already does this (`output.appendLine` plus a toast in `notify.ts:reportGrimFailure`).
- Warn only when the condition may cause a later problem and the user can act on it or silence it (Atlassian, rustc "warning fatigue"). An informational line is not a warning, and a warning is never repeated as an error (measured: `deno doc nonexist.ts` prints both).
- A warning that exits 0 and names no action is noise: terraform `Warning: No outputs found`, `gh config set nosuch x` warn without a next step.
- GUI: describe the error in text next to its field (WCAG 3.3.1, Level A), offer the correction when known (WCAG 3.3.3, AA), keep the user's input (GOV.UK, NN/g), and never invent a cause (Atlassian).
- When the cause is unknown say so plainly and give the one recovery action; Polaris and Atlassian give the same fallback shape.
- Do not use "Error" alone, "An error occurred" or "Something went wrong" as the message; Apple HIG and NN/g name it as the failure pattern.
- Independent evidence (Barik et al., FSE 2018, 68 developers): developers prefer well-structured explanations, but accept a weaker structure if it gives a resolution. Resolution outranks polish.

## Findings

### 1. What the sources require, side by side

| Source | What happened | Cause | Next step | Code | Date / authority |
|---|---|---|---|---|---|
| [NN/g, 13 guidelines](https://www.nngroup.com/articles/error-message-guidelines/) | "Describe the exact problem" (#6) | not required | "Offer remedies" (#7) | "show them for technical diagnostic purposes only" (#5) | 14 May 2023, independent research firm |
| [Adobe Spectrum](https://spectrum.adobe.com/page/writing-for-errors) | first, "like a headline" | optional, "when it helps" | required; if none, "explain what the product is doing" | "at the end of the message", only if users benefit | no date, vendor design system |
| [Atlassian](https://atlassian.design/foundations/content/designing-messages/error-messages) | title, 3 to 4 words | in body: "the reason for the error and the problem" | body: "how to act, and what happens if they don't act"; CTA 1 to 2 words | not covered | no date, vendor design system |
| [GOV.UK error message](https://design-system.service.gov.uk/components/error-message/) | "explain what went wrong and how to fix it" | not required | in the same sentence | avoid "error 0x0000000643" | latest dated change Jan 2024, government design system |
| [rustc dev guide](https://rustc-dev-guide.rust-lang.org/diagnostics.html) | main message | `note` | `help` only: "changes the user can possibly make"; the error itself should not suggest a fix | only when the explanation "would give more information than the error itself" | no date, compiler project |
| [clig.dev](https://clig.dev/) | rewrite expected errors for humans | debug info only for unexpected errors | suggest if intent can be guessed; "most important information at the end" | not covered | no date, community guide |
| [Google tech writing](https://developers.google.com/tech-writing/error-messages) | "What went wrong?" | "unclear cause" is a named defect | "How does the user fix that problem?" | "Log the error codes ... document all codes" (error-handling unit) | no date, vendor course |
| [Primer](https://primer.style/foundations/content) | "Be specific" ("Enter a credit card number", not "Field required") | not defined | not defined | not covered | no date, vendor design system |

Reading: all eight agree on what happened plus a remedy; four make cause optional; none makes a code mandatory. The Primer page does not define an error structure at all and has no guidance on warnings (checked on the fetched page).

The [Heroku CLI style guide](https://devcenter.heroku.com/articles/cli-style-guide) (updated 31 Jan 2025) is named in the commission but has almost nothing on errors: stream routing (stderr for warnings and errors), colour (`--no-color`, non-tty) and "ensure that args or flags can always be provided to bypass the prompt". Its error rules live in [clig.dev](https://clig.dev/), which cites Google and NN/g. Do not cite Heroku for error shape.

### 2. Measurement: 120 error outputs from six CLIs

Method. Binaries: cargo 1.96.0, gh 2.105.0, uv 0.13.9 (all from the fleet toolchain); kubectl v1.37.3 (client, from `dl.k8s.io`), terraform 1.17.2 (from `releases.hashicorp.com`), deno 2.9.8 (from the GitHub release), unpacked under `~/.cache/research-lang/exemplars/product/err-anatomy/bin/` (the directory was later removed by another process; commands below reproduce it). Isolated `HOME`, `NO_COLOR=1`, stdin `/dev/null`, empty scratch working directory (gh in an empty `git init` directory with `GH_TOKEN=invalidtoken` so non-network argument errors surface). Each command run once as `timeout 40 bash -c "<cmd>" 2>&1 </dev/null | head -c 900 | head -8`. The full command list is in the [appendix](#appendix-scored-outputs). Legend from `product-audit/cli-first-run.md` section 4: W says what happened, Y says why, N says what to do next, I echoes the offending input; y = yes, p = part, n = no, `-` = I not applicable (no user-supplied value to echo; for example "no config found in the working directory"). Scoring is the researcher's reading of each output; the full table is reproducible by rerunning the commands and re-reading.

| CLI | n | W y/p/n | Y y/p/n | N y/p/n | I y/p/n (n/a) | all applicable parts yes |
|---|---|---|---|---|---|---|
| cargo | 20 | 20/0/0 | 8/7/5 | 8/2/10 | 18/1/0 (1) | 6 |
| gh | 20 | 19/1/0 | 11/6/3 | 9/1/10 | 5/0/1 (14) | 8 |
| terraform | 20 | 20/0/0 | 17/3/0 | 11/4/5 | 18/0/0 (2) | 10 |
| kubectl | 20 | 16/4/0 | 10/10/0 | 6/8/6 | 8/0/3 (9) | 3 |
| uv | 20 | 20/0/0 | 10/10/0 | 4/2/14 | 10/0/1 (9) | 3 |
| deno | 20 | 20/0/0 | 11/6/3 | 4/2/14 | 16/0/3 (1) | 4 |
| total | 120 | 115/5/0 | 67/42/11 | 42/19/59 | 75/1/8 (36) | 34 |

Distribution in words: what-happened is a solved problem (96% yes, no "no"). Why is yes in 56% and absent in 9%. Next step is the weak part: 35% yes, 16% part, 49% none; uv and deno give a next step in only 4 of 20 each. Input echo is strong where it applies (75 of 84).

Notable findings from the runs:

- **Raw log lines before the message (kubectl).** `kubectl get pod` with no cluster prints five identical klog lines, `E1127 ... memcache.go:381] "Couldn't get current server API group list" err="Get \"http://localhost:8080/api?timeout=32s\": dial tcp ... connection refused"`, then one human line: `The connection to the server localhost:8080 was refused - did you specify the right host or port?` (6 lines; command: `kubectl get pod 2>&1 </dev/null | wc -l`). The one human line is a question and the user's actual mistake (`get nosuchres`, `--output=nosuch`, `delete pod` with no name) is masked by the connection error in 3 of 20 samples, scored W=part, I=no.
- **Typo handling.** `cargo bild` suggests `build` and a package-search command; `gh pr lis` and `kubectl gett` print `Did you mean this?`; `uv pip instal` prints `tip: some similar subcommands exist`; terraform prints `Did you mean "plan"?`; `deno rnu x.ts` treats the typo as a module path and prints `Module not found "file:///.../rnu"` with no suggestion. `kubectl gett` lists `set` before `get`.
- **Side effect before failure.** `cargo remove nosuchzzz` prints `Removing nosuchzzz from dependencies` and then fails; `deno add nosuchpkgzzz` prints `Created deno.json configuration file.` and then `error: npm:nosuchpkgzzz was not found.` A success-shaped line before an error misreports the outcome.
- **Duplicate text.** `deno doc nonexist.ts` prints `Warning Module not found "..."` then `error: Module not found "..."`; `deno run --allow-net=: th.ts` prints the cause twice. rustc's guide: "Avoid multiple error messages for the same error."
- **Internals leaked.** `kubectl scale --replicas=x` prints `strconv.ParseInt: parsing "x": invalid syntax`; `cargo build --target nosuch-target` prints a 400-character `rustc` command line before the useful `run rustc --print target-list`.
- **Best shapes.** terraform's `Error: <title>` plus `on main.tf line N` plus a quoted source line plus a prose paragraph with the fix (`Did you mean "x"?`, `Use a -var or -var-file command line argument`); deno's `NotCapable: Requires read access to "/nonexist", run again with the --allow-read flag`; cargo's `no matching package named ... found / location searched / required by / note: offline mode ... / help: if this error is too confusing you may wish to retry without --offline`.
- **Measured defect, uv `No pyproject.toml found in current directory or any parent directory`.** Six of 20 uv outputs are this single sentence for six different commands (`add`, `sync`, `lock`, `remove`, `export`, `tree`); none says `uv init`.

### 3. Fleet baseline (already measured, not re-run)

`product-audit/cli-first-run.md` section 4 scores 20 ocx and grim errors with the same legend: what 20 of 20, why 9 yes, 5 part, 6 no, next step 11 of 20 (one names a command that does not exist, `ocx install`), input echoed 17 of 20. It also records mixed prefix conventions inside grim (`error:` from clap, no prefix for runtime errors that lead with a path), and an info-level line shown unprefixed at default verbosity (row 6). The fleet is therefore comparable to cargo and gh on next step (55% against 35% across the six exemplars) and worse than terraform on consistency.

### 4. The extension's five `showErrorMessage` call sites

Command: `grep -rn "showErrorMessage" /home/mherwig/dev/grimoire-rs/vscode/src --include='*.ts' | grep -v test` finds five production call sites in four files (test files excluded). `showWarningMessage` has no production site in that grep.

| # | Site | Message shape | W | Y | N | I |
|---|---|---|---|---|---|---|
| 1 | `src/notify.ts:97` (`notifyError`, reached from `reportGrimFailure`, `notify.ts:112-124`) | `Grimoire: <context>: <grim message, max 1000 chars>`; raw message also logged via `output.appendLine('error: ...')`; no button | y | relay | relay | relay |
| 2 | `src/views/forceRetry.ts:120` (anchor-escape) | `Grimoire: <subject>: a recorded path resolves outside its anchor root. grim will not read or write through it. Uninstall and reinstall it to repair. Files may remain on disk and must be removed manually.`; button Show Output | y | y | y | y |
| 3 | `src/views/updateRefusal.ts:92` (single refused artifact) | `Grimoire: update (<scope>) kept your local changes to <names> ...` or `Grimoire: <op> stopped — <reason>`; buttons `Open <name>` and Show Output | y | y (refused branch) or relay | y (Overwrite path or button) | p |
| 4 | `src/views/updateRefusal.ts:104` (no single repo) | same two message branches; button Show Output only | y | y or relay | p | p |
| 5 | `src/views/staleLock.ts:134` (reason `no-lock`) | `Grimoire: grim <cmd>: <grim message, max 1000 chars>`; button Run grim lock | y | relay | y | p |

Tally: what 5 of 5; next step 3 yes, 1 part, 1 delegated to grim; why 1 own plus delegated for 3. Two of the strings use an em dash and the phrase `the lock pin moved on` is internal jargon. Positive findings: markdown-link characters in grim's message are neutralised by `dialogText` (comment at `notify.ts:116-118`), the burst deduper `notifyError(..., { dedupe: true })` addresses the duplicate-message failure mode, and the raw message is logged in parallel, which is the correct log/interface split. The extension's weak point is the relay: a toast is only as good as grim's text, and grim's measured next-step rate is 55%.

### 5. CLI diagnostic shape

rustc's guide [fixes the parts](https://rustc-dev-guide.rust-lang.org/diagnostics.html): level, optional code, main message, a window with labelled spans, then sub-diagnostics `note` (context) and `help` (the fix). Wording: lowercase start, no trailing period, backticks around code and identifiers, "succinct, but not so terse that they're hard to understand". [GNU](https://www.gnu.org/prep/standards/html_node/Errors.html) gives the same lowercase and no period, `sourcefile:lineno: message` for compilers and `program: message` for non-interactive tools. clig.dev adds: group repeated errors under one header and put the key line last. Measured, the CLIs that score best (terraform, cargo) put the fix at the end and a self-contained first line at the top. Decision: first line is self-contained; last line is the fix.

Correct and incorrect side by side (same failure):

```text
# incorrect (measured shape of uv/gh/ocx row 11)
error: No `pyproject.toml` found in current directory or any parent directory

# correct (cargo-style, naming input and next step)
error: no `pyproject.toml` found in `/work` or any parent directory
note: `uv add` edits a project, and none was found
help: run `uv init` to create one
```

```text
# incorrect (measured: ocx audit row 4, suggested command does not exist)
error: ocx.sh/nodejs/node:24 is not installed; run ocx install ocx.sh/nodejs/node:24

# correct (suggestion verified against the command tree)
error: ocx.sh/nodejs/node:24 is not installed
help: run `ocx package install ocx.sh/nodejs/node:24`
```

### 6. Error codes and explain pages

[rustc dev guide](https://rustc-dev-guide.rust-lang.org/diagnostics.html): give an error a code "when the explanation would give more information than the error itself"; lints get none; codes resolve through `--explain` and the [error index](https://doc.rust-lang.org/error_codes/E0382.html), where each page has a one-line meaning, an erroneous example and several fixes. [NN/g](https://www.nngroup.com/articles/error-message-guidelines/) (#5) and [Spectrum](https://spectrum.adobe.com/page/writing-for-errors) limit codes to diagnosis and support and put them last. The [Google error-handling unit](https://developers.google.com/tech-writing/error-messages/error-handling): "Log the error codes", "document all codes", and do not swallow the root cause. Decision for ocx and grim: they already return sysexits-style exit codes (audit section 3) and need no second numeric code for routine errors. Mint a diagnostic code only for an error whose full explanation (several fixes, a worked example) would make the message too long ([rustc E0382](https://doc.rust-lang.org/error_codes/E0382.html) is the model: the terminal message is 6 lines, the explain page has four fixes); then the code, `--explain <CODE>` and a docs page must exist together. Rustc puts the code in the header (`error[E0382]:`), which keeps `grep error` and code lookup on one line; Spectrum's ["code last"](https://spectrum.adobe.com/page/writing-for-errors) is a GUI rule for human reading. Both are followed here by surface.

### 7. Suggestions

[rustc dev guide](https://rustc-dev-guide.rust-lang.org/diagnostics.html): state suggestions; avoid "did you mean"; keep suggestions out of the main message; applicability levels MachineApplicable, HasPlaceholders, MaybeIncorrect, Unspecified, "be conservative when choosing the level". [clig.dev](https://clig.dev/): "If the user made a mistake and you can guess the intent, suggest the fix", do not force it, and warn that guessing is dangerous for state changes. [WCAG 3.3.3](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html) (AA, updated 9 Mar 2026): where suggestions are known they are provided, unless that would "jeopardize the security or purpose of the content" (for example a login failure must not say which of username or password was wrong). Measured (commands in the appendix; flag-typo check rerun 2026-11-27 with cargo 1.96.0): five of six exemplar CLIs print a suggestion for a mistyped subcommand in at least one sample. For flag typos, `cargo build --releas` prints `tip: a similar argument exists: '--release'`, and `cargo build --debug` prints ``tip: `--debug` is the default for `cargo build`; instead `--release` is supported``; no other exemplar flag typo was sampled.

### 8. Log lines and interface messages

[clig.dev](https://clig.dev/): "Don't treat stderr as a log file, at least not by default", omit `ERR` or `WARN` labels and extra context unless verbose; avoid "scary-looking stack traces"; consider writing the debug log to a file. [Heroku](https://devcenter.heroku.com/articles/cli-style-guide) (31 Jan 2025): errors and warnings to stderr. Measured: kubectl emits klog records (`E1127 ... memcache.go:381`) to the user stream five times ahead of the human sentence; grim prints a timestamped, colourised tracing line for a user-facing warning (audit row 20; `grep -n with_ansi grimoire/src/main.rs` finds none, audit section 3). Boundary: anything with a timestamp, logger level, source file or module path, a retry counter or a raw OS error is a log record; anything that names what the user tried and what to do next is a message. The same event may produce both, but the message is composed separately.

### 9. Warnings

[Atlassian](https://atlassian.design/foundations/content/designing-messages/error-messages): an error follows an action; a warning flags a condition that "might cause a problem later". [rustc dev guide](https://rustc-dev-guide.rust-lang.org/diagnostics.html): "Warnings should be issued carefully to avoid warning fatigue and false positives", prefer user-controllable lints over hard-coded warnings, `allow` for high false-positive lints. Measured warnings in the six CLIs: cargo `warning: please specify --format-version flag explicitly to avoid compatibility problems` (names the action); terraform `Warning: No outputs found` (exit 0, explains how to define an output, fine); gh `! warning: 'nosuch' is not a known configuration key` (exit 0, no action named); deno `Warning Module not found` immediately followed by the same text as `error:`; ocx audit row 10 prints a deprecation warning naming the replacement and the removal version (good). Decision rules in the next section.

### 10. GUI messages

[WCAG 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html) (Level A, updated 2 Nov 2026): "the item that is in error is identified and the error is described to the user in text". [NN/g](https://www.nngroup.com/articles/error-message-guidelines/): place near the source, never colour or animation alone, reserve modals for severe errors, do not show errors too early, keep user input, avoid humour. [GOV.UK](https://design-system.service.gov.uk/components/error-message/): same wording in field and summary, a hidden "Error:" prefix for screen readers, do not clear fields, use a separate page for ineligibility and service problems, track how often errors are seen. [Atlassian](https://atlassian.design/foundations/content/designing-messages/error-messages): title 3 to 4 words, body 1 to 2 sentences, CTA 1 or 2 words, verb CTAs, never invent a cause. [Apple HIG alerts](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/alerts.json): titles that describe the situation, never "Error" or "Error 329347 occurred", never `OK` as the default for non-informational alerts, always `Cancel` for cancelling. [Polaris](https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/content/error-messages.mdx): `Something went wrong. Refresh your browser to try again.` is the fallback when no fix is known, with "Sorry," and "Learn more" marked as the bad version.

### 11. Reading level and the FC27 premise

The commission points at an O'Reilly piece for "the plain-language limit on errors and confirmations". The fetched page ([`?p=19843`](https://www.oreilly.com/radar/?p=19843), "Evaluating AI-Generated Frontend Code: What Should We Actually Test?", Niharika P. Pujari, 30 Sep 2026) sets no plain-language limit, reading level or length; it only says an error state "should explain what went wrong and what the user can do next" and warns that "Something went wrong" with no recovery is a defect. It has no confirmation guidance. Treat FC27 as unsupported. The nearest authority: WCAG [3.1.5](https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html) (AAA, updated 28 Jun 2026) requires supplementary content when text needs reading ability beyond the lower secondary education level (7 to 9 years of school, ISCED), judged by qualified educators with no formula, and Atlassian's 1 to 2 sentences. No fetched source gives a numeric reading grade for error text. Do not invent one; use the sentence limit and the read-aloud test (GOV.UK).

### 12. Independent evidence

Barik, Ford, Murphy-Hill and Parnin ([FSE 2018](https://www.microsoft.com/en-us/research/publication/how-should-compilers-explain-problems-to-developers/), 68 professional developers plus a Stack Overflow study over seven languages): developers "significantly prefer" a well-structured argument over a deficient one only when neither message gives a resolution, and "will accept a deficient argument structure if it provides a resolution". The ITiCSE 2019 working group report ([Becker et al.](https://iticse19-wg10.github.io), 300+ reference corpus) concludes that error messages "present substantial difficulty and could be more effective, particularly for novices". Neither was fetched in full text; the finding on resolution is the one this artifact leans on, and it supports ranking "next step" above style rules.

## Normative guidance candidates

Severity: MUST, SHOULD, CONSIDER. Every rule has a verification an agent can run or apply.

**EM-1 (MUST).** Every error message states what failed, in terms of the user's action, and names the offending input (path, name, value) when one exists. Rationale: "what" plus the input is the minimum that lets the user find the problem; 75 of 84 applicable samples did it and the misses (`No target files found.`, `No files found to publish`) are the ones users cannot act on. Verify: test passes an invalid input X and asserts stderr or the dialog text contains X; reading heuristic "could someone who saw only this line name the file or flag at fault?". Fail: `No target files found.` Pass: `no files matched `nonexist.ts`.`

**EM-2 (MUST).** Every error carries a next step in the message, or states that none exists and what the product does. Rationale: next step was absent in 49% of 120 outputs; Spectrum and Atlassian require it; WCAG 3.3.3 requires known corrections; Barik 2018 shows developers accept a weak structure when it resolves the problem. Verify: per error site, the string or an adjacent button contains an imperative verb phrase or the words "no action" with a statement; lint idea: flag error literals whose last clause has no verb from a command or button. Fail: `error: required resource not specified` Pass: `error: required resource not specified` then `help: pass a resource, for example `kubectl rollout status deployment/<name>``.

**EM-3 (MUST).** Order the parts what, why, next step, code. Cause is included only if the code path knows it; when unknown, write "something went wrong" plainly followed by one recovery action; never write a cause the code does not check. Rationale: Atlassian ("don't make one up"), Spectrum order, Polaris fallback. Verify: reading heuristic "can I point at the line of code that established this cause?"; grep for `because|due to|caused by` in error literals and trace each to a checked condition. Fail: `Upload failed because the file is too large` when the code only caught a 500. Pass: `Upload failed. Try again in a moment.`

**EM-4 (MUST).** Never ship a message that is only `Error`, `An error occurred`, `Something went wrong`, `Failed`, `Unknown error` or the raw exception text. A bare "Something went wrong" is allowed only as the first clause of the unknown-cause fallback in EM-3. Rationale: NN/g #6, Apple HIG, GOV.UK ("An error occurred" listed as generic), O'Reilly (2026). Verify: `rg -n -i "(an error occurred|something went wrong|unknown error|^\s*['\"]error['\"]\s*$)" src` and review each hit for a following remedy. The full word deny-list is the next dive's.

**EM-5 (MUST).** CLI diagnostics: first line `error: <what failed>[: <input>]` self-contained, lowercase start, no trailing period, identifiers in backticks; context as `note:` lines; the fix as the last line `help: <imperative>`. One prefix convention per binary. Rationale: rustc and GNU wording, clig.dev key-info-last, measured prefix mix in grim (audit section 4). Verify: snapshot-test `<cli> <bad invocation> 2>&1`; regex `^error: [a-z`'"]` on line 1, no `\.$` on line 1, `^help: ` on the last non-blank line; run across a corpus of bad invocations and require the rate to be 100% for new errors.

**EM-6 (MUST).** A suggested command, flag, subcommand or file must exist. Test it with the CLI's own parser. Rationale: measured defect `ocx install` (audit row 4); WCAG 3.3.3 suggestions must be correct to help. Verify (command): `rg -o 'run `([^`]+)`' src --replace '$1' | while read c; do ./target/debug/<cli> ${c#<cli> } --help >/dev/null 2>&1 || echo "MISSING: $c"; done` prints nothing; for placeholders (`<name>`) test the command up to the first placeholder.

**EM-7 (MUST).** State suggestions; do not phrase them as questions ("Did you mean ...?") in diagnostic text unless the CLI is interactive and will actually prompt. Rationale: rustc rule; clig.dev shows the prompting form only as an interactive prompt. Verify: `rg -n -i "did you mean" src` and confirm each hit is followed by a prompt call. Caveat: gh, kubectl and terraform print `Did you mean`; this is the contested point, see below.

**EM-8 (MUST).** An error code is minted only when the explanation would add information beyond the message; every code has an explain entry (`--explain <CODE>` or a docs page) and the entry exists before the code ships. Lints, warnings and exit-code classes do not get codes. Rationale: rustc threshold; codes without pages are dead ends (Google: "document all codes"). Verify: `comm -3 <(rg -oh 'E[0-9]{4}' crates | sort -u) <(ls docs/errors | sed 's/\.md$//' | sort -u)` prints nothing; and `<cli> --explain <CODE>` exits 0 for each code.

**EM-9 (MUST).** In GUIs, the message appears in text next to the field in error and, when a summary exists, with identical wording in both places; colour or an icon alone never carries it. Rationale: WCAG 3.3.1 (A), NN/g #1 and #2, GOV.UK. Verify: axe-core rule set for form errors, or a test that the error string appears in `aria-describedby` text of the invalid field and the summary list; screenshot-grayscale reading check.

**EM-10 (MUST).** An error never discards the user's input. Rationale: GOV.UK (Jan 2024), NN/g #10. Verify: test submits an invalid form and asserts the field values are unchanged after the error render; grep catch blocks for `reset()`, `setState(initial)` or `form.clear`.

**EM-11 (SHOULD).** GUI sizes: title 3 to 4 words, body 1 to 2 sentences, CTA 1 to 2 words, imperative verb CTA; split a longer explanation into a docs link or `Show details`. Rationale: Atlassian limits (vendor, undated); forceRetry's four-sentence security message is the one deliberate exception and should be documented as such. Verify: word and sentence count on the string literal at each `showErrorMessage`, `showWarningMessage` and toast site; deviations need a comment naming the reason.

**EM-12 (SHOULD).** Use a specific title or first clause, never "Error" alone; for buttons, name the result (`Run grim lock`, `Delete`), never `OK`, `Yes` or `No` except in purely informational alerts; always provide `Cancel` where an action can be cancelled. Rationale: Apple HIG alerts. Verify: `rg -n "showErrorMessage\([^)]*,\s*['\"](OK|Yes|No)['\"]" src`; lint dialog labels.

**EM-13 (MUST).** Interface text is never a log record. No timestamp, logger level, module path, source file, retry counter or raw OS error text in the user-facing message; send that to the log, output channel or `--verbose`. Rationale: clig.dev; measured kubectl klog lines (5 of 6 lines) and the grim `WARN` line. Verify: `<failing command> 2>&1 | rg '^[A-Z][0-9]{4} |^[0-9]{4}-[0-9]{2}-[0-9]{2}T|\b[a-z_]+\.(go|rs):[0-9]+\]'` returns nothing at default verbosity; `NO_COLOR=1 <failing command> 2>&1 | cat -v | rg '\^\[\['` returns nothing; when stdout is piped and stderr is a pipe, no ANSI.

**EM-14 (MUST).** Never print the same cause twice in one run, and never print a warning that the same run then repeats as an error. Group repeats under one header. Rationale: rustc ("avoid multiple error messages for the same error"), clig.dev; measured deno `doc` and kubectl klog duplicates. Verify: `<failing command> 2>&1 | sed 's/^[A-Za-z]* *//' | sort | uniq -d` returns nothing for non-blank lines; test asserts a failing command writes the cause at most once.

**EM-15 (MUST).** Do not print a success-shaped progress line before an operation that then fails (for example `Removing x from dependencies` then error). Rationale: measured cargo remove and deno add. Verify: for each failing-path test, assert the output does not contain a past-tense or progressive success verb before the `error:` line.

**EM-16 (SHOULD).** Do not leak internals into the message: no language-runtime parse errors (`strconv.ParseInt: parsing "x": invalid syntax`), no full child-process command lines, no stack trace by default. Put them behind `--verbose` or in the log. Rationale: clig.dev; measured kubectl and cargo samples. Verify: `rg -n "(strconv\.|std::|NullPointer|Traceback|at .*\.(js|ts):[0-9]+)" <captured stderr>` returns nothing for non-debug runs.

**EM-17 (SHOULD).** When a user error is masked by an environment error (no cluster, offline), report the user's mistake first if it can be detected without the environment (flag, argument and syntax validation before connecting). Rationale: clig.dev "validate input early"; measured kubectl `get nosuchres`, `--output=nosuch`, `delete pod`. Verify: a test with no network and a malformed argument must report the argument, not the connection.

**EM-18 (MUST).** Warning policy: emit a warning only when (a) a condition may cause a later problem, (b) the user can act or silence it, and (c) the same run does not also fail on it. A warning names the action or the opt-out (flag, config key, lint level). Informational facts are not warnings: print them only under `--verbose`, or as plain status text without a `warning` label. Rationale: Atlassian definition; rustc "warning fatigue"; measured `gh config set nosuch x`, ocx row 6 (an info-level line at default verbosity). Verify: for each `warn!` or `warning:` site, the string contains a verb phrase or flag name; `rg -n 'log::info!|info!\(' src` sites that reach stderr at default verbosity are reviewed.

**EM-19 (MUST).** Deprecation warnings name the replacement and the version of removal. Rationale: the fleet's own `ocx package info` warning is the model (audit row 10); cargo `metadata` warns without a deadline. Verify: `rg -n -i 'deprecated|is renamed' src` strings each contain `use`, `renamed to` or `replaced by` and a version.

**EM-20 (SHOULD).** Security-sensitive failures may be less specific; this is the only exception to EM-1 and EM-2. Rationale: WCAG 3.3.3 exception "jeopardize the security". Verify: authentication and authorisation errors are listed in a reviewed table of deliberately generic messages; anything else generic fails EM-1.

**EM-21 (SHOULD).** Do not introduce a second error surface: a failure that has an Output channel record must also have exactly one toast, and a toast must not be raised on a user-cancelled action. Rationale: Apple HIG (avoid alerts for undoable actions); extension `notifyError` dedupe design. Verify: grep each `showErrorMessage` site for an adjacent `appendLine` or log call and for a cancel-token guard.

## Dated facts

| Fact | Source | Date the source states | Kind |
|---|---|---|---|
| 13 error guidelines; humour avoided; codes for diagnostic use only; keep input | [NN/g](https://www.nngroup.com/articles/error-message-guidelines/) | published 14 May 2023 | independent research firm |
| WCAG 2.2 SC 3.3.1 Error Identification, Level A | [W3C](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html) | updated 2 Nov 2026 | authority (standard) |
| WCAG 2.2 SC 3.3.3 Error Suggestion, Level AA, security/purpose exception | [W3C](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html) | updated 9 Mar 2026 | authority |
| WCAG 2.2 SC 3.1.5 Reading Level, AAA, lower secondary education level (7 to 9 years of school, ISCED) | [W3C](https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html) | updated 28 Jun 2026 | authority |
| GOV.UK: keep entered answers (added Jan 2024); match question and error language (Nov 2023); `<p>` element since frontend v4.0.0 (Dec 2021); component is for input errors, not service problems (Dec 2020) | [GOV.UK](https://design-system.service.gov.uk/components/error-message/) | latest dated entry Jan 2024 | authority (government design system) |
| Heroku CLI style guide: errors and warnings go to stderr; page last updated 31 Jan 2025; almost nothing on error shape | [Heroku](https://devcenter.heroku.com/articles/cli-style-guide) | 31 Jan 2025 | vendor |
| Atlassian: title 3 to 4 words, body 1 to 2 sentences, CTA 1 to 2 words | [Atlassian](https://atlassian.design/foundations/content/designing-messages/error-messages) | none stated | vendor data |
| rustc: code only if the explanation adds information; lowercase, no period; applicability levels | [rustc dev guide](https://rustc-dev-guide.rust-lang.org/diagnostics.html) | none stated (live document, fetched 2026-11-27) | authority (compiler project) |
| Barik et al.: 68 developers, comparative evaluation plus a Stack Overflow study over seven languages | [MSR](https://www.microsoft.com/en-us/research/publication/how-should-compilers-explain-problems-to-developers/) | Nov 2018 (ESEC/FSE) | independent study |
| Becker et al.: 300+ reference corpus on programming error messages | [ITiCSE WG10](https://iticse19-wg10.github.io) | 2019 | independent study |
| O'Reilly piece behind FC27: no plain-language limit | [O'Reilly Radar](https://www.oreilly.com/radar/?p=19843) | 30 Sep 2026 | publisher (not an authority on limits) |
| Measured: 120 outputs, 42 with a next step (35%), 34 with every applicable part (28%); 5 extension call sites | this artifact, commands in the appendix | 2026-11-27 | researcher measurement; tool versions cargo 1.96.0, gh 2.105.0, uv 0.13.9, kubectl v1.37.3, terraform 1.17.2, deno 2.9.8 |

## What an agent must not decide alone

- Apology, humour and brand voice: whether "sorry" is ever used (Spectrum allows it for data loss; Primer and Atlassian discourage it), whether the product speaks as "we" (Spectrum: yes, Atlassian: use "you"), whether an outage page may use novelty (NN/g #13). Ask the brand owner; default to none.
- Legal, privacy and regulated wording: data-loss disclosures, consent, breach, payment or health wording, anything under accessibility or AI-disclosure law. Ask.
- What a security-sensitive error reveals (login, token, permission): the WCAG 3.3.3 exception is a security decision, not a copy decision.
- Whether to auto-correct instead of erroring (Spectrum's 101 to 100 example) or to run a suggested command on the user's behalf (clig.dev: guessing is dangerous for state changes).
- Whether to ship a support contact, bug-report URL or telemetry prompt in the message (clig.dev suggests a prefilled URL; this is a privacy and ownership decision).
- Minting a new public error code, changing an existing code's meaning, or changing exit codes: public contract; ask.
- Localisation: whether strings are translatable and into which languages (rustc uses Fluent `.ftl` files; the fleet's policy is not in the audits).

## AI-agent angle

| Characteristic mistake | Why an agent makes it | Smallest check |
|---|---|---|
| `catch (e) { showErrorMessage(e.message) }` or `Failed to ${verb}: ${err}` | shortest path; raw text is not a message | EM-1, EM-16: lint `showErrorMessage\(.*\b(e|err|error)\.message` and review |
| `Oops! Something went wrong. Please try again.` | the dominant training-set pattern | EM-4: `rg -i "(oops|something went wrong|please try again)"` |
| Invented cause: `Network error` for any thrown value | pads the "why" slot | EM-3: trace every cause clause to a checked condition |
| Suggested command or flag that does not exist (`ocx install ...`, `--force` on a command without it) | plausible by analogy | EM-6: run the suggestion with `--help` |
| `Did you mean` text with no prompt, or a fix presented as fact when `MaybeIncorrect` | copies rustc/clap wording without the applicability logic | EM-7; label guessed fixes "possible" |
| Next step stated as "contact support" with no contact | fills the slot | EM-2: next step must be an action available in the product |
| Resetting the form in the error handler | reuses the success path | EM-10 test |
| Logger call used as the user message (`logger.warn(...)` printed to terminal) | one string for both purposes | EM-13: grep default-verbosity stderr for timestamps and levels |
| Warning plus error for the same event; `info` line printed as `warning:` | defensive logging | EM-14, EM-18 |
| Three different prefixes in one binary (`error:`, `Error:`, none) | each file written in isolation | EM-5: one-prefix snapshot test |
| `Failed to X` with no object, or a path printed twice | template reuse | EM-1; `sort | uniq -d` per line |
| Claiming a plain-language grade limit | invents a number | the evidence has none; use sentence limits and read-aloud |

## Contested / evolving

1. **Where the code goes.** rustc puts it in the header (`error[E0382]:`); Spectrum says "Put error codes at the end of the message"; NN/g says show codes "for technical diagnostic purposes only". Position taken: header in CLI diagnostics (greppable), last in GUI text. Evolving: none dated.
2. **Where the key information goes.** clig.dev: "Put the most important information at the end of the output"; rustc and GNU: summary first. Position taken: both, via a self-contained first line and a `help:` last line (EM-5).
3. **"Did you mean".** rustc forbids it in diagnostic text ("Don't phrase suggestions as questions"); clig.dev shows `Did you mean ps? [y/n]` as an interactive prompt; gh, kubectl and terraform print it in plain output (measured). Position taken: statement in plain output, question only when a prompt follows.
4. **First-person plural.** Atlassian: use "you" so the message does not seem to hold the person responsible; Spectrum: "we" for the interface and "you" for the user; Polaris: avoid "we" unless Shopify caused it. Unresolved; brand decision.
5. **Apology.** Primer: "do not apologize too much", prefers `All checks failed` over `Sorry, all checks failed`; Atlassian: avoid "sorry"; Spectrum: reserve it for serious errors; NN/g #13: for catastrophic failures consider "blending an apology with something surprising or novel", while #8 says avoid humour. NN/g disagrees with itself.
6. **"Invalid".** GOV.UK and Polaris ban it; rustc's dev guide says "Don't use the word illegal. Prefer invalid"; cargo itself prints `invalid character` and `invalid empty port`. Position: avoid in GUI, acceptable in CLI diagnostics when followed by the specific rule (`invalid identifier 'X': must be lowercase`).
7. **Capitalisation.** rustc and GNU: lowercase start, no period (CLI); Primer and Apple: sentence or title case with periods for GUI sentences. Settled by surface.
8. **Length.** Atlassian gives numeric limits; Primer and GOV.UK give none; Spectrum says "keep messages concise". The limits are vendor-level and undated.
9. **LLM-rewritten errors.** Search results (not fetched in full) point to later work finding LLM-enhanced error messages ineffective in practice (arXiv 2409.18661); relevant if an agent rewrites messages at runtime. Unverified here.
10. **Fetch limits.** The Google "error-messages" unit fetched only as an introduction and the error-handling unit; the later content rules ("identify the error's cause") were not read. Elm's "Compiler Errors for Humans" did not load in the scout pass either.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://www.nngroup.com/articles/error-message-guidelines/ | NN/g 13 error message guidelines | 14 May 2023 | the common-reference baseline |
| https://rustc-dev-guide.rust-lang.org/diagnostics.html | rustc diagnostic wording, codes, suggestions, lints | live, fetched 2026-11-27 | the only fully specified diagnostic shape |
| https://devcenter.heroku.com/articles/cli-style-guide | Heroku CLI style guide | updated 31 Jan 2025 | named in commission; thin on errors, useful for streams and colour |
| https://clig.dev/ | Command Line Interface Guidelines | no date | the error section the commission relies on |
| https://design-system.service.gov.uk/components/error-message/ | GOV.UK error message component | latest change Jan 2024 | banned words, input retention, hidden prefix |
| https://primer.style/foundations/content | Primer content guidelines | no date | short error rules; shows no defined structure |
| https://www.oreilly.com/radar/?p=19843 | O'Reilly Radar, Pujari | 30 Sep 2026 | the FC27 source; contains no limit |
| https://atlassian.design/foundations/content/designing-messages/error-messages | Atlassian error messages | no date | the only numeric length limits |
| https://spectrum.adobe.com/page/writing-for-errors | Adobe Spectrum errors | no date | order, codes last, severity tone |
| https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html | WCAG 3.3.1 | updated 2 Nov 2026 | the legal-level floor for GUI text |
| https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html | WCAG 3.3.3 | updated 9 Mar 2026 | suggestions and their security exception |
| https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html | WCAG 3.1.5 | updated 28 Jun 2026 | the only formal reading-level standard |
| https://developers.google.com/tech-writing/error-messages and https://developers.google.com/tech-writing/error-messages/error-handling | Google tech writing course | no date | two questions; log and document codes |
| https://www.gnu.org/prep/standards/html_node/Errors.html | GNU Coding Standards, error message format | no date | `file:line: message`, lowercase, no period |
| https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/content/error-messages.mdx | Polaris error messages | repo HEAD, no date | the fallback message and good/bad pairs |
| https://developer.apple.com/tutorials/data/design/human-interface-guidelines/alerts.json | Apple HIG alerts | no date | titles and button label rules |
| https://doc.rust-lang.org/error_codes/E0382.html | rustc error index entry | live | a model explain page |
| https://www.microsoft.com/en-us/research/publication/how-should-compilers-explain-problems-to-developers/ | Barik et al., FSE 2018 | Nov 2018 | independent evidence: resolution beats structure |
| https://iticse19-wg10.github.io | Becker et al., ITiCSE 2019 working group | 2019 | the error-message literature map |
| `/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/cli-first-run.md` | fleet audit, 20 ocx and grim errors | 2026-11-27 | the fleet baseline and the `ocx install` defect |

## Appendix: scored outputs

Row format: command, then W Y N I. Scratch directory `~/.cache/research-lang/exemplars/product/err-anatomy/work`; `UV=/home/mherwig/dev/ocx-sh/grimoire-lore/.ocx/toolchain/links/default/uv/content/uv`. The raw output files were removed by a concurrent process before this file was written; rerun the commands to re-read. Rerun recipe per row: `cd <scratch> && HOME=<isolated> NO_COLOR=1 timeout 40 bash -c "<command>" 2>&1 </dev/null | head -c 900 | head -8`, then score W, Y, N, I from the legend in finding 2. Scores are the researcher's reading, so a rerun can differ by a few cells; the raw text is not archived (the scratch directory is gone). The one cell group re-verified after the loss is the cargo flag-typo behaviour quoted in finding 7.

**cargo** (setup: `c1` has dependency `nosuchcrate_zzz`, `c2` moves a value, `c3` has a broken `[package`): `cargo bild` y p y y; `cargo --offline build --manifest-path c1/Cargo.toml` y y y y; `... c3/Cargo.toml` y p p y; `... nonexist/Cargo.toml` y n n y; `... c2/Cargo.toml` y y y y; `cd /; cargo build` y p n -; `cargo run --bin nosuch` y p y y; `cargo add --offline nosuchzzz` y n n y; `cargo build --release --debug` y y y y; `cargo test --package nosuch` y n n y; `cargo install --offline nosuchzzz` y p n y; `cargo new 1bad/` y y y y; `cargo publish --offline` y p n p; `cargo build --target nosuch-target` y y y y; `cargo remove nosuchzzz` y n n y; `cargo update --offline -p nosuch` y n n y; `cargo init /nonexistent/zzz/q` y y n y; `cargo fmt --check` (broken manifest) y y n y; `cargo clean` (broken manifest) y p p y; `cargo metadata --offline` y y y y.

**gh** (empty git repository, `GH_TOKEN=invalidtoken`): `gh pr lis` y p y y; `gh pr view` y p n -; `gh issue create` y y y -; `gh pr checkout` y y y -; `gh repo create` y y y -; `gh api` y n n -; `gh secret set` y n p -; `gh run view abc` y y n -; `gh pr merge` p p n -; `gh label create` y y y -; `gh release create` y y y -; `gh pr list --state nosuch` y y y y; `gh alias set` y n n -; `gh repo fork` y p n -; `gh ssh-key add nonexist.pub` y y n y; `gh gist create nonexist.txt` y p n y; `gh repo view cli/cli-zzz-none` y y y -; `gh pr list -R notaslug` y y y y; `gh api /nonexistent` y p n n; `gh auth status` y y n -. An earlier run with no token printed the same two-line `To get started with GitHub CLI, please run: gh auth login` message for 17 of 20 commands and was replaced.

**terraform** (one `.tf` file per directory `t1` to `t12`): `terraform plan` (no config) y y y -; `terraform plann` y p y y; unclosed block y y p y; unknown provider `nosuch` y y p y; undeclared variable y y y y; `terraform apply` (no config) y y y -; `-chdir=nonexist plan` y y n y; `terraform import a.b c` (no config) y y y y; `workspace select nosuch` y y y y; `fmt nonexist.tf` y p n y; `show nonexist.plan` y y n y; `plan -var x` y y y y; `required_version = "> 99"` y y y y; `resource "a" "b" { count = "x" }` y y y y; `apply -var x=abc` (number variable) y y p y; undeclared local y y p y; unknown backend block y y y y; `module source = "./nonexist"` y p n y; single-line block syntax y y y y; `tonumber("x")` y y n y. Excluded as non-errors (exit 0): `init` in an empty directory, `destroy`, `state list`, `get`, `providers lock`; `terraform output` is a warning.

**kubectl** (no cluster, empty `KUBECONFIG`): `get pod` y p p y; `gett pods` y p y y; `get nosuchres` p p p n; `apply -f nonexist.yaml` y p n y; `apply` y y y -; `delete pod` p p p n; `logs` y y y -; `config use-context nosuch` y y n y; `--context nosuch get pods` y y n y; `exec` y y p -; `create deployment` y p y -; `scale --replicas=x deploy/a` y p p y; `describe` y y y -; `rollout status` y p n -; `get pods --output=nosuch` p p p n; `apply -f bad.yaml` y y n y; `run` y p y -; `port-forward` y y p -; `--kubeconfig nonexist get pods` p y n y; `label pod` y y p -.

**uv**: `$UV pip instal` y p y y; `add requests` y p n -; `run nosuchscript.py` y y n y; `pip install --offline nosuchpkgzzz` y y y -; `python install 1.2` y p n y; `sync` y p n -; `venv --python 2.0` y y n y; `lock` y p n -; `run --python 9.9 python -c 1` y y y y; `tool run nosuchtoolzzz` y y n y; `tool install --offline nosuchzzz` y y p y; `pip install -r nonexist.txt` y p n y; `init /proc/zzz/x` y y n y; `build` y y n y; `publish nonexist.whl` y p n n; `remove nosuchzzz` y p n -; `export` y p n -; `pip uninstall nosuchzzz` y y y -; `tree` y p n -; `self update --offline` y y p -.

**deno**: `deno rnu x.ts` y n n y; `run nonexist.ts` y p n y; `check` (type error) y y n y; `run` (uncaught `throw`) y y n y; `run` (missing import) y p n y; `run` (missing npm package) y y n y; `run` (read without permission, nonexistent path) y y y y; `run` (read without permission, `/etc/hostname`) y y y y; `run` (no arguments) y y y -; `task x` (invalid `deno.json`) y y n y; `task nosuch` (no config) y y p n; `test nonexist_test.ts` y p n y; `lint nonexist.ts` y n n n; `fmt --check nonexist.ts` y n n n; `add nosuchpkgzzz` y p n y; `compile nonexist.ts` y p p y; `eval 'syntax error here'` y y n y; `upgrade --version nosuch` y y y y; `run --allow-net=:` y y n y; `doc nonexist.ts` y p n y. Excluded as non-error: `deno install` with no arguments exits 0.

Totals reproduce with a short tally over these row codes; the table in finding 2 is that tally.
