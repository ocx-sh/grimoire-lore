# launch-plan

Writes one checked launch plan file for a software product. A launch is a gate
check, not a campaign. The skill checks what can be checked and marks every
human step.

```sh
grim add ghcr.io/ocx-sh/lore/launch-plan
```

Reach for it when someone plans a launch, a launch week or a 1.0 announcement.
Also use it for a Product Hunt or Show HN day. It also fits a directory,
awesome-list or newsletter push, and the question of when and where to announce
a release.

## What the plan checks

The readiness gate comes first: a published release, and a link target that
resolves. A venue is admitted from its own scope sentence. The plan allows at
most one community venue per day, with a named human on duty.

It separates a launch reason from a routine release. It sets the order of tag,
canonical record and venues. It records the Product Hunt maker rules, one
numeric launch goal, and the human steps no agent may take.

If the gate fails, the skill stops there and reports the gate. It never plans
around a failed gate.

## It posts nothing

The skill writes the plan and nothing else. It never posts, uploads, submits,
pays, claims or schedules anything. For each venue it names who writes the
package: the platform skill, or a fact sheet for the human.

No source shows that a launch shape or venue order beats another for a small
developer tool. The plan does not claim one does.

18 rows hold the rationale and verification. 10 of them are MUST. Two scripts,
`plan_check.py` and `link_target_check.py`, check the plan file and the link
target, and carry `--self-test`.

## What it does not cover

Routine release notes belong to `release-notes`. The individual posts belong to
the platform skills.

## Siblings

It requires `channel-publishing`, which installs with it. `community-post`,
`linkedin-post`, `youtube-video` and `microblog-post` write the venue packages.
Bundled as `product-essentials`.
