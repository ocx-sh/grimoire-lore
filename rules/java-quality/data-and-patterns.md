---
title: Records, Sealed Types and Equality
summary: "The JAVA-DATA family: records that are not actually immutable, exhaustive switches and case null, the equals/hashCode/compareTo contracts, and Optional as a value"
---

# Records, Sealed Types and Equality

Owns how a value is modelled and how two of them compare: record components,
sealed hierarchies, the exhaustiveness and null behaviour of a `switch` over a
closed type, the `equals`/`hashCode`/`compareTo` contracts, and `Optional` as a
value. Does not own the *published* shape of any of it. A `switch` over a sealed
type this codebase owns, an `Optional` in a field or parameter position, and
classifying "adding a permitted subtype" are `JAVA-API` rows, defined in
`api-and-evolution.md`. Nullness annotations are `JAVA-NULL` (`nullness.md`), the
Error Prone and SpotBugs wiring every check below names is `JAVA-LINT`
(`lint-gate.md`), and sharing a mutable value between threads is `JAVA-CONC`
(`concurrency.md`).

Contents: [Scope](#scope) ·
[Records and Defensive Copies](#records-and-defensive-copies) ·
[Equality and Ordering Contracts](#equality-and-ordering-contracts) ·
[Closed Types and Switches](#closed-types-and-switches) ·
[Optional as a Value](#optional-as-a-value) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Scope

- **Version floors, verified 2026-09-12.** Sealed classes are final in JDK 17
  ([JEP 409](https://openjdk.org/jeps/409), 2021-09-14). Record patterns and
  pattern matching for `switch` are final in JDK 21
  ([JEP 440](https://openjdk.org/jeps/440) /
  [JEP 441](https://openjdk.org/jeps/441), 2023-09-19). The program's floor is
  **JDK 17**, toolchain 25 (`JAVA-PLAT-02`, **pinned**: a default an adopter
  overrides once in their own build, never per call site). A `--release 17`
  build compiles a sealed interface and an `instanceof` pattern but rejects a
  pattern `switch`, so JAVA-DATA-07 and the compiler-proved half of
  JAVA-DATA-06 bind only where the release target is 21 or higher.
- **`javac` proves exhaustiveness and nothing else in this file.** It accepts a
  record that hands out its internal array, an `equals` with no `hashCode`, a
  `compareTo` that disagrees with `equals`, and `Optional.of(null)`. All four
  fail at runtime, three of them silently.
- **Both mechanical tools are optional in practice.** Error Prone runs in 11 of
  the 32 corpus repos and SpotBugs gates 2, so 21 run neither. Every row below
  carries a grep as its severity floor, and a clean build under a tool nobody
  wired is not evidence.

## Records and Defensive Copies

A record's generated accessor returns the component field itself. Nothing in the
declaration copies anything. SpotBugs `EI_EXPOSE_REP` catches the array half
where SpotBugs runs at all, so the grep is the floor.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-DATA-01 | A record component typed as an array, `Collection`, `List`, `Set`, `Map` or `Date` is copied in the compact constructor. Use `List.copyOf`/`Set.copyOf`/`Map.copyOf`, which return an immutable copy and so also make the generated accessor safe, or `.clone()` for an array, which does not (see JAVA-DATA-02). | The record declaration promises immutability and delivers a final reference to a mutable object. A caller that kept the list it passed in, or that mutates the array the accessor returned, changes the record after construction. Oracle Secure Coding `MUTABLE-2`/`MUTABLE-3`/`MUTABLE-12` and Effective Java Item 50 both predate records and both still describe the bug exactly. | `grep -rnE --include='*.java' -e 'record [A-Za-z0-9_]+\(' src` lists every record. Read each component list: a mutable component type with no compact constructor assigning a copy is the finding. Empty output means the tree declares no records, which is a pass. | MUST |
| JAVA-DATA-02 | No record component is an array. Use `List<T>`, or a wrapper type that defines `equals`/`hashCode` over the contents. | The generated `equals` calls `Object.equals` on each component, which for an array is reference identity, and the generated `hashCode` mixes the identity hash. Two records built from equal byte contents compare unequal and land in different `HashMap` buckets, run to run. `.clone()` in the compact constructor fixes exposure and makes this worse, because now no two instances can ever be equal. | `grep -rnE --include='*.java' -e 'record [A-Za-z0-9_]+\([^)]*\[\]' src`. Any hit is the finding unless the record also declares `equals`, `hashCode` and the affected accessor by hand. Empty output is the pass. | MUST |

```java
// wrong: immutable by declaration only, and never equal to itself-by-value
public record Payload(String id, byte[] body) {}
```

```java
// right: the component carries its own value semantics, so both problems close
public record Payload(String id, List<Byte> body) {
  public Payload {
    body = List.copyOf(body);
  }
}
```

## Equality and Ordering Contracts

Error Prone's `EqualsHashCode` is in `ENABLED_ERRORS`, so it fires wherever
Error Prone is wired at all, and SonarJava `S1206` is the second reading of the
same fact. Neither covers the two contracts below them, which have no mechanical
check at any promotion level.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-DATA-03 | A type that overrides `equals` overrides `hashCode` in the same class, and a type whose identity is its state is declared a `record` instead of carrying a hand-written pair. | A hand-written pair drifts on the next field addition, and the drift is silent: the object simply stops being found in the `HashSet` it was put into. A record regenerates both from the component list, so the class of bug cannot recur. | Error Prone `EqualsHashCode` where Error Prone runs. Tool-free floor: `grep -rl --include='*.java' -e 'boolean equals(Object' src \| xargs -r grep -L -e 'int hashCode()'`. Every file printed is the finding, and empty output is the pass. | MUST |
| JAVA-DATA-04 | Every instance field that `equals` reads is `final`, and no field of a mutable type is read by `equals` at all. | A key mutated after insertion is unreachable in its own `HashMap`. It is not removed, not found, and not reported. This is the failure that makes a record with an array component (JAVA-DATA-02) dangerous rather than merely wrong. | Reading check, no lint exists. The files JAVA-DATA-03's grep lists are the candidate set. In each, a non-`final` field read by `equals`, or a `final` field of an array, `Collection` or `Date` type, is the finding. | SHOULD |
| JAVA-DATA-05 | `compareTo` reads exactly the fields `equals` reads, or the class Javadoc states the inconsistency in the `Comparable` contract's own words. | `TreeSet` and `TreeMap` decide membership with `compareTo`, not `equals`. A `compareTo` over one field of a three-field type silently discards every element that ties on that field, and the same collection under a `HashSet` keeps them. Effective Java Item 14. | `grep -rn --include='*.java' -e 'implements Comparable' -e 'Comparator.comparing' src`. For each hit, compare the fields `compareTo` reads against the fields `equals` reads. A difference with no Javadoc statement is the finding. Empty output is the pass. | SHOULD |

## Closed Types and Switches

A `switch` whose selector is a sealed type this codebase owns is `JAVA-API-07`,
defined in `api-and-evolution.md`, and is not restated here. What is left is the
enum selector, which that rule does not reach, and the null selector, which no
rule reaches. Error Prone's `UnnecessaryDefaultInEnumSwitch` ships in
`DISABLED_CHECKS`, so it never fires on a stock invocation. The promotion to
`-Xep:UnnecessaryDefaultInEnumSwitch:ERROR` is an edit to the Error Prone block
`JAVA-LINT` owns.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-DATA-06 | Model a closed set of alternatives as a `sealed interface` with one `record` per variant, consumed by a pattern `switch`. Not a tagged class (one type or kind field beside per-variant nullable fields), not an `instanceof` cascade, not an abstract class plus a visitor. | Under a sealed hierarchy the compiler forces every consumer to be revisited when a variant is added. Under a tag field it forces nothing, and every variant's fields are nullable for every other variant, which is the illegal-state problem Data-Oriented Programming v1.1 (2024) names. Effective Java Item 23 recommends the class hierarchy and predates sealed types by three years, so this is the shape a model reproduces unaided. | `grep -rn --include='*.java' -e 'String kind;' -e 'String type;' -e 'int tag;' src` finds the tagged-class shape, and `grep -rcE --include='*.java' -e 'instanceof [A-Z]' src` counts the cascade per file. Any hit from the first, or a file whose count is three or more over types in one package, is the finding. Empty output from the first and counts of zero or one from the second are the pass. | SHOULD |
| JAVA-DATA-07 | A pattern `switch` carries a `case null` label, or the enclosing code has already proven the selector non-null. | [JEP 441](https://openjdk.org/jeps/441) kept the pre-21 behaviour deliberately: without `case null` the switch throws `NullPointerException` on a null selector exactly as an old one did. "Pattern matching handles null" is the natural inference and it is false. The fix is a `case null ->` arm of its own. Writing `case null, default ->` instead reintroduces the `default` that JAVA-DATA-08 and `JAVA-API-07` forbid over a type this repository owns. | `grep -rn --include='*.java' -e 'case null' src` and `grep -rnE --include='*.java' -e 'case [A-Z][A-Za-z0-9_]* [a-z]' src`. Every file in the second list that is absent from the first is the finding unless its selector is provably non-null. Empty output from the second grep means there are no pattern switches, which is a pass. | MUST |
| JAVA-DATA-08 | A `switch` over an enum this repository declares lists every constant and carries no `default` label. Keep `default` only over an enum the repository does not own, whose owner can add a constant in a patch release. | The constant added next month routes to the catch-all at every call site, with no diagnostic anywhere. Writing it as `default -> throw new IllegalStateException("unreachable")` is the same defect wearing a safety costume, because it moves a failure the compiler would have shown at build time into production. | `grep -rn --include='*.java' -e 'default:' -e 'default ->' src`. A hit whose selector is an enum declared in this repository is the finding, and a hit over a third-party enum, a `String` or an `int` is correct and stays. Empty output is the pass. Error Prone `UnnecessaryDefaultInEnumSwitch` reports the same finding once promoted to `ERROR`, and reports nothing at all before that. | MUST |

```java
// wrong: exhaustive over every permitted subtype, and still throws on null
return switch (shape) { case Circle c -> area(c); case Square s -> area(s); };
```

```java
// right: null is answered, not stumbled over
return switch (shape) { case null -> 0.0; case Circle c -> area(c); case Square s -> area(s); };
```

## Optional as a Value

`Optional` in a field, constructor parameter or method parameter position is
`JAVA-API-06`, defined in `api-and-evolution.md`. A record component is a field,
so that row governs it. What is left is the value itself.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-DATA-09 | A method whose return type is `Optional` never returns `null`, and `Optional.of(x)` is written only where `x` is provably non-null. Use `Optional.ofNullable` everywhere else. | Both halves throw. `Optional.of(null)` throws `NullPointerException` at the producer, and a `null` returned in place of `Optional.empty()` throws at the consumer's first `.map`, one stack frame removed from the code that caused it. The type's only contract is that the reference is never null, so an implementation that breaks it is worse than the bare nullable return it replaced. | `grep -rn --include='*.java' -e 'Optional.of(' src`. An argument that is a map lookup, a field read or an unannotated parameter is the finding, and a literal, a `new` or a `@NonNull`-annotated value is the pass. Then `grep -rn --include='*.java' -e 'return null' src` and confirm no hit sits in a method returning `Optional`. NullAway's `CheckOptionalEmptiness` covers the `.get()` half only and is off by default. | MUST |

## What Agents Get Wrong Here

1. **Reaching for an abstract class plus a visitor, or an enum tag plus an
   `instanceof` cascade, when asked to model a closed set of alternatives.**
   Effective Java Item 23 is the dominant answer in training data and it
   predates sealed types entirely. This is the single biggest 2018 to 2026
   language shift in the corpus and the failure with the widest blast radius,
   because every consumer inherits the shape.
2. **`record Payload(String id, byte[] body)`, declared immutable in the same
   commit message.** The most common "I used a record but it is not immutable"
   bug, and it breaks equality as well as encapsulation.
3. **Adding `default -> throw new IllegalStateException("unreachable")` to an
   already exhaustive switch, unprompted, as a robustness improvement.** It is
   the one edit that converts a compile-time guarantee into a runtime
   exception, and it is volunteered rather than requested.
4. **Omitting `case null` because pattern matching reads as if it handles
   null.** The switch compiles, passes every test with a present value, and
   throws on the first absent one.
5. **Hand-writing `equals` and `hashCode` for a value type**, or writing
   `equals` alone. Error Prone catches the second where it runs. Nothing
   catches the first, which drifts on the next field addition.
6. **Treating `List.copyOf` in a compact constructor as covering an array
   component.** It does not compile for an array, so the reflex fix is
   `.clone()`, which fixes exposure and leaves equality broken.
7. **`Optional.of(map.get(key))`.** The shape reads as the careful choice and
   is the one that throws.
8. **`implements Comparable` over one field of a multi-field type**, then a
   `TreeSet` three files away that silently drops the ties.
9. **Citing Data-Oriented Programming's 2022 principles**, whose fourth was
   "validate at the boundary". The v1.1 write-up (2024) replaced it with
   "separate operations from data". A rule set citing the original is citing
   guidance its own author withdrew.
