# bazel-diagnose

A symptom-routed diagnosis skill for a Bazel build that is already wrong. It
starts from what the user sees — the build got slow, CI never hits the
cache, this rebuilt for no reason, the remote cache is down, this test fails
one run in five, Bazel keeps refetching a repository, the diff tool skipped
a target, an option is unrecognized after a version bump — and routes each
to the measurement that settles it.

```sh
grim add ghcr.io/ocx-sh/lore/bazel-diagnose
```

It stops when the root cause is named, the measurement that proved it is
pasted rather than narrated, and either a fix was watched to make the
symptom go away or a documented gap is named.

## The measurement, not the folklore

Every procedure names the exact command as it works on 8.7.0 and 9.2.0,
what output confirms the hypothesis, and how empty output reads. The
instruments are Bazel's own: the profile, the execution log compared across
two checkouts, `--sandbox_debug`, the two help surfaces, `bazel mod deps`.

Several of the routes exist because the obvious diagnosis was measured
wrong. A cache outage does not fail a cache-only build, so a lane that must
fail needs a probe outside Bazel. Exit code 39 never reaches the caller.
`--rewind_lost_inputs` exists on 8.7.0 but is hidden from `bazel help` until
9.2.0, and its retry ceiling is a hard-coded twenty. A disk-cache-only run
cannot show what a cache tag does. `bazel analyze-profile` was deleted at
9.0.0 while the 9.1.0 documentation still lists it.

## Never fix the check

A diagnosis that edits the check instead of the cause — a widened cache key,
a disabled sandbox, a removed tag, a `flaky = True` — is a violation the
skill names explicitly. The symptom goes away and the defect ships.

## What it does not cover

Deciding whether to adopt Bazel or standing a workspace up — that is
`bazel-adopt`. The standards themselves — the `bazel-quality` rules, which
this skill cites by ID.

## Sibling

`bazel-quality` is the rule set whose verifications this skill runs in
anger. Run `bazel-adopt` first on a repository that is not yet on Bazel.
