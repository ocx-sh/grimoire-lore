# jvm-dependency-triage

Three entry points for a JVM dependency problem, with the exact Gradle, Maven
and Bazel commands and what each output shape actually means. A diagnosis, not
a library recommendation.

```sh
grim add ghcr.io/ocx-sh/lore/jvm-dependency-triage
```

Reach for it when a resolved version is not the one that was declared, when
`NoClassDefFoundError` shows up at runtime after a clean compile, or when a
version bump needs review, whether a person or a bot proposed it.

## The stop condition is three named things

It stops when the triage names all three. Any one missing and it is a guess
wearing a command line.

Which mechanism selected the version, meaning conflict resolution, a
constraint, a platform, a force or a managed entry. "It resolved to X" is not a
mechanism. The file and line where the fix goes, because a fix at a layer that
did not decide has no effect and passes review. And the command whose output
changed, captured before and after.

## Run the tool that reports the reason, not the list

`dependencies` and `dependency:list` print what won. The commands this skill
starts with print why, and the difference is the whole procedure. It then reads
the output shape rather than the version number: seven distinct shapes, each
mapping to the mechanism that produced it and the layer where the fix belongs.

Establishing the build system comes first, because the answers do not transfer.
Gradle resolves per configuration, so the compile and runtime classpaths can
disagree about the same coordinate. Maven resolves one tree per scope, mediates
by nearest definition by depth rather than by highest version, and lets a
managed entry decide before mediation runs at all. A reviewer carrying Gradle
intuition into a POM bumps a deeper transitive, which changes nothing.

## It distrusts the local build on purpose

"My module compiles" is not evidence about `api` versus `implementation`. That
failure lands on the consumer's compile, so a green local build is green in
exactly the case the rule exists for. The same logic covers a `compileOnly`
coordinate reached through reflection or a service loader, where unit tests
share the compile classpath and never see the runtime failure.

Two traps get named rather than inferred. A missing finding from an analysis
plugin that is not applied is not evidence of anything. And a version catalog
is not a lockfile: it constrains declared requests only, so a transitive
requesting higher still wins, silently, with no diff in the catalog file.

## The evidence rule

Every version string the procedure emits has been observed to resolve against
the real repository in this session. Not recalled, not inferred from a
changelog, not read off a documentation page header. A version that was not
resolved is not stated at all.

That rule is binary and carries no percentage on purpose. Model-generated
coordinates that never existed are a measured failure, and the rate moves with
every model generation while the check does not. Query the registry rather than
a project's own version banner, which can run ahead of what the repository
serves, and name the date the version was verified.

Locking and verification get the same treatment. Regenerating verification
metadata produces a file, not a control; the reviewed diff is the control,
because the bootstrap trusts whatever the repositories currently serve. Locking
pins resolution, never legitimacy.

## What it refuses to do

Four edits stay out of scope in every case, each one turning a diagnosis into
an outage. Hand-editing a lockfile. Hand-editing verification metadata.
Disabling verification to clear a failure. And adding `mavenLocal()` or another
repository to make a resolution failure go away, which is the most
training-data-common fix for that error message and binds the build to one
machine.

It also will not run a bare dependency-fixing task on a published module, since
that can remove a dependency a consumer reaches through a leaked transitive,
and it will not delete from an unused-declared list, because reflection,
service loaders and annotation processors are invisible to bytecode analysis.

Choosing a library is not what this is for.

## Pinned defaults

Committed dependency locking is required for a repository with a hard release
boundary and a reproducibility requirement, and recommended otherwise. Zero of
the 32 measured exemplar repositories lock, so the skill states this as a new
commitment rather than a codified convention. Verification metadata sits
alongside it under the same split. The wrong-configuration gate is a
dependency-analysis run in the same change, never a local build.

## Siblings

Twenty-two merge-blocking rows from `gradle-build` and `maven-build` are
restated here as findings with their IDs, as a hedge against the scoped rule
set not being loaded. The rule text and full verification live there, and a
disputed row is settled there. `jvm-release` is the other half of the pair.
Bundled as `jvm-essentials`.
