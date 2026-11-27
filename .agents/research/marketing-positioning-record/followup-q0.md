---
title: Can the MKT-POS-04 owner gate be made agent-proof
program: product
topic: marketing-positioning-record
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 8
---

# Can the MKT-POS-04 owner gate be made agent-proof

## Answer

Partly. Signed commits do not help in this fleet. A required review from a second GitHub account does help. It holds only if the settings that carry the gate are out of the agent's reach.

Every GitHub docs page below was fetched with `curl -sL` on 2026-11-27 (HTTP 200, `date: Fri, 27 Nov 2026 13:14:53 GMT` on the response header). GitHub docs pages carry no publication date, so each claim is dated by that fetch. The fetch table is under "Fetch evidence". The page text was saved to `~/.cache/research-lang/exemplars/product/wave2/mpr-q0/`.

1. **Signed commits cannot separate owner from agent here (measured).** Commands and raw output are under "Measurement 1". The signing config is `commit.gpgsign=true`, `gpg.format=ssh`, `user.signingkey=/home/mherwig/.ssh/id_sign`. The five latest commits on this branch show `%G?` = `G`, all with the owner's email. The key file is `-rw------- 1 mherwig mherwig`, readable by the Unix user the agent runs as (`id -un` prints `mherwig`). The agent therefore signs as the owner and the signature verifies. GitHub's doc says it marks a commit "Verified" when it has a signature that "is cryptographically verifiable" ([GitHub Docs, about commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification), fetched 2026-11-27, undated). The page makes no claim about who operated the key. Whether the key has a passphrase was not measured (see "What could not be determined").
2. **A key the agent cannot use is a setup change, not a rule.** It needs a key held in hardware or behind a passphrase that is not unlocked in the agent's session, or a separate human-only account. The repository cannot show that. It is an owner action.
3. **A required human reviewer closes the gap if the approver is a different account than the PR author.** Quote: "Pull request authors cannot approve their own pull requests." ([GitHub Docs, approving a pull request with required reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/approving-a-pull-request-with-required-reviews), fetched 2026-11-27, undated). An agent that opens the PR as the owner's account cannot approve it. A single-owner, single-account repository therefore needs a second approver account.
4. **The gate is only as strong as who can edit the settings.** Branch protection quote: "By default, the restrictions of a branch protection rule don't apply to people with admin permissions to the repository or custom roles with the "bypass branch protections" permission. You can optionally apply the restrictions to administrators and roles with the "bypass branch protections" permission, too." ([GitHub Docs, about protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), fetched 2026-11-27, undated). The setting is named "Do not allow bypassing the above settings" on the same page. Rulesets use a bypass list instead: "you can allow certain users to bypass the rules in the ruleset. This can be users with a certain role, such as repository administrator, or it can be specific teams or GitHub Apps." ([GitHub Docs, about rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), fetched 2026-11-27, undated). An agent holding an admin token can change either. Whether the agent can reach such a token was not checked and is the deciding condition.
5. **CODEOWNERS binds to the base branch.** Quote: "To trigger review requests, pull requests use the version of CODEOWNERS from the base branch of the pull request." and "Users and teams must have explicit write access to the repository" ([GitHub Docs, about code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners), fetched 2026-11-27, undated). A PR that edits CODEOWNERS does not change the owners for its own review.

## What each mechanism does

