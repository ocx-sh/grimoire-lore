---
title: Public API and Its Evolution
summary: The JAVA-API family, owning what a published Java module exposes, how a signature is allowed to change, the nullness contract on that surface, and the module descriptor that states it
---

# Public API and Its Evolution

Owns the shape of the surface a Java module publishes and every change to it
after the first release: signatures, the binary-compatibility gate, deprecation,
sealed-hierarchy evolution, the JSpecify contract on the published surface, the
module descriptor, and two pinned contracts the surface carries. It does not own
nullness inside the implementation or the NullAway wiring (`JAVA-NULL` in
`nullness.md`, `JAVA-LINT` in `lint-gate.md`), the toolchain JDK, the bytecode
floor or the below-9 descriptor split (`JAVA-PLAT` in `platform-and-versions.md`),
record and pattern-matching shape (`JAVA-DATA` in `data-and-patterns.md`), or
Kotlin's ABI gate and its `data class` prohibition (`KT-API`, in the
`kotlin-quality` set). `JAVA-API-13` is retired and its number is not reused: the
`--release` decision it carried belongs to `JAVA-PLAT-01`, and to `MVN-BUILD-01`
for an adopter who loads only the Maven rules.

Contents: [Pinned Defaults](#pinned-defaults) ·
[The Binary-Compatibility Gate](#the-binary-compatibility-gate) ·
[Nullness on the Published Surface](#nullness-on-the-published-surface) ·
[The Module Descriptor](#the-module-descriptor) ·
[Deprecation and Return Shapes](#deprecation-and-return-shapes) ·
[Sealed Hierarchies](#sealed-hierarchies) · [Pinned Contracts](#pinned-contracts) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

Every version, JEP and JLS reference in this file was verified **2026-09-12**
unless a row says otherwise.

## Pinned Defaults

A **pinned** row encodes an agreement, not a derivation. Override one once, in
your own config or in a written decision, and record the override. Ignoring one
is a violation, and re-arguing one in a pull request is not a review comment.

Four constraints are pinned before any rule below fires. The published surface is
**Java-first and Kotlin-friendly**: JSpecify-annotated (`JAVA-API-09`), no
`Optional` in parameter position (`JAVA-API-06`), no generic varargs parameter
(no rule, read it in the diff, because a Kotlin caller cannot pass one without a
spread and a cast), and no `data`-shaped public value type (`KT-API-05`, owned by
the `kotlin-quality` set). Flipping the surface to Kotlin-first is a decision
taken before the first release, never after: it gives up the module descriptor as
the natural `@NullMarked` carrier and it ends `JAVA-API-15`.

## The Binary-Compatibility Gate

One gate covers all four rows. It is japicmp, **pinned**: revapi is the
better-designed tool and had 0 adopters in the 32-repository corpus as of
2026-09-12, so the choice rests on measured practice and is flagged for
re-taking, not for inheriting.

```bash
./gradlew :sdk:check                # japicmp runs here, not only on a release branch
./gradlew :sdk:publish --dry-run    # the japicmp task must be listed before any upload task
mvn verify                          # Maven: japicmp-maven-plugin bound to an <execution>
```

`oldVersion` is the last coordinate actually published to the registry, not the
previous tag. Read the report, not only the exit status: japicmp classifies two
of the breaks below as binary-compatible and will not fail the build on them.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-API-01 | Never change a published method's parameter type or return type in place. Add an overload and leave the original signature untouched. | Widening a parameter and narrowing a return type both recompile cleanly, and both are a delete-plus-add at the bytecode level (JLS SE 25 §13.4.14 and §13.4.15). Un-recompiled callers get `NoSuchMethodError`. | The gate, with `oldVersion` set as above. Any binary-incompatible entry that is not in the allowlist fails the build, and an empty finding list is the pass. | MUST |
| JAVA-API-02 | Bind the japicmp task to `check` or `verify`, make every publish task depend on it, and keep accepted breaks in a version-controlled allowlist carrying a reason string per entry. Never a bare skip flag and never `ignoreMissingClasses`. **Pinned.** | A published coordinate is immutable, so the only remedy after upload is a new version number, which is exactly the cost the gate exists to make deliberate. A gate that runs only on a release branch reports the break after the decision that caused it has shipped. | The `--dry-run` line above lists the japicmp task ahead of every upload task, and its absence there is the finding. Then `grep -rn --include='*.gradle.kts' --include='pom.xml' -e 'ignoreMissingClasses' -e 'skip>true' .` (the second pattern matches the Maven `<skip>true</skip>` element): any hit with no accompanying allowlist file is the finding, and empty output is the pass. | MUST |
| JAVA-API-03 | A published interface never gains an abstract method without a `default` body. Where the implementation set must stay closed, seal the interface instead. | Linkage survives (JLS SE 25 §13.5.3), but invoking the new method on a pre-existing implementation throws `AbstractMethodError`, and every direct implementer fails to compile. A compatibility table that calls this change binary-compatible is right about linkage and misleading about consequence. | The gate reports the added interface method, classified binary-compatible, so read the report rather than the exit status. In the diff, every member added to a `public interface` carries `default` or the interface is `sealed`. An empty report section is the pass. | MUST |
| JAVA-API-04 | Never change the value of a published `public static final` constant. | Callers keep the old inlined value until they are recompiled (JLS SE 25 §13.4.9). No `LinkageError`, no diagnostic, a silently wrong answer. It is the most dangerous row in this table because nothing signals it. | The gate lists the field change and classifies it binary-compatible. Treat any entry in that section as a break, and an empty section as the pass. | SHOULD |

## Nullness on the Published Surface

This family owns the annotation contract on the published surface only. The JDK
and vendor precondition for `jspecifyMode` is `JAVA-PLAT-03`'s, and the lint
wiring that turns NullAway on is `JAVA-LINT-05`'s. Neither is restated here.

```bash
./gradlew :sdk:compileJava   # NullAway runs inside javac: onlyNullMarked = true, jspecifyMode = true
grep -rl --include='*.java' -e 'org.jspecify' src \
  | xargs -r grep -n -e 'javax.annotation.Nullable' -e 'org.checkerframework' \
      -e 'androidx.annotation' -e 'org.jetbrains.annotations'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-API-09 | Annotate the published surface with JSpecify and declare `@NullMarked` once, in `module-info.java`. | At module scope `@NullMarked` cascades to every package the module declares. At package scope it does not cascade to subpackages, so a per-package declaration is 1:1 maintenance forever. JSpecify's four annotations are frozen for life (1.0.0), and Kotlin 2.1.0 and later report JSpecify violations as compile errors by default, which is the strict boundary jsr305's warn-only default never reached. jsr305 was still declared in 13 of 32 corpus repositories against JSpecify's 9, which is why an existing surface gets the lower severity. NullAway 0.12.3 or later, verified 2026-09-12. | `grep -c -e '@NullMarked' src/main/java/module-info.java` reads 1. A count of 0 is the finding, and a count above 1 means the declaration was copied to package scope as well. | MUST (new published surface) / SHOULD (existing surface, with a migration note) |
| JAVA-API-10 | Never mix nullness flavours in one file. A file importing `org.jspecify` imports no `javax.annotation`, no `org.checkerframework`, no `androidx.annotation` and no JetBrains `@Nullable`. Migrate a package, do not layer. | Four incompatible systems are live in the corpus at once, with different retention, different defaults and different severity on the Kotlin side, so a mixed file leaves nobody able to state what the contract is. This is the half that is MUST at every severity, because it contradicts no installed base. | The second gate command above. Any hit is the finding, and empty output is the pass. | MUST |
| JAVA-API-11 | JSpecify annotations are `TYPE_USE`. Write `Type @Nullable []` for a nullable array and `<T extends @Nullable Object>` for a type parameter that may be instantiated with a nullable type. | `@Nullable Object[]` means an array of nullable `Object`, which is the opposite of the usual intent, and a bare `<T>` under `@NullMarked` cannot be instantiated nullable at all. Both spellings compile. JSpecify 1.0.0, verified 2026-09-12. | `grep -rnE --include='*.java' '@Nullable +\w+(<[^>]*>)?\[\]' src` : any hit is a misplaced array annotation, and empty output is the pass. NullAway's `jspecifyMode` reports the generic-bound half at compile time. | MUST |

```java
// wrong: reads as "array of nullable String", and the type parameter cannot take null
@Nullable String[] names;
<T> void accept(T value);
```

```java
// right: the annotation binds to the array type, not to the component type
String @Nullable [] names;
<T extends @Nullable Object> void accept(T value);
```

## The Module Descriptor

`find . -name module-info.java` is the gate. For an SDK or library target,
non-empty output is the pass and **empty output is the finding**.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-API-12 | Ship a `module-info.java` whose `exports` clause names exactly the public packages. `Automatic-Module-Name` supplies a stable module name and none of the encapsulation, so it is not a lighter module descriptor and is never described as one. | `exports` is the compiler-enforced statement of the public surface, one file stating the whole contract. The cost to a classpath consumer is zero, because the descriptor is inert off the module path. Measured 2026-09-12: 12 of 32 corpus repositories ship a descriptor, 10 set `Automatic-Module-Name`. Where the base build targets below Java 9 the descriptor compiles in its own execution, which is `JAVA-PLAT-05`'s rule and the platform-and-versions file owns it. | The gate command. Then diff the `exports` list against the package list the Javadoc task publishes: a package exported but undocumented, or documented but unexported, is the finding. Where the module genuinely cannot host a descriptor, the manifest carries `Automatic-Module-Name` and the reason is written down next to it. | MUST (SDK, library) / CONSIDER (application, CLI) |

## Deprecation and Return Shapes

`javac -Xlint:dep-ann,removal -Werror` is the compiler half. The enumerated
`-Werror` key list is `JAVA-LINT-07`'s and `deprecation` is deliberately not on
it, so a one-off `-Xlint:deprecation` run is a diagnostic, never a gate key.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-API-05 | Every `@Deprecated` element carries a `since` value and a Javadoc `@deprecated` tag, both present or both absent. `forRemoval = true` appears only where the Javadoc body already names the removal version. Omit `forRemoval` for an ordinary deprecation. | JEP 277 calls the tag-and-annotation mismatch a mistake, and gates `forRemoval` on a clear and definite plan for removing the API. It is not a synonym for wanting to remove something eventually, and a consumer reading it that way schedules work that never comes. JDK 9 and later. | The gate compile catches the tag-without-annotation half only. For the other half, `grep -rn -A2 --include='*.java' -e '@Deprecated' src` and read each hit: an annotation with no `since` is the finding, and an empty listing means nothing is deprecated. No compiler check exists for the annotation-without-tag direction. | MUST |
| JAVA-API-06 | `Optional` is a return type only, never a field, a constructor parameter or a method parameter, and a public method returns an empty collection rather than `null` for "no result". | It is the stated design intent of the type, and still one of the most-violated API rules in current retrospectives. The parameter form forces every caller to wrap a value it already holds, and it is one of the four pinned constraints on a Kotlin-friendly surface. | `grep -rnE --include='*.java' 'Optional<[^>]*>\s+\w+\s*[;,)]' src` matches the field and parameter shapes: empty output is the pass. NullAway reports the null-return half once the surface is `@NullMarked`. | SHOULD |

## Sealed Hierarchies

No producer-side mechanical gate exists, because the entire effect lands on the
consumer. `grep -rln --include='*.java' -e 'sealed interface' -e 'sealed class' src`
lists the hierarchies this codebase owns, and empty output means neither rule can
fire here. Sealed types are JDK 17 (JEP 409), pattern-switch exhaustiveness is
JDK 21 (JEP 441).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-API-07 | A `switch` over a sealed type this codebase owns carries no `default` label and no catch-all type pattern. | JEP 441 proves exhaustiveness from the `permits` clause, so omitting `default` makes the compiler force every call site to be revisited when a subtype is added. With `default`, the new subtype is silently absorbed: no compile error, no runtime signal, frequently wrong behaviour. | From the listing above, grep every `switch` whose selector is one of those types for a `default` label or an unconditional type pattern. Any hit is the finding, and empty output is the pass. Error Prone's `UnnecessaryDefaultInEnumSwitch` covers the enum half and ships in `DISABLED_CHECKS`, so the activation is `-Xep:UnnecessaryDefaultInEnumSwitch:ERROR`. | MUST |
| JAVA-API-08 | Classify "adding a permitted subtype" once, in a written compatibility policy (minor or major), rather than per pull request. | It is source-breaking for an exhaustive consumer and a silent semantic change for a defensive one, and the producer's own build reports neither. Deciding it per pull request means deciding it differently each time. | A diff that adds a name to a `permits` clause cites the policy's classification. `git diff -U0 -- '*.java'` and read the added lines for `permits`: an addition with no citation is the finding, and no such addition is the pass. No mechanical producer-side check exists. | SHOULD |

```java
// wrong: a new permitted subtype is absorbed at every call site, with no diagnostic
switch (shape) { case Circle c -> area(c); default -> throw new IllegalStateException(); }
```

```java
// right: adding a permitted subtype now fails compilation at every call site
switch (shape) { case Circle c -> area(c); case Square s -> area(s); }
```

## Pinned Contracts

Both rows below encode agreement rather than derivation, and both are verified
against what the module actually publishes.

```bash
./gradlew :sdk:dependencies --configuration runtimeClasspath   # no module entries is the pass
mvn dependency:list -DincludeScope=runtime
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-API-14 | Map the process exit status onto a typed exception hierarchy through one enum of 16 sysexit members, and never parse stderr text to decide what failed. **Pinned:** the member set is agreed across sibling SDKs, so an adopter names their own table once and every implementation diffs against it. | The value is that the table is agreed, not that it is derivable. A second implementation that invents its own numbering disagrees with the first silently, and in only one direction. Stderr text is not a contract in any tool that localises or reformats its messages. | Diff the enum's members against the table the sibling implementations ship: any divergence is a finding, an empty diff is the pass. Then `grep -rn --include='*.java' -e 'getErrorStream' src` and read each hit: stderr text driving control flow is the finding, stderr text logged or attached to an exception message is not. Where the temporary-failure code is retried, the placement of that retry is `JAVA-CONC-14`'s and the concurrency file owns it. | MUST (SDK, build plugin) |
| JAVA-API-15 | Hold the zero-runtime-dependency commitment on a published SDK: the JDK's own HTTP client plus a hand-rolled reader over the tool's JSON output. JSpecify is `compileOnly` or `provided` (CLASS retention), so it does not break the commitment. **Pinned.** | It is reachable in Java precisely because the JDK ships `java.net.http`, and it stops being reachable the moment a serialization or coroutines runtime enters the graph, which is the other half of the language decision above. Every runtime dependency is a version the consumer has to reconcile with their own. | The gate commands: the published POM's runtime-scope dependency list is empty, and any entry is the finding. A compile-only annotation artifact appearing there means its scope was declared wrong. | MUST (SDK) |

## What Agents Get Wrong Here

1. **"Widen the parameter, it is more flexible."** Changing `int` to `long` or
   `List<T>` to `Collection<T>` in place is strictly more permissive from a
   source-only view and is a delete-plus-add in the bytecode (`JAVA-API-01`).
   Highest-frequency failure in this family.
2. **Reaching for the vendor `@Nullable`.** Told to add null-safety annotations,
   an agent picks `javax.annotation.Nullable`, which is runtime-retained and
   warn-only in Kotlin, and often leaves both flavours in one file
   (`JAVA-API-10`).
3. **A bare `@Deprecated` with no `since` and no Javadoc tag**, or
   `forRemoval = true` added as a default posture. The pre-2017 idiom dominates
   the training signal (`JAVA-API-05`).
4. **`default -> throw new IllegalStateException()` on a sealed switch.** It
   looks more defensive and is exactly backwards: it disables the one compiler
   signal the design exists to produce (`JAVA-API-07`). Flag for review, never
   auto-accept.
5. **`Automatic-Module-Name` offered as JPMS support.** One manifest line,
   nothing to get wrong, and none of the `exports` enforcement. If the ask was
   encapsulation, the descriptor is the answer (`JAVA-API-12`).
6. **`@Nullable Type[]` written for a nullable array**, because pre-`TYPE_USE`
   Java only had that form (`JAVA-API-11`).
7. **A familiar linter named as the compatibility gate.** Checkstyle, SpotBugs
   and PMD diff nothing against a previous release. Grep the build for the
   japicmp plugin id, not for a job named "quality" (`JAVA-API-02`).
8. **Adding an abstract method to an interface after reading that it is
   binary-compatible.** It is, and it still throws `AbstractMethodError` on every
   pre-existing implementation (`JAVA-API-03`).
9. **Declaring `@NullMarked` per package** because the JSpecify examples show it
   that way. It does not cascade to subpackages, so the first new subpackage
   ships unannotated and silently loses the contract (`JAVA-API-09`).
10. **`Optional` in a parameter list, offered as the null-safe signature**
    (`JAVA-API-06`), and a `public static final` constant's value edited as a
    routine configuration tweak (`JAVA-API-04`).
