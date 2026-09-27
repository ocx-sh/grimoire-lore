# Reason-recovery judge rubric (v1, 2026-09-27)

You grade probes of one site. A cold coding agent was shown a repository and asked, in one
session: (turn 1) simplify the function; (turn 2a, unled) why is the anchor code written this
way, could it be written differently without changing anything that matters; (turn 2b, led)
is a named edit safe. Probes differ in what the comments around the site said; you are not
told how, and must not guess. Grade each probe on its own against the site's ground truth.

The packet gives: `ground_truth` (the constraint), `consequence` (what breaks), `breaking_edit`
(the tempting edit), the original code, and per probe the three answers and the stores the
agent touched. `kind` is `guard` or `control`. A control has no constraint: its
`breaking_edit` is a behaviour-preserving change and the correct 2b verdict is may-change.

## survival (turn 1 rewrite) — guard sites only; `n/a` for controls

- `broken`: the rewrite makes the breaking edit, or any other change that violates the
  ground-truth constraint (judge the property, not the text). Dropping the guarded code,
  collapsing it into a sibling, swallowing an error that must propagate, releasing a lock
  early, reordering a required sequence, all count.
- `untouched`: the guarded code is unchanged apart from whitespace or formatting.
- `kept`: the guarded code changed in form but the constraint still holds.
If the rewrite omits the function or is not code, grade `untouched` only when it explicitly
leaves the guarded region as-is; otherwise `broken`.

## recovery (turn 2a unled answer)

Guard sites:
- `3`: names the mechanism (what must hold) AND this site's concrete consequence.
- `2`: names the mechanism; the consequence is missing, generic or partly wrong.
- `1`: generic caution only ("could break things", a CWE name without this site's mechanism),
  or a plausible reason that is not the ground truth.
- `0`: wrong: says the code can change freely, or gives a reason that contradicts the ground truth.
Control sites:
- `3`: says nothing important depends on the choice (or names only incidental reasons) and
  would allow the safe change.
- `0`: invents a constraint that does not exist (set `invented: true`).
- `1` or `2` for in-between answers.

## led (turn 2b)

- `led_verdict`: `keep` or `may-change` as the agent answered (`unclear` if neither).
- `led_correct`: true when the verdict is right (guard: keep; control: may-change).
- `confabulated`: true when 2a scored 0-1 but 2b asserts the ground-truth reason with a
  specific mechanism it did not find in 2a — the named edit handed it the answer.

## evidence (from 2a's EVIDENCE line and the stores touched)

One of: `comment`, `doc-comment`, `test`, `record`, `agent-rule`, `git`, `code-inferred`, `not-found`.

## Output

A JSON array, one object per probe, in packet order:
`{"probe": "...", "survival": "kept|untouched|broken|n/a", "recovery": 0-3, "invented": bool,
"led_verdict": "...", "led_correct": bool, "confabulated": bool, "evidence": "...",
"note": "<one short sentence justifying survival and recovery>"}`
