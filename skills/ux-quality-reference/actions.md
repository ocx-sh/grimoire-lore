---
title: Consequential actions - the tier scale, the inventory and GUI confirmation
summary: The UX-ACT classification and GUI rows - the T0 to T3 tier scale every surface cites, the action inventory, the Consequence help line, undo before confirmation, confirmation wording and default focus, modals, exact content, live and test modes, and typed names
---

# Consequential actions: tiers, inventory and GUI confirmation

Owns UX-ACT-01 to 11. UX-ACT-01 holds the tier scale (T0 to T3) and the action inventory that the CLI and agent surfaces cite. This file covers the classification rows and what a person sees in a GUI: when a confirmation exists, what it says, which control has focus, and when a modal is allowed. Not here: a CLI command's refusal, dry run and report (UX-ACT-12 to 17, the `ux-cli` skill); an agent tool call's approval, annotations and boundaries (UX-ACT-18 to 28, the `ux-agent-interfaces` skill); exit-code classes and the error envelope (the language CLI-contract rules and `ux-agent-interfaces`); non-modal notices (the UX-STATE rows); dialog ARIA mechanics beyond what a confirmation needs (the UX-A11Y rows).

Contents: [Dates and versions](#dates-and-versions) · [Variables](#variables) ·
[The tier scale](#the-tier-scale) · [Treatment by tier and initiator](#treatment-by-tier-and-initiator) ·
[Rows](#rows) · [Checks](#checks) · [Ask the owner](#ask-the-owner) ·
[Documented gaps](#documented-gaps) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and versions

Sources fetched 2026-11-27 unless a row gives another date. These pages are guidance, not law, except WCAG 2.2.

| Fact | Source and date | Re-check |
|---|---|---|
| Confirm only serious consequences, prefer undo, name the object, no Yes or No pair | [NN/g confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/), 2018-02-18, reviewed 2026-08-07 | every 24 months |
| Success Criterion 3.3.4: a submission is reversible, checked or confirmed | [WCAG 2.2 Understanding 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html), updated 2025-09-16 | every 24 months; watch WCAG 3 |
| Esc closes a dialog; focus starts on the least destructive control | [APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), undated | every 24 months |
| A VS Code modal is for a message that needs a response, not for one the user did not start | [VS Code notifications guideline](https://code.visualstudio.com/api/ux-guidelines/notifications), 2026-11-25 | every 3 months (monthly releases); re-read the page |
| `isCloseAffordance` marks the item "triggered when the user cancels the dialog" | [vscode.d.ts on main](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts), fetched 2026-11-27 | every 3 months |
| Typed object name for a severe action; `--confirm` shape | [clig.dev](https://clig.dev/), undated | every 12 months |
| A typed repository name, and some repositories restorable within 90 days | [GitHub: deleting a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository), vendor docs | every 12 months |
| Live and test modes isolated by key | [Stripe test mode](https://docs.stripe.com/test-mode), vendor docs | every 12 months |
| A generic prompt, live and test in one menu, 38 minutes to correct | [FCC report on the Hawaii false alert](https://docs.fcc.gov/public/attachments/DOC-350119A1.pdf), April 2018; [Raskin, 2007-07-21](https://alistapart.com/article/neveruseawarning/); [GOV.UK button](https://design-system.service.gov.uk/components/button/), Jul 2026 | historical, no refresh |

`unverified:` what a VS Code native modal returns on Esc when no item carries `isCloseAffordance`, and which button it focuses first. No source states either, and no run measured them.

**Pinned conventions** (defaults an adopter overrides once): the inventory file `docs/consequential-actions.md`, the `Consequence: ` help label, the tier names T0 to T3, and "fewer than five T3 actions per product". None has an external source. They are fixed so that each check is binary.

## Variables

`CHECKS` is `.claude/skills/ux-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/ux-quality-reference/checks` when installed globally). `CLI` is the command under review, `TOOL` an MCP tool name, `BASE` the merge base of the change. The scanner runs as `python3 -I "$CHECKS"/actions_scan.py`. A git-fed list that prints nothing runs nothing under `xargs -r` and reads as a pass, so run the list command alone once and confirm it prints files.

## The tier scale

One scale for every surface. The tier follows what the action destroys or exposes, never its verb or its surface. When the tier is unclear, take the higher one and ask the owner.

| Tier | Consequence test | Examples |
|---|---|---|
| **T0 Reversible** | One action in the product undoes it, or it can be rebuilt from declared state (lock file, manifest, registry) | Uninstall a reinstallable package; remove a saved alias; unset a config key; switch a replacement the user can switch back |
| **T1 Lossy** | Destroys local data that cannot be rebuilt, overwrites a file the user edited, or changes shared state that others read | Install over local edits; overwrite a generated config; a force-clean that drops pins other projects hold |
| **T2 External** | Visible to or acting on people or systems outside the user's control, and not retractable without trace: publish, move a published tag, post publicly, send, pay, issue or revoke a credential | Publish a release; move a tag every consumer pulls; submit a public vote |
| **T3 Catastrophic** | Irreversible and bulk or cascading: delete a repository, account, organisation or whole store, or anything targeting "all" | Delete an organisation; wipe a registry |

Who starts the action changes who must consent. It does not change the tier. A click or a typed command is the person's consent for a T0 action. An agent call carries no consent of its own: the person gives it beforehand, as an exact-name allow rule inside a sandbox (T0 only) or per call (T1 and above). A read is not an action, with one exception for agent tools: a read that sends model-chosen data to a host outside the declared scope counts as T1, because it is the exfiltration leg of the lethal trifecta ([Willison, 2025-06-16](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)).

## Treatment by tier and initiator

| Tier | GUI click | CLI, person or script | Agent call |
|---|---|---|---|
| T0 | No dialog. The result notice names the object and carries Undo or a re-do action | No prompt. Prints what changed. `--dry-run` optional | May be pre-approved by an exact-name allow rule inside a sandbox |
| T1 | Confirmation naming the object and what is lost, or a real undo window (trash with restore) | Refuses by default: the safe step, then `--force` with its consequence. `--dry-run` required | Per-call approval showing exact arguments. The agent never adds the override flag on its own |
| T2 | Modal showing the exact content and destination, and a documented correction path | As T1, plus an explicit target argument and a dry run that prints the remote destination | Per-call approval every time. No session or "always" rule may cover it |
| T3 | As T2, plus a typed object name and a recovery window where the platform allows one | As T2, plus the typed name or `--confirm=NAME`. `--yes` or `--force` alone never suffices | Never exposed as a tool. The agent prints the command for the person to run |

## Rows

Severity: MUST blocks the change. SHOULD warns, and passing needs a recorded reason. A row with two severities applies each to the clause it names. A format marked "house convention" has no external source.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-ACT-01 | List every state-changing action in one inventory file per repository, `docs/consequential-actions.md` or the location the repository already uses for contributor docs. Cover GUI actions, CLI commands and flag combinations, and agent tools. Each row gives the tier (T0 to T3), how the action is reversed, and its treatment from the matrix above. Assign the tier by the consequence test, not by the verb. When unsure, take the higher tier and ask. | Every treatment rule keys on the tier. An untiered action gets the model's habit, a generic "Are you sure?". A verb filter misses actions such as `rate`, `export`, `lock` and `hook revoke`. | List every action with no verb filter and require a row for each. A non-mutating entry gets tier `read`. Flag combinations that change the tier (`--force`) get their own rows. See block UX-ACT-01. A new action in a diff without an inventory row fails. | MUST |
| UX-ACT-02 | In the long help of every T2 and T3 CLI command, and in the description of every T2 tool, state the irreversible consequence in words on one line that starts `Consequence: `, for example `Consequence: moves the tag for everyone who pulls this version.` Do not use a tier code. For a T2 or T3 flag combination, the line sits in that flag's help. | Agents and people read help before they act, and an irreversible effect is part of the user contract. The label is a house convention: it stops a keyword such as "public registry" from passing the check by accident. | See block UX-ACT-02: each T2 or T3 inventory row prints at least 1. Pass: `Consequence: moves the tag for everyone who pulls this version.` Fail: a help that only says "Push to the public registry". | MUST |
| UX-ACT-03 | Never add a confirmation to a T0 action. Its result notice names the object and offers Undo or a re-do action, and the notice holds the data that re-doing needs (the removed alias and URL, the uninstalled reference and scope). | Confirmations on routine actions train people to click through ([NN/g](https://www.nngroup.com/articles/confirmation-dialog/); [Raskin](https://alistapart.com/article/neveruseawarning/)). | See block UX-ACT-03: every hit maps to a T1 or higher inventory row. Each T0 handler's success notice passes an action item (`showInformationMessage(msg, 'Install again')`). Pass: "Uninstalled `x`" with [Install again]. Fail: a modal before uninstalling a reinstallable artifact. | MUST |
| UX-ACT-04 | A T1 or higher GUI action awaits the confirmation result before it mutates. Dismissal (Esc, close, `undefined`) means cancel. Test the result against the confirm label only (`choice === 'Overwrite'`), never as "not No" (`choice !== 'No'`, `!== 'Cancel'`). | A "not No" test lets any unexpected result proceed. Comparing against the confirm label is safe whatever Esc returns, which no source settles for a VS Code modal. The await and the verb label are habits a model already has. The MUST is the scan and the test. | `python3 -I "$CHECKS"/actions_scan.py --only act04` over the source files prints nothing. A unit test resolves the dialog with `undefined` and asserts the mutation was not called. | MUST |
| UX-ACT-05 | MUST: no confirmation call site uses `OK`, `Yes`, `Confirm` or `Continue` as the confirm label, or "Are you sure" or "Do you want to continue" in its message. SHOULD: the message names the object, the outcome and, for a bulk action, the count, and the confirm label is a sentence-case verb that names the action (`Overwrite`, `Delete account`). | The Hawaii alert prompt was "Are you sure that you want to send this Alert?", identical for test and live. A scan also catches a component default such as `confirmLabel = 'Confirm'`. A model already names the object and uses a verb label, so only the scan is MUST. | MUST: `python3 -I "$CHECKS"/actions_scan.py --only act05` over call sites and shared dialog components prints nothing. SHOULD: a test asserts the object identifier appears in the message or `detail`. | MUST for the banned strings; SHOULD for the rest |
| UX-ACT-06 | A shared confirmation component has no default confirm label: `confirmLabel` is required. It offers a destructive style that pairs the verb label with an icon or text, not colour alone, and the style's colours resolve to theme tokens, not literals. | A component default of `Confirm` writes the generic label into every call site an agent generates. | `python3 -I "$CHECKS"/actions_scan.py --only act06` prints nothing, and the prop type declares `confirmLabel: string`. The variant type lists a destructive member. See block UX-ACT-06 for the token check (CSS-TOK-01 owns the token rule). | MUST |
| UX-ACT-07 | MUST, in a DOM dialog: the destructive control is never the initial focus or the Enter default. Focus starts on the cancel control or the dialog title. SHOULD, for a T1 or higher VS Code native modal where the framework fixes focus: check that pressing Enter at once after the modal opens does not run the mutation, and record the result in the inventory row. | APG advises focus on "the least destructive action", and NN/g says no default may be best. Which button a VS Code modal focuses first was not sourced and not measured, so no MUST can be stated for it. | MUST: a DOM test asserts that `document.activeElement` after open is the cancel control or an element with `tabindex="-1"`. SHOULD: see block UX-ACT-07. A mutation that ran means the destructive item is the default: ask the owner. | MUST for DOM dialogs; SHOULD for VS Code native modals |
| UX-ACT-08 | In VS Code, use `{ modal: true }` only for (a) a T1 or higher action the user started, or (b) a consent gate for a write or public effect triggered from outside the UI (a URI handler, a link, an agent). Never use a modal for a message that needs no decision. | The VS Code guideline rules out modals for messages that need no response. Case (b) is the exception: a toast with an Add button can be clicked later, out of context, on attacker-supplied values, and no source offers a safer equivalent. | See block UX-ACT-08: each hit carries an inventory row naming (a) or (b). A modal whose only buttons are informational (`Copy`, `Show Output`) fails. | MUST (VS Code) |
| UX-ACT-09 | A T2 confirmation shows the exact content and destination, built from resolved values (URL, scope, host, reference, message body), not from a paraphrase of untrusted input. It offers no "don't ask again" option. The action has a documented correction or retraction path before it ships. | The Hawaii prompt did not show the message, and the correction took 38 minutes. | A test asserts the resolved values appear in the dialog `detail`. See block UX-ACT-09 for the "don't ask again" scan. The inventory row names the correction path. | MUST |
| UX-ACT-10 | When a product has live and test modes, separate them by environment: distinct credentials or keys, no single control that lists both, a persistent visual cue in the non-live mode, and confirmation text that names the mode. Test messages never reuse live wording. | Hawaii's live and test alerts sat in one drop-down. Stripe isolates the two modes by key. Demoted from MUST: "no single control lists both" has no generic pattern. | See block UX-ACT-10: a live endpoint rejects a test key and the reverse (both requests fail with an auth error), and fixtures hold no "not a drill" or "real world" string. The single-control check is reading, `unverified: reading heuristic`. | SHOULD |
| UX-ACT-11 | A T3 GUI action requires the user to type the object's name, not the word DELETE. The button stays disabled until the text matches, and a recovery window is offered where the platform allows one. Keep the T3 list under five actions per product. | Typing the name forces a read of which object is affected. Raskin argues such effort distracts and does not reliably prevent loss, so the typed name is kept rare, limited to T3, and paired with a recovery window. | A test types a wrong name and asserts the button stays disabled. The inventory has fewer than five T3 rows. | SHOULD |

## Checks

```sh
# UX-ACT-01 source 1: every leaf command of a clap-style help tree, no verb filter.
# Change the 'Commands:' heading to your framework's own help layout.
walk() { "$@" --help | sed -n '/^Commands:/,/^$/p' | awk 'NR>1 && NF {print $1}' | grep -v -x help | while read -r s; do if "$@" "$s" --help 2>/dev/null | grep -q '^Commands:'; then walk "$@" "$s"; else echo "$* $s"; fi; done; }
walk "$CLI" > listed.txt
# UX-ACT-01 source 2: MCP tool names from a saved tools/list, taken with and without each write flag
jq -r '.result.tools[].name' tools.json >> listed.txt
# UX-ACT-01 source 3: a VS Code extension's commands and every webview message label, plus each URI handler path
jq -r '.contributes.commands[].command' package.json >> listed.txt
git grep -l -z -e onDidReceiveMessage -- ':(glob)src/**/*.ts' \
  | xargs -0 -r awk '/switch \(message\.type\)/ { match($0, /^ */); pad = substr($0, 1, RLENGTH); on = 1 } on && $0 == pad "}" { on = 0 } on' \
  | grep -o -E "case '[A-Za-z-]+'" | cut -d"'" -f2 >> listed.txt
# UX-ACT-01 diff: the first column of each inventory table row is the action name as listed. Any output is a missing row.
sort -u listed.txt > listed.sorted
awk -F'|' '/^\|/ { s = $2; gsub(/^[ `]+|[ `]+$/, "", s); print s }' docs/consequential-actions.md | sort -u > inventory.sorted
comm -23 listed.sorted inventory.sorted
```

```sh
# UX-ACT-02, CLI: the number printed is the count of Consequence lines; at least 1 is the pass
"$CLI" "$CMD" --help | grep -c -E '^ *Consequence: .{10,}'
# UX-ACT-02, MCP tool: at least 1
jq -r --arg t "$TOOL" '.result.tools[] | select(.name == $t) | .description' tools.json | grep -c '^Consequence: '
# UX-ACT-03: a dialog added in the diff; each hit maps to a T1 or higher inventory row
git diff -U0 "$BASE" | grep -E -e '^\+.*(modal: true|ConfirmDialog|AlertDialog|window\.confirm\(|[^.A-Za-z]confirm\()'
```

```sh
# UX-ACT-04, 05, 06: the scanner takes a git-fed file list. Any output is a finding, exit 1.
git ls-files -z --cached --others --exclude-standard -- ':(glob)src/**/*.ts' ':(glob)src/**/*.tsx' ':(glob)src/**/*.vue' ':(glob)src/**/*.svelte' ':(glob)src/**/*.astro' ':(exclude,glob)**/test/**' \
  | xargs -0 -r python3 -I "$CHECKS"/actions_scan.py --
# UX-ACT-06 token check: the destructive variant block holds no literal colour. Adapt the range pattern to the component's selector.
awk "/data-variant='destructive'/,/}/" "$BUTTON_CSS" | grep -E -e '#[0-9a-fA-F]{3,8}' -e 'rgb\(' -e 'hsl\(' -e 'oklch\('
```

```sh
# UX-ACT-07, VS Code native modal, Enter on open. Run in the Extension Development Host, in the test workspace.
find . -type f -exec sha256sum {} + | sort > before.txt
# Now open the modal, press Enter with no other key, and let it close. Then:
find . -type f -exec sha256sum {} + | sort > after.txt
diff before.txt after.txt
# UX-ACT-08: each hit needs an inventory row naming (a) or (b)
git grep -n -F -e 'modal: true' -- ':(glob)**/*.ts' ':(exclude,glob)**/test/**'
# UX-ACT-09: no "don't ask again" in a T2 handler. Any hit is a finding.
git grep -n -e dontAskAgain -e rememberChoice -- ':(glob)src/**/*.ts' ':(glob)src/**/*.tsx'
# UX-ACT-10: fixtures hold no live wording. Any hit is a finding.
git grep -n -i -E -e 'not a drill' -e 'real world' -- test fixtures
```

## Ask the owner

- The tier of any action that involves money, a legal commitment, public speech, other people's data or other users' access, and any T1 or T2 case the consequence test does not settle. Use the higher tier meanwhile.
- Removing an existing confirmation. It reverses a past decision.
- The final wording of any dialog that states a legal, consent or privacy consequence.
- Whether a modal that runs the destructive item on Enter should be reordered, given a close-affordance cancel item, or accepted (UX-ACT-07).
- Retention and recovery windows for a T3 action.

## Documented gaps

- A VS Code modal's default focus and its Esc result are unmeasured. A measurement in the Extension Development Host would let the VS Code clause of UX-ACT-07 become MUST.
- Apple HIG and Material 3 guidance on the default button and the destructive style was not read: both pages returned no body.
- The order of the failures in the last section is a judgement. No agent transcripts were counted.
- UX-ACT-10 was never run: no measured product has two modes.

## What Agents Get Wrong Here

1. **Skip the inventory and tier by verb.** Every other rule then keys on a guess (UX-ACT-01).
2. **Write the generic dialog.** `confirm('Are you sure?')`, an OK and Cancel pair, or a component default of `Confirm` (UX-ACT-05, UX-ACT-06).
3. **Add a modal to a reversible action** or to an informational message, instead of a notice with Undo (UX-ACT-03, UX-ACT-08).
4. **Test `choice !== 'No'`**, so Esc and any unexpected value proceed (UX-ACT-04).
5. **Make the destructive button primary, focused or bound to Enter** (UX-ACT-07).
6. **Paraphrase untrusted input** in a T2 dialog, or offer "don't ask again" (UX-ACT-09).
7. **Type the word DELETE** instead of the object's name (UX-ACT-11).
8. **Write a tier code in help** ("T2") instead of a `Consequence:` sentence (UX-ACT-02).
9. **Read "a click is consent" as covering an agent call.** The tier is the same and the consent is not (the treatment table).
