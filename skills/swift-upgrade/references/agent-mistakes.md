# What agents get wrong in a Swift upgrade

Load this from the last section of swift-upgrade. An editorial order, not a measured
one. The step in parentheses is the part of the procedure that prevents it.

1. **Silences every Swift 6 error with `nonisolated(unsafe)` or `@unchecked
   Sendable`.** It builds green in Swift 6 mode. Only the added-lines delta tells it
   from the ladder result (U5).
2. **Turns a gate green by weakening it**: `[.v5]`, `@preconcurrency`, a suppression,
   a dropped `-warnings-as-errors`, a longer timeout (U10, SW-CORE-01).
3. **Uses a flag as the migration.** `-swift-version 6` and
   `-strict-concurrency=complete` reach dependencies and print "language mode was
   overridden" (U3).
4. **Removes `[.v5]` first and fixes the fallout, never probing.** Non-concurrency
   warnings appear at the flip that complete checking never showed: the `#file`
   ones surface in U4 once `ConciseMagicFile` is in the loop, the `open var` one is
   new at the flip (U7).
5. **Writes `swift package migrate --targets A` from the official guide.** The flag
   is `--target`, and `--targets` exits 64 (U8).
6. **Pastes `.enableUpcomingFeature("NonisolatedNonsendingByDefault")`** or calls
   `migrate --to-feature StrictConcurrency`. The first flips behaviour silently, the
   second exits 64 (U8).
7. **Reads `migrate` exit 0 as success.** On a shadowed manifest it rewrites sources,
   passes `-warnings-as-errors` and enables nothing (U8).
8. **Accepts `migrate` output unreviewed** and re-gates only the floor. The current
   toolchain may deprecate what the fix-it emitted (U8).
9. **Declares the upgrade done on a plain green build**, not on `-warnings-as-errors`
   exit 0 of the build with tests on both toolchains (U7).
10. **Writes `defaultSwiftSettings:`, `withDeadline`, stdlib `FilePath` or a
    typed-throws `Task` from proposal text.** The first three do not compile and the
    last crashes the frontend (U10.1 to U10.3).
11. **Hard-codes `swift:6.4` in CI beside a `.swift-version` that says something else.**
    Both builds pass (U1).
12. **Adds `#if compiler` splits to make one leg green** instead of reporting S6.
13. **Edits a generated file** to clear a diagnostic, and the next regeneration
    reverts it (U5).