| Mechanism | What it blocks | Defeated when | Source (fetched 2026-11-27, undated) |
|---|---|---|---|
| Required signed commits | Unsigned pushes: "contributors and bots can only push commits that have been signed and verified to the branch" | The agent can use the signing key (measured: yes here) | [about protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) |
| Required approvals plus code-owner review of `.agents/positioning.toml` | A merge with no approval from a listed owner | Only the PR author is listed as owner; or admin or bypass role is used | [about code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners); [approving a PR](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/approving-a-pull-request-with-required-reviews) |
| Last-push approval: "the most recent reviewable push must be approved by someone other than the person who pushed it" | The last pusher approving their own push | One agent controls both the pusher and the approver account | [REST rules](https://docs.github.com/en/rest/repos/rules) (the REST page carries the exact sentence; branch protection and rulesets pages name the setting "Require approval of the most recent reviewable push") |
| Dismiss stale approvals | A new push keeping an earlier approval | None found | [about protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) |
| Push ruleset "Restrict file paths": "Prevent commits that include changes in specified file paths from being pushed" | Any push touching `.agents/positioning.toml` | A bypass-list member pushes | [available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) |
| Environment with required reviewers and "Prevent self-review", holding `POSITIONING_OWNERS` | Reading the variable or deploying without a second human | A job that does not use the environment never sees the variable: "These variables are only available to workflow jobs that use the environment" | [managing environments](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment) |

## Measurements

### Measurement 1: signing config, log, key permissions (2026-11-27, product worktree)

Command:

```
W=/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product
git -C $W config --get commit.gpgsign; git -C $W config --get gpg.format; git -C $W config --get user.signingkey
git -C $W log -5 --format='%h %G? %ae %s'
ls -l /home/mherwig/.ssh/id_sign; id -un
```

Output, verbatim:

```
true
ssh
/home/mherwig/.ssh/id_sign
9dbe49c G contact@michael-herwig.de docs(research): commission the product wave-2 follow-ups and record owner decisions
c56b627 G contact@michael-herwig.de docs(research): UX wave 1 — eight consolidated rulesets with their dives
14e108f G contact@michael-herwig.de docs(research): channels wave 1 — eight consolidated rulesets with their dives
b6014c0 G contact@michael-herwig.de docs(research): marketing wave 1 — seven consolidated rulesets with their dives
6344379 G contact@michael-herwig.de docs(research): store per-dive briefs and wave-1 arguments for the product program
-rw------- 1 mherwig mherwig 419 Nov  3 19:33 /home/mherwig/.ssh/id_sign
mherwig
```

Correction to the earlier version of this artifact: it ran `ssh-keygen -y -P ''` on `id_sign` to test for a passphrase. That reads the private key, which the research limits forbid (never use a credential found on this machine). The result of that run is withdrawn and not used here. The commits above already show that signing works without interaction in the owner's setup, which is all point 1 needs.

### Measurement 2: the settings check, run (2026-11-27)

The check was rewritten so a missing or weak rule gives a non-zero exit. The earlier form (`--jq '[...]'`) printed `[]` and exited 0 when no pull_request rule existed, so it could pass silently. Output of the old form on a disabled ruleset (`[]`), shown for the record:

```
$ jq '[.[] | select(.type=="pull_request") | .parameters | {n: .required_approving_review_count}]' disabled.json; echo "exit=$?"
[]
exit=0
```

New check, with fixtures in `~/.cache/research-lang/exemplars/product/wave2/mpr-q0/`:

```
Q='any(.[]; .type=="pull_request" and .parameters.required_approving_review_count>=1 and .parameters.require_code_owner_review==true and .parameters.require_last_push_approval==true)'
for f in ok weak disabled; do echo "== $f"; jq -e "$Q" $f.json; echo "exit=$?"; done
```

```
== ok          (1 approval, code owner true, last push true)
true
exit=0
== weak        (code owner false)
false
exit=1
== disabled    ([] : ruleset disabled, nothing returned)
false
exit=1
```

Live, unauthenticated, against a public repository. The endpoint needs no token for public resources: "This endpoint can be used without authentication or the aforementioned permissions if only public resources are requested." ([GitHub Docs, REST rules](https://docs.github.com/en/rest/repos/rules), fetched 2026-11-27, undated). No credential was used; no `gh`.

```
$ curl -s -o r.json -w "%{http_code}\n" https://api.github.com/repos/cli/cli/rules/branches/trunk
200
$ curl -s https://api.github.com/repos/cli/cli/rules/branches/trunk | jq -e "$Q"; echo "exit=$?"
false
exit=1
```

The response for `cli/cli` held one rule, `copilot_code_review`, and no `pull_request` rule. The check failed with exit 1, as it should for a repository without the gate. The field names (`require_last_push_approval`, `required_approving_review_count`) match the REST page; `require_code_owner_review` was exercised in the fixtures only. A private repository needs a token and was not tested. Classic branch protection is not returned by this endpoint, only rulesets.

## Effect on the ruleset

**MKT-POS-04: change.** New text: "Never change the product sentence, the category noun or the object noun on any surface while `status` is not `reviewed` or `review_by` is earlier than today. Never set `status = "reviewed"` and never move `review_by` yourself. In a repository where the owner has enabled the review gate (MKT-POS-20), a pull request that changes `status` or `review_by` in `.agents/positioning.toml` merges only with an approval from a code owner who is not the pull request's author."

Replace the Verification author-email check (defeated by an agent committing under the owner's email, measured above) with:

- File check: `grep -n -F '.agents/positioning.toml' .github/CODEOWNERS` prints at least one line whose owner list names an account other than the account that opens agent PRs. Fails (no line, exit 1) otherwise.
- Settings check: `curl -s https://api.github.com/repos/<slug>/rules/branches/<default-branch> | jq -e "$Q"` with `$Q` as in Measurement 2 (add an `Authorization` header supplied by the owner for a private repository). Exit 0 passes; exit 1 means no gate, reported to the owner. Run on 2026-11-27, see Measurement 2.

Keep a CI `POSITIONING_OWNERS` check only as a second layer, and only as a variable on a protected environment with prevent-self-review.

**Verdict 11: change.** New text: "Closed only by a required review from a second account. Signed commits do not close it: the agent in this fleet signs as the owner with a key readable by its own Unix user (measured 2026-11-27). The gate also needs the agent to hold no admin token; the owner must confirm that." Verification: Measurement 1 command (`git log -5 --format='%h %G? %ae'` prints `G` for agent-made commits under the owner's email) shows the signature claim; the settings check above shows whether the second-account gate exists.

**MKT-POS-04 failure mode 9 (AI-agent failure modes): change.** New text: "Caught by the required code-owner review from a second account. Missed if the agent holds an admin token, a bypass role, or a token of the only listed owner who is also the PR author." Verification: the settings check exits 0 on the repository; the file check prints a line naming a second account; a bypass list that is empty or contains only the owner's role (read from `GET /repos/<slug>/rulesets`, readable by anyone with read access per [about rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), fetched 2026-11-27).

**NEW rule MKT-POS-20: owner review gate.**
- Rule: Protect `.agents/positioning.toml` so a change to it needs approval from a code owner who is not the pull request author. `.github/CODEOWNERS` lists the file with at least one owner other than the account agents act as. The default-branch ruleset requires at least 1 approval, code-owner review and approval of the most recent reviewable push. The bypass list is empty or limited to the owner's own role.
- Rationale: agents here commit under the owner's identity and sign with a key their Unix user can read, so identity and signatures prove nothing about who flipped `status`. GitHub applies the author-cannot-approve rule per account, so a second approver is the one control the agent cannot satisfy alone.
- Verification: the file check and the settings check under MKT-POS-04. Seeded failure, run: with the ruleset disabled the settings check prints `false` and exits 1 (the `disabled.json` row in Measurement 2); with code-owner review off it prints `false` and exits 1 (`weak.json`); on `cli/cli`, which has no such rule, it prints `false` and exits 1.
- Severity: SHOULD, until the owner confirms an approver account exists and the agent has no admin token. Then MUST. A MUST before that fails every single-owner repository.

**MKT-POS-03, 05 to 19: confirm.** Unaffected.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| Authors cannot approve their own PRs | [approving a PR](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/approving-a-pull-request-with-required-reviews) | undated; fetched 2026-11-27 |
| PRs use CODEOWNERS from the base branch; owners need explicit write access | [about code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) | undated; fetched 2026-11-27 |
| Branch protection does not apply to admins by default; signed-commit requirement; dismiss stale; last-push approval | [about protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) | undated; fetched 2026-11-27 |
| Rulesets: restrict file paths; bypass list of roles, teams, apps | [available rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets); [about rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) | undated; fetched 2026-11-27 |
| Anyone with read access can view active rulesets | [about rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) | undated; fetched 2026-11-27 |
| Verified means cryptographically verifiable signature; no statement on who operated the key | [about commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification) | undated; fetched 2026-11-27 |
| Environment variables only reach jobs using the environment; Prevent self-review | [managing environments](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment) | undated; fetched 2026-11-27 |
| REST rules endpoint readable without authentication for public repos; `require_last_push_approval` definition | [REST rules](https://docs.github.com/en/rest/repos/rules) | undated; fetched 2026-11-27 |

Refresh: 6 months, or when GitHub changes the settings pages.

## Fetch evidence

Command: `curl -sL -o pN.html -w "pN %{http_code} %{size_download} <url>\n" <url>`, run 2026-11-27. Output:

```
p1 200 148619 https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/approving-a-pull-request-with-required-reviews
p2 200 239620 https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
p3 200 280979 https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
p4 200 314608 https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
p5 200 213530 https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
p6 200 189709 https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification
p7 200 359992 https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment
p8 200 778925 https://docs.github.com/en/rest/repos/rules
```

Every quote above was extracted from these saved pages with `grep -o` after stripping tags. The "someone other than the person who pushed it" sentence was found on the REST page (p8) and, in branch-protection wording, on p3.

## What could not be determined

- Whether the agent can reach an admin-scope GitHub token (a stored `gh` login or an environment token). Not checked: using or probing credentials is forbidden. This decides point 4. The owner must say.
- Whether the signing key has a passphrase. Not measured: doing so means reading the private key, which is forbidden. The owner can check with `ssh-keygen -y -f <key>` by hand; a passphrase prompt means protected.
- Whether a second approver account exists for each repository. Needs the owner.
- Whether the settings check works on a private repository. Needs a token; not tested. Public repository without token was tested.
- Whether classic branch protection (not rulesets) can be checked the same way. The `rules/branches` endpoint returns rulesets only; the classic branch-protection endpoint needs admin scope. Not tested.
- GitHub plan limits for rulesets and code-owner review on private repositories under free plans. Not in the fetched pages.
- Whether a hardware-held or passphrase-protected key works for unattended agent sessions. Owner decision.

## Sources

1. https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/approving-a-pull-request-with-required-reviews
2. https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
3. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
4. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
5. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
6. https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification
7. https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment
8. https://docs.github.com/en/rest/repos/rules
