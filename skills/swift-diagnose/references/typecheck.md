# Type-check failures and slow builds

Measured on Swift 6.4.0 and 6.3.3, Linux x86_64 (measured 2026-10-10). The gate
that keeps expression cost bounded is SW-LANG-07, at a limit of 200 ms. This file
is the diagnosis side.

Contents: [The error hides the real error](#the-error-hides-the-real-error) ·
[Find the slow expression](#find-the-slow-expression) · [Fixes](#fixes) ·
[Flags through SwiftPM](#flags-through-swiftpm) · [Ceiling](#ceiling)

## The error hides the real error

`error: the compiler is unable to type-check this expression in reasonable time; try breaking up the expression into distinct sub-expressions`
often means a type error exists somewhere inside the expression and the solver
gave up before naming it. Split first and read the first real error before
changing anything else.

```swift
let a = 3
let b = 2.0
let c = 4

// Fails with "unable to type-check" after about 4 s.
let whole = Double(a) + 2 + b * 1.5 + Float(a) + Double(c) / 2 + 3.25

// Split: the real error appears in under 0.1 s.
let head = Double(a) + 2 + b * 1.5
let tail = head + Float(a)  // binary operator '+' cannot be applied to operands of type 'Double' and 'Float'

// Fixed: every operand is a Double.
let fixed = head + Double(Float(a)) + Double(c) / 2 + 3.25
```

Measured with `swiftc -typecheck` on this one file: the whole expression failed
after 4128 ms with the "unable to type-check" message, and the split showed
`binary operator '+' cannot be applied to operands of type 'Double' and 'Float'`
in 74 ms. Under `swift build` the same case took 4.9 s and 0.8 s (SW-CORE-20).
Wrapping the operand as `Double(Float(a))` compiled in 79 ms. Casting
the whole expression, or raising a solver threshold, would have buried the
mismatch.

## Find the slow expression

A slow build with no error: ask the compiler to name the expressions over a
budget. The first command prints a warning per expression and exits 0. The
second turns each into an error, so it exits 1 on a violation and 0 when clean.

```sh
swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200
swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200 -Xswiftc -warnings-as-errors
```

Plant, `main.swift` (five rows; the `0.5 * 2` value expression is what makes it
slow, a row of plain literals type-checks fast):

```swift
let rows = [
    ["k": 0, "v": 0.5 * 2, "s": "x0"],
    ["k": 1, "v": 0.5 * 2, "s": "x1"],
    ["k": 2, "v": 0.5 * 2, "s": "x2"],
    ["k": 3, "v": 0.5 * 2, "s": "x3"],
    ["k": 4, "v": 0.5 * 2, "s": "x4"],
]
```

Output on 6.4.0: `warning: expression took 429ms to type-check (limit: 200ms)`
with a `file:line:column` (exit 0), and `error: expression took 448ms ...`
(exit 1) under `-warnings-as-errors`. The annotated twin
(`let rows: [[String: any Sendable]] = [...]`) built clean, exit 0 in both
runs. `-warn-long-function-bodies=200` names whole functions the same way.

Growth is steep. The plant took 346 ms at 4 rows, 3168 ms at 5, and failed
outright at 6 (measured 2026-10-10, 6.4.0).

## Fixes

Fix by structure, never by limit:

| Cause | Fix |
|---|---|
| A literal array or dictionary of mixed numeric and string rows | Annotate the type: `let rows: [[String: any Sendable]] = [...]` or use a struct |
| Mixed `Int`, `Double`, `Float` operands in one expression | Bind each sub-expression to a typed `let`, or convert each operand once |
| A long chain of `+`, `??` or closures | Extract a local function, or split into typed `let` bindings |

The annotated 20-row plant compiled in 59 to 75 ms where the unannotated 5-row
plant took seconds. A threshold flag such as `-solver-expression-time-threshold`
raises the budget and hides the cost, so it is not a fix.

## Flags through SwiftPM

The compiler flags need the `-Xswiftc -Xfrontend -Xswiftc` triple prefix on the
command line. In a manifest they are `unsafeFlags`, which SwiftPM accepts only
for a root package (SW-PKG-04). Gate them in CI, not in a published manifest.

## Ceiling

The measure is wall-clock time. A loaded shared runner can flap an expression
that sits near the limit. Re-run once on a quiet machine before declaring a
regression, and never edit the limit to pass (SW-CORE-17).
