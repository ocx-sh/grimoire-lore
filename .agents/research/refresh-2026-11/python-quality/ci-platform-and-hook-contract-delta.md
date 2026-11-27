---
title: python-quality delta, CI platform, zizmor and Claude Code hooks contract
pair: python-quality
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 14
---

# Delta: CI platform, zizmor, hooks contract (2026-08-23 to 2026-11-27)

## Summary

- Result: no claim at risk is contradicted. One hooks-contract item needs owner attention (see 3.2). One claim (PY-TEST-08 cancelled-on-timeout) could not be verified from any official page.
- Coverage limits: the GitHub changelog label page was read by title only (bodies not read). The Claude Code changelog is 1.4M characters; only the newest ~200k characters (versions 2.1.323 to 2.1.332, 12 to 25 Nov 2026) were read. Entries from 23 Aug to 11 Nov 2026 were NOT read. The hooks page was read in full only for 0 to 200k of 301k characters.

## 1. GitHub Actions platform

| Claim | Status | Evidence |
|---|---|---|
| PY-TEST-07, default six hours | unchanged | The workflow-syntax page states for `jobs.<job_id>.timeout-minutes`: "Default: 360". If the value exceeds the runner's job execution limit the job is cancelled at that limit. [workflow-syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) |
| PY-TEST-08, a job killed by `timeout-minutes` reports as cancelled; `if: always()` is the correct guard | could not determine (the guard half is unchanged) | The expressions page says `always()` "returns true, even when canceled", and `cancelled()` "returns true if the workflow was canceled". It does not say whether a job timeout counts as cancelled. The workflow-cancellation page does not mention `timeout-minutes`. The `always()` recommendation holds regardless, and the docs themselves warn that `always()` on setup steps can hang until timeout. [expressions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions), [workflow-cancellation](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation). Only a deliberate hanging-job test would settle the "reports as cancelled" wording. |
| PY-GATE-02, `gh api repos/OWNER/REPO/rules/branches/main --jq '.[].type'` and `required_status_checks` | unchanged | The REST page for `GET /repos/{owner}/{repo}/rules/branches/{branch}` returns an array of rule objects with a required string `type`. The `required_status_checks` type name is unchanged. The page was read via a summarizer and the branch endpoint schema is generic, so the per-rule enum was taken from the rulesets definitions. [REST rules](https://docs.github.com/en/rest/repos/rules) |

Window changelog entries that touch Actions (titles only, from [github.blog/changelog/label/actions](https://github.blog/changelog/label/actions/)), none about timeout defaults, cancellation, or required-check rule names:
- 2026-10-14 workflow lockfiles in public preview; 2026-10-28 generally available.
- 2026-11-02 `pull_request_target` blocked by default in public repos from 2026-12-02 (brownouts 9 and 16 Nov).
- 2026-10-01 Actions retention now covers checks, runs and statuses (body not read; not believed to change rule types).

### PY-GATE-06 and SHA pinning: changed context, rule text stays valid

GitHub did not start enforcing SHA pinning on `uses:`. Workflow lockfiles (`.github/workflows/actions.lock`, created with `gh actions-lock`) are an optional alternative: tags or branches stay readable in the workflow while the lockfile fixes the executed commits. Admins may enable a "Require lockfile" policy. Source: [changelog 2026-10-28](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/). Effect on PY-GATE-06: the SHA-pin rule remains the zero-dependency, correct default. A repo that adopts lockfiles may legitimately hold floating refs, so the grep would false-positive there. Candidate note, owner decision: mention lockfile-onboarded workflows as a stated exception. I did not find an immutable-actions enforcement entry; the security label page returned 404, so that negative is unverified.

## 2. zizmor (corpus era 1.29.0, now 1.33.1)

Source: [zizmor releases](https://github.com/zizmorcore/zizmor/releases), [usage](https://docs.zizmor.sh/usage/), [audits](https://docs.zizmor.sh/audits/). Releases in window: 1.30.0 (30 Aug), 1.30.1 (9 Sep), 1.31.0 and 1.31.1 (15 Oct), 1.32.0 (2 Nov), 1.33.0 and 1.33.1 (22 Nov). The releases page shows no year; years are inferred from the window.

| Claim | Status | Evidence |
|---|---|---|
| `zizmor --format plain .github/workflows` | unchanged | `plain` is the default format and still accepted. 1.32.0 made input collection root-aware, so `zizmor .` skips files Actions would not use; passing `.github/workflows` explicitly is unaffected. Exit codes: 0 clean, 11 to 14 findings by severity, 1 error, 3 no inputs. |
| `template-injection` audit name | unchanged (behaviour widened) | Name current. 1.32.0 now also flags attacker-controllable contexts inside `fromJSON(...)` and `case(...)`. Its auto-fix is unsafe-only, not applied by plain `--fix`. |
| `unpinned-uses` behaviour | unchanged | Default is a blanket hash-pin policy for all actions (since 1.20.0, so already true in the 1.29.0 era). 1.29.0 extended it to Git-style `uses:`. Fix is marked partial. |
| open question, may `zizmor --fix safe` run unattended | still open, now better evidenced | Docs: `--fix` defaults to safe; safe fixes are "safe to apply with minimal human oversight due to their low breakage risk"; unsafe ones need manual review; format preservation "is ultimately a heuristic". Not stated as unattended-safe. 1.30.1 fixed a bug where `self-repository` fixes were wrongly marked safe, so safe-tier mislabelling has happened. Both `template-injection` and `unpinned-uses` fixes are not in the safe tier, so `--fix safe` would not repair the two audits PY-GATE-05/06 care about. Recommend: review the diff, do not run unattended. |

New audits that may matter to a Python workflow check: `self-repository` (1.30.0), `dangerous-checkout` (1.33.0). `dangerous-triggers` now treats `issue_comment` as dangerous (1.31.0), which may add findings to a previously clean run. Experimental workflow lockfile support arrived in 1.32.0 (matches the GitHub feature).

## 3. Claude Code hooks contract

Sources: [hooks docs](https://code.claude.com/docs/en/hooks), [changelog](https://code.claude.com/docs/en/changelog).

### 3.1 Exit codes: unchanged
The docs still state: exit 2 is the blocking error on blocking events (PreToolUse blocks the call); any other code including 1 is a non-blocking error and the action goes ahead; "Exit code 1 without valid JSON output is a non-blocking error ... If your hook is meant to enforce a policy, use `exit 2`." This matches the Exit-Code Table sentence "only a literal `2` blocks". The newest changelog slice I read has no exit-code semantics change.

### 3.2 `permissionDecision`: unchanged, with additions to flag for the owner
- `hookSpecificOutput.permissionDecision` is the current PreToolUse field, with values `allow`, `deny`, `ask`, `defer` (precedence deny > defer > ask > allow). Top-level `decision`/`reason` are deprecated for PreToolUse; `approve` and `block` map to `allow` and `deny`. The corpus claim stands.
- Additions seen in the changelog (not contradictions, but near the pinned contract, MARK FOR OWNER, table not reworded):
  - 2.1.328 (2026-11-19): `"onFailure": "block"` is available for command, HTTP and mcp_tool hooks, so a hook that fails can now be configured to block. Default stays non-blocking. 2.1.329 confirms a PreToolUse hook that errors does not refuse by default in Code Mode.
  - 2.1.326 (2026-11-16): "a hook's `"decision": "block"` hold[s] in more cases, so a hook that always prints one may start blocking calls". Not about exit codes.
  - 2.1.326: improved error when a PreToolUse hook exits 127.
  - 2.1.332 (2026-11-25): new `PreSkillShellCommand` event.
- PY-CLI-07 (top-level `except Exception`, hooks must exit 0): rationale stands. With `onFailure: "block"` configured, an uncaught exception (exit 1) would block; without it, exit 1 is still silently non-blocking. This strengthens rather than weakens the rule. Entries between 2026-08-23 and 2026-11-11 were not read, so an earlier contract change cannot be excluded.

## Normative guidance candidates

1. Rule: in PY-GATE-06, state that a workflow onboarded to a workflow lockfile may carry tag refs. Rationale: lockfiles GA 2026-10-28 pin the executed commit. Verify: `test -f .github/workflows/actions.lock` before applying the floating-ref grep. Owner decision, optional.
2. Rule: do not run `zizmor --fix` unattended. Rationale: safe-tier mislabelling fixed in 1.30.1 and the two audits at issue have no safe fix. Verify: grep CI files for `zizmor.*--fix` (any hit is a finding).
3. Rule: for PY-TEST-08 keep the `always()` guard; soften "reports as cancelled" unless tested. Verify: a throwaway workflow with `timeout-minutes: 1` and `sleep 120`, then read the job conclusion and whether an `if: always()` upload ran. Owner decision.

## AI-agent angle
- Agents write `if: success() || failure()` or `!cancelled()` for uploads. Check: grep as in PY-TEST-08 (1).
- Agents assume exit 1 blocks a hook. Check: grep hook scripts for `sys.exit(1)` in a PreToolUse handler.
- Agents assume `--fix` is harmless. Check: item 2.

## Contested / evolving
- Lockfiles versus inline SHAs (trend: both accepted, as of 2026-10-28).
- Hooks fail-open versus `onFailure: "block"` (trend: opt-in fail-closed, as of 2026-11-19).

## Sources
| URL | What | Date | Why |
|---|---|---|---|
| https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | timeout-minutes default 360 | current | PY-TEST-07 |
| https://docs.github.com/en/actions/reference/workflows-and-actions/expressions | status functions | current | PY-TEST-08 |
| https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation | cancellation semantics | current | PY-TEST-08 |
| https://docs.github.com/en/rest/repos/rules | branch rules endpoint | current | PY-GATE-02 |
| https://github.blog/changelog/label/actions/ | changelog titles in window | 2026-10 to 11 | window scan |
| https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/ | lockfiles GA | 2026-10-28 | PY-GATE-06 |
| https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2/ | pull_request_target default block | 2026-11-02 | context |
| https://github.com/zizmorcore/zizmor/releases | releases 1.29.0 to 1.33.1 | 2026-08 to 11 | zizmor delta |
| https://docs.zizmor.sh/usage/ | formats, --fix, exit codes | current | PY-GATE-05 |
| https://docs.zizmor.sh/audits/ | template-injection, unpinned-uses | current | PY-GATE-05/06 |
| https://code.claude.com/docs/en/hooks | exit codes, permissionDecision | current | table |
| https://code.claude.com/docs/en/changelog | hook entries 2.1.323 to 2.1.332 | 2026-11-12 to 25 | contract delta |
