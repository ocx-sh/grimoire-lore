---
title: "BZL-RUST — rules_rust, crate_universe, toolchains, build scripts, prost, IDE and test parity"
topic: bazel-rust
family: BZL-RUST
model: opus
consolidates:
  - bazel-rust/crate-universe-lockfiles-and-repin.md
  - bazel-rust/cargo-build-scripts-and-cross-compilation.md
  - bazel-rust/rust-ide-lint-and-test-parity.md
  - bazel-followups/rust-toolchain-pinning-prost-rustdoc-and-private-registry.md
  - bazel-followups/gazelle-plugin-maturity-per-language.md
  - bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md
  - bazel-followups/macos-windows-sandbox-and-runfiles-parity.md
  - bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md
builds_on:
  - bazel-bzlmod-and-repo-rules.md (BZL-MOD-02, -04, -05, -10, -13, -16 — ruleset read in full per the revision addendum)
  - bazel-hermeticity-determinism.md (BZL-HERM-01, -02, -04, -05, -06, -07, -13, -17, -18, -24)
  - bazel-architecture-monorepo.md (BZL-ARCH-11, -12, -13, -14)
  - bazel-testing.md (BZL-TEST-02, -10, -22, -24, -25)
  - bazel-python.md (BZL-PY-25 — settles the cross-family row M-I-15)
  - bazel-caching-rbe.md (BZL-CACHE-04; house shape, first 120 lines)
grounded_in:
  - bazel-frame.md (body + all seven Corrections blocks; the Measurement wave block wins over any earlier inference)
  - bazel-topic-map.md ("How to read this"; "Conflicts resolved" 1-18; "The map" § I, 16 rows; "Staged for wave 3" § Group 7)
  - bazel-audit/fleet-bazel-readiness.md
  - bazel-audit/build-contracts-and-ci-posture.md
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
date: 2026-09-05
revised: 2026-09-06
---

# BZL-RUST

## Verdict

1. **crate_universe's freshness gate is the inverse of Bzlmod's, and the
   revision addendum's premise is wrong for one of the four rules it names.**
   The addendum instructs reuse of BZL-MOD-02's shape (an opt-in
   `--lockfile_mode=error` leg) for `cargo-bazel-lock.json`. On primary-source
   evidence the dive wins: `determine_repin()` runs `cargo-bazel query` on
   **every** ordinary build and hard-`fail()`s on a digest mismatch unless
   `CARGO_BAZEL_REPIN` is set
   ([crate-universe-lockfiles-and-repin.md:57,88-95](bazel-rust/crate-universe-lockfiles-and-repin.md)).
   There is no flag to add; the thing that must be **absent** is the environment
   variable. BZL-RUST-02 states the gate that way. BZL-MOD-04 (merge driver),
   BZL-MOD-05 (validate, never hardcode the schema) and BZL-MOD-10
   (regenerate-then-diff) transfer verbatim and are cited by ID in BZL-RUST-05,
   -06 and -04. No wave-2 rule is factually wrong; the *instruction* is.

2. **Two lockfiles, one gate, and the gate only exists if you asked for it.**
   Omit the `lockfile` attribute and `determine_repin()` returns `True`
   unconditionally — every build silently re-splices, forever, with no freshness
   check possible
   ([crate-universe-lockfiles-and-repin.md:58,91](bazel-rust/crate-universe-lockfiles-and-repin.md),
   `generate_utils.bzl:400-402`). This is the single worst configuration in the
   ruleset and it is exactly the one an unsure agent reaches for. BZL-RUST-01 is
   MUST, and it covers the non-root bzlmod case too, where a missing lockfile is
   an outright `fail()` and repinning is disabled unconditionally
   (`extensions.bzl:611-625`).

3. **`bazel sync` is gone, the ruleset's own current docs still print it, and
   the replacement flag surface is now measured rather than inferred.** Bazel
   9.0.0 deleted the command ("Use `bazel fetch --all` instead", Bazel CHANGELOG
   9.0.0-pre.20250526.2); `main`@`51f3042` (2026-09-02) and the live rendered
   `crate_universe_bzlmod.html` both still instruct
   `CARGO_BAZEL_REPIN=1 bazel sync --only=crates`
   ([crate-universe-lockfiles-and-repin.md:241-247](bazel-rust/crate-universe-lockfiles-and-repin.md)).
   Measured 2026-09-06 against the real binaries: `bazel help fetch --long`
   lists `--repo`, `--all`, `--configure` and `--force` on **both** 8.7.0 and
   9.2.0, so `bazel fetch --repo=@<repo>` is valid across the whole supported
   range and needs no version branch. (A `bazel help` read is a property of the
   binary, not of the host, so no WSL2 caveat applies.) Version boundary: the
   `sync` recipe works on Bazel 7 and 8 and hard-fails on 9.0.0+ (GA
   2026-01-20). **This is a live instance of map Conflict 8 in the direction the
   map only got one half of** — a ruleset's own canonical documentation behind
   its own supported Bazel range, not ahead of it. It is not an isolated slip
   either: the 0.74.0 tag's `examples/proto/README.md` still links
   `rust_proto.html#rust_proto_library`, a page for a rule the ruleset no longer
   ships (Verdict 17). BZL-RUST-03.

4. **Version boundary on the source reads themselves.** Two dives read the
   0.74.0 tag (2026-08-28); one read `main`@`51f3042` (2026-09-02) and
   attributed the results to 0.74.0. Since 0.74.0 itself landed
   [#4133](https://github.com/bazelbuild/rules_rust/pull/4133) ("reduce
   `cargo-bazel-lock.json` size by avoiding unnecessary serialization") in the
   same serializer file, `main` is strictly after the tag and the two are not
   interchangeable. Every rule keyed to a `main` read is scoped
   **"rules_rust 0.74.0 through main@51f3042 (2026-09-02)"** rather than to the
   tag alone. Applies to BZL-RUST-01, -02, -06, -08, -17. The 2026-09-06
   follow-up round read the **0.74.0 tag throughout**, so every rule it added
   (BZL-RUST-31 through -33, -36, -37) is tag-scoped, not `main`-scoped.

5. **Correction, dive against dive: the `crate.annotation()` value encodings are
   not portable between WORKSPACE and bzlmod.**
   [cargo-build-scripts-and-cross-compilation.md:107-114](bazel-rust/cargo-build-scripts-and-cross-compilation.md)
   gives a worked example `crate.annotation(build_script_use_cc_toolchain = 0)`.
   That is the WORKSPACE macro's `int` form; the bzlmod tag class declares the
   same attribute as a three-valued **string** (`"auto"`/`"on"`/`"off"`, default
   `"auto"`) — `extensions.bzl:1322-1330`, read against `crate.bzl` by the
   sibling dive
   ([crate-universe-lockfiles-and-repin.md:194](bazel-rust/crate-universe-lockfiles-and-repin.md)).
   **The lockfiles dive wins**: it read both attribute declarations, the
   build-scripts dive read one. The two files are documented as kept "in sync"
   (`extensions.bzl:1290`), which is precisely why substitution looks safe.
   BZL-RUST-17 is MUST because of it.

6. **`crate_universe` is under active repair; guidance dated after 2026-08-28
   must say so.** Seven of roughly 32 entries in the 0.74.0 changelog are
   crate_universe correctness fixes landed in the preceding six weeks — a
   non-root lockfile-checksum bug, a `cargo-lock` v10→v11 schema bump, Windows
   GNU staticlib naming, `.bazelignore`-aware splicing, vendoring's buildifier
   config handling, the lockfile-size reduction, and build-script override keys
   ([crate-universe-lockfiles-and-repin.md:225-237](bazel-rust/crate-universe-lockfiles-and-repin.md)).
   This is a *dating* obligation on the shipped depth file, not a rule row: no
   verification would change a diff. The depth file carries the date and the
   count; nothing in it may be phrased as settled legacy behaviour.

7. **Cargo stays the dependency source of truth by design; it is not the IDE
   source of truth any more (M-I-16, decided here, deliberately no rule row).**
   mmapped.blog's resolution — keep Cargo files "purely for IDE/dev convenience"
   while CI runs on Bazel — was a workaround for a gap
   `rust_analyzer:setup` has since closed: after setup, rust-analyzer, the
   proc-macro server and rustfmt all come from the Bazel toolchain with no host
   Rust install
   ([rust-ide-lint-and-test-parity.md:54,75](bazel-rust/rust-ide-lint-and-test-parity.md)).
   The *resolution* half is permanent, not a phase: crate_universe is built on
   `cargo metadata` and `Cargo.lock`, and its digest hashes the manifests
   ([crate-universe-lockfiles-and-repin.md:84](bazel-rust/crate-universe-lockfiles-and-repin.md)).
   So "we keep Cargo around for the IDE" is a stale reason after adoption; "we
   keep Cargo because crate_universe consumes it" is the correct, permanent one.
   Following the `bazel-python.md` precedent for M-J-15, a rule that says only
   "state the right reason" carries no verification that changes a diff, so this
   stays a Verdict item. **One narrow mechanical consequence did earn a row:**
   after adoption `rust-toolchain.toml`'s only remaining live consumer is a bare
   `cargo build`/`cargo test` outside Bazel, and rules_rust never reads that file
   at any version — BZL-RUST-32.

8. **Correction to the map, M-I-13: half its premise is wrong.** The row reads
   "the fleet has two fork-submodules and four pinned-rev git crates, and neither
   has a clean registry-lookup analogue". The four pinned-rev crates have a
   fully native path — `crate_context.rs:795-812` models a git-sourced
   `Cargo.lock` entry as a first-class `SourceAnnotation::Git` carrying
   `shallow_since`/`patches`/`patch_args`/`patch_tool`, and Cargo's own
   `rev`-over-`branch` reproducibility guidance is echoed in `crate.spec()`'s
   docstring
   ([crate-universe-lockfiles-and-repin.md:196-200](bazel-rust/crate-universe-lockfiles-and-repin.md)).
   Only the **fork-as-submodule consumed through a Cargo `path` dependency** has
   no analogue, because a path dep never appears in `Cargo.lock` at all. The two
   halves split (BZL-RUST-09), and the submodule half stays a `BZL-ARCH`
   `git_override`-versus-`bazel_dep` decision.

9. **Correction to the map, M-I-09: the question has no answer and the row's
   premise that a boundary exists is unsupported.** The map asks "at what
   codebase size does rust-analyzer stop working". No source in the corpus states
   a crate-count or line-count threshold. One credible account (mmapped.blog,
   ~600k lines, "a few hundred" packages) reports it choking where it worked in a
   prototype; the tool shipped two rust-analyzer fixes in the current release
   ([rust-ide-lint-and-test-parity.md:152-160](bazel-rust/rust-ide-lint-and-test-parity.md)).
   Settled as **"no number exists"** — a rule asserting one is inventing it. This
   is the family's one genuinely unaddressed research question; the 2026-09-06
   round did not touch it.

10. **Correction to the audits, measured 2026-09-06: three `build.rs` citations
    have drifted.** `fleet-bazel-readiness.md:119` cites `build.rs:14-21` for the
    tarball fallback comment; measured, the fallback is documented at
    `ocx/crates/ocx_cli/build.rs:8-10` (module docstring) and `:33-34` (inline),
    while `:14-21` is the three-group enumeration.
    [cargo-build-scripts-and-cross-compilation.md:218](bazel-rust/cargo-build-scripts-and-cross-compilation.md)
    cites `build.rs:59-77` for the caught-`Err` branch; measured it is `:52-74`,
    with the `Err(error)` arm at `:71-73` and the
    `cargo:warning=vergen-gix metadata unavailable (no .git/?)` string at `:72`.
    Also internal to the lockfiles dive: its Summary labels
    `generate_utils.bzl:400-402` as `crates_repository.bzl:401-402` (the URL is
    right, the label is not). Content is unchanged in all three cases; cite the
    number you measure — map Conflict 13's own lesson, and the same failure
    BZL-CACHE Verdict 3 recorded.

11. **The fleet cannot exhibit a single rule in this family today.** Zero fleet
    repos use `rust_*` rules, `crate_universe`, `crates_repository` or
    `crates_vendor`
    ([fleet-bazel-readiness.md:115,275](bazel-audit/fleet-bazel-readiness.md);
    frame wave-1 correction 7). Every row is grounded on the ruleset's own
    source, its release notes, its issue tracker, or Bazel's own changelog —
    shape F grounding, per the map's convention. `rules_ocx` compiles no Rust at
    all (0 hits for `rust_binary`/`crates_repository`/`cargo_build_script`
    across the repo, measured 2026-09-06), so this family binds nothing in the
    one Bazel repository that exists.

12. **BZL-RUST-07 is a project decision, marked pinned, and its evidence is
    deliberately weaker than the rest.** No primary source states which of
    `crates_repository` and `crates_vendor` should be the ecosystem default; the
    criterion is this project's synthesis from the ruleset's stated design intent
    (`crates_vendor.bzl:596-600`) plus the structural fact that a non-root bzlmod
    consumer can never repin
    ([crate-universe-lockfiles-and-repin.md:251-253,312](bazel-rust/crate-universe-lockfiles-and-repin.md)).
    The house standard sends argued-only rules to CONSIDER; a **pinned** project
    decision is graded on its consequence instead, as BZL-ARCH-11 and BZL-CACHE
    Verdict 9 already establish. SHOULD, pinned, exception stated here so it is
    visible rather than accidental. BZL-RUST-33 (prost) is pinned on the same
    grounds and for the same reason.

13. **The C++-toolchain answer moved a layer up rather than going away
    (M-I-14).** `rules_rust#1601` closed 2022-10-21 and every core rule now
    declares `@bazel_tools//tools/cpp:toolchain_type` with `mandatory = False`
    at 0.74.0 — so the rule-level requirement the 2024 practitioner account
    reported is genuinely gone. But `cargo_build_script`'s `use_cc_toolchain`
    build setting still defaults `True` ruleset-wide, and Bazel's own C++
    autoconfiguration probe runs at module-extension setup regardless of graph
    content
    ([cargo-build-scripts-and-cross-compilation.md:173-194](bazel-rust/cargo-build-scripts-and-cross-compilation.md)).
    Guidance must state both halves; BZL-RUST-14 needs **both** switches, not
    just the `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN` one BZL-HERM-07 already names.

14. **Build-script hermeticity inherits BZL-HERM wholesale and adds exactly one
    structural absence — and `root_path` did not weaken it.** Network
    reachability (BZL-HERM-02), the Bazel-8-vs-9 environment-inheritance split
    (BZL-HERM-01), `--repo_env` versus `--action_env` (BZL-HERM-04/06), the
    foreign-build-system `PATH` pin (BZL-HERM-13) and the toolchain-default
    non-hermeticity finding (BZL-HERM-24) are cited, never restated. The one
    thing this family adds: `CARGO_MANIFEST_DIR` under `cargo_build_script` is a
    synthesized, runfiles-backed path that never contains `.git/`, and nothing
    declares `.git` as an input — so a `vergen`/`git2`/`gix` build script hits
    its tarball fallback on **every** Bazel build including a clean CI checkout,
    not only on genuine tarball builds
    ([cargo-build-scripts-and-cross-compilation.md:73,101](bazel-rust/cargo-build-scripts-and-cross-compilation.md)).
    [#4243](https://github.com/bazelbuild/rules_rust/pull/4243) (merged
    2026-08-27, one day before the tag) does **not** change this: read as a diff
    it adds three lines to `cargo_build_script_wrapper.bzl` forwarding
    `root_path` into the internal `rust_binary` that *compiles* the script, and
    never touches `cargo_build_script.bzl`'s `_cargo_build_script_impl`
    (`:433-464`), the only place `CARGO_MANIFEST_DIR` is computed. BZL-RUST-12
    and -13 stand unchanged.

15. **The silent-green failures are the ones worth the MUST budget.** Three
    rules in this family catch a target set that passes while testing nothing: a
    `rust_test_suite` whose `srcs` glob matched nothing (`test_suite`
    special-cases an empty `tests` list as "run everything", and the macro's own
    `restrict_<name>` tag suppresses that — the ruleset ships
    `test/empty_suite/BUILD.bazel` as a regression fixture for exactly this),
    doc examples with no `rust_doc_test` (the one Cargo kind Bazel never
    auto-generates under any mechanism), and a fixture path absent from `data`
    that passes locally and fails hermetically
    ([rust-ide-lint-and-test-parity.md:185-189,162-183](bazel-rust/rust-ide-lint-and-test-parity.md)).
    BZL-RUST-30, -28, -29. **A fourth now joins them**, from a different layer:
    a toolchain nobody pinned. A root module that `use_extension`s `rust` and
    never calls `rust.toolchain()` still builds, silently, against rules_rust's
    own default — BZL-RUST-31.

16. **The Rust toolchain is hermetic but not pinned, and its default floats on
    almost every release.** `DEFAULT_RUST_VERSION` measured across five tags:
    1.95.0 (0.70.0) → 1.96.0 → 1.97.1 → 1.97.1 → **1.98.0** (0.74.0), each
    paired with a re-dated nightly, four of five releases moving it
    (`rust/private/common.bzl:34,36`, read at each tag). Worse than a floating
    default: `_rust_impl`'s selection line is
    `toolchains = root.tags.toolchain or rules_rust.tags.toolchain`
    (`rust/extensions.bzl:116`), and rules_rust's own `MODULE.bazel:47-49`
    declares a **non-dev** `rust.toolchain(edition = "2021")`. So a root module
    that never calls `rust.toolchain()` at all gets a fully working toolchain
    from the ruleset's own tag, and a `bazel_dep` version bump re-pins the
    compiler with zero signal. This is the exact Rust analogue of BZL-PY-01's
    Python finding: the rule is "pin explicitly", never "register at all". Three
    supporting facts, all measured at the 0.74.0 tag: the default `versions`
    list registers **both** a stable and a nightly toolchain and downloads both,
    while selection is a flat `channel` build setting defaulting `"stable"` with
    no MSRV awareness anywhere; a bare `"nightly"`/`"beta"` is a hard `fail()`
    ("iso_date must be specified…", `repository_utils.bzl:842-843`), not a fuzzy
    default; and an empty `sha256s` is backstopped by the committed
    `known_shas.bzl` table, with a real but narrow gap — a version/target
    combination absent from that table resolves `sha256 = None` and downloads
    with **no integrity check at all**, silently. BZL-RUST-31.

17. **Rust protobuf under Bazel has exactly one live path, and it is not the one
    an agent will name.** At 0.74.0 there is no `rust_proto_library` and no
    `proto`/`protobuf` directory under `extensions/` — the only shipping rules
    are `rust_prost_library` + `rust_prost_toolchain`, and they live in
    **`rules_rust_prost`, a separate BCR module** at the same 0.74.0 version
    that `bazel_dep(name = "rules_rust")` does not pull in. Tonic is not a second
    rule: `tonic_plugin`/`tonic_runtime` are attributes on the same toolchain,
    and the gRPC codegen is done by the `protoc-gen-tonic` protoc plugin, not by
    the `tonic-build` crate a `build.rs` uses today. A working default toolchain
    **does** ship and auto-register (`//:default_prost_toolchain`, wired to
    vendored prost 0.13.1 / tonic 0.12.1), contradicting the docstring's blanket
    "the prost and tonic rules do not specify a default toolchain"; the real
    reason to author your own is a type-identity mismatch — generated code
    references `tonic::Request<T>` from the *toolchain's* runtime, and a service
    crate resolving a different `tonic` through its own crate_universe graph gets
    "expected `tonic::Request`, found `tonic::Request`". BZL-RUST-33. **Frame
    correction:** the frame's fleet table reads "Protobuf | zero `.proto` files";
    `creeptd-ng/crates/creeptd-proto` compiles seven of them across five
    `tonic_build` steps. The count was wrong.

18. **Two credential universes live inside one crate_universe, and
    `--credential_helper` reaches only one of them.** The per-crate tarball fetch
    (`mode = "remote"`, the default) renders as a plain `http_archive(url=…,
    sha256=…)` in the generated repo (`repo_http.j2`) — an ordinary Bazel
    download, covered by `--credential_helper` (BZL-CACHE-04) and `.netrc` like
    any other, though crate_universe exposes no `auth`/`netrc` attribute of its
    own. The lockfile/metadata phase (`cargo-bazel splice`/`query`) instead runs
    through `repository_ctx.execute()` wrapping a real `cargo` binary
    (`common_utils.bzl:70-112`) — an arbitrary subprocess Bazel's downloader
    stack cannot see at all, governed entirely by Cargo's own credential
    machinery. The sanctioned recipe for the second half is the ruleset's own,
    verbatim and naming Artifactory: *"make sure you set the
    `CARGO_BAZEL_ISOLATED=false` … If not, crates_universe will not be able to
    pull from your private registry"* (`extensions.bzl:69-73`, added by
    [#3278](https://github.com/bazelbuild/rules_rust/pull/3278), merged
    2025-02-20). BZL-RUST-02's escape hatch is therefore documented, not
    inferred — and it has a less blunt companion: `cargo_config =` is accepted on
    both `crates_repository` and `crate.from_cargo`/`from_specs`, symlinked into
    the synthetic `CARGO_HOME` while `isolated = True` still holds
    (`common_utils.bzl:125-129`), with cargo-bazel's own splicer parsing
    `[registry]`/`[registries.NAME]`/`[source.NAME]` including `replace-with`
    against an Artifactory-shaped unit-test fixture (`cargo_config.rs:220-267`).

19. **Documented gaps, closed as gaps rather than left open.** (a) **`rust_doc`
    has no staleness gate and needs none.** Zero `diff_test` hits over the whole
    0.74.0 tree; `rust_doc`'s output is a zip meant for hosting, not a
    checked-in file diffed against source, and `rustdoc_compile_action()`
    (`rust/private/rustdoc.bzl:72-90`) builds purely from the toolchain and the
    target's `CrateInfo`, with no Build-API input — so rustdoc HTML is a
    function of the pinned Rust toolchain and never of the Bazel major. The
    `rules_ocx` stardoc-goldens problem (frame Decision 2) does not transfer. No
    row; the narrow case of a team committing rendered rustdoc HTML is
    project-specific and out of this family's scope. (b) **Rust coverage on
    Windows is unverified-by-upstream, not known-broken.** rules_rust 0.74.0's
    own `index.md` disclaims Windows support fleet-wide ("We do not have
    sufficient maintainer expertise… we have had to disable many tests in CI"),
    its `coverage.md` never mentions runfiles or Windows, and its
    `collect_coverage.rs` carries a runfiles-optional fallback exercised today
    only for split post-processing. BZL-TEST-24 owns the verification split;
    BZL-RUST-37 owns the disclosure obligation. (c) **The prost module-layout
    question is a spike, not a source read** — whether `rust_prost_transform`'s
    `prost_opts`/`tonic_opts` reproduces `creeptd-proto`'s
    `extern_path`-flattened `crate::common` layout was not run end to end. Named
    in Open questions with the reason it cannot be answered by reading.

20. **Coverage mechanics here are Bazel's, not the ruleset's.**
    `collect_coverage.sh` is the process Bazel substitutes for the test binary
    whenever `InstrumentedFilesInfo` turns on `collectCodeCoverage`, and in the
    default (non-split) configuration it chains into `$LCOV_MERGER` inside the
    same spawn — so coverage post-processing spends the test's own
    `size`/`timeout` budget for **every** language, rules_rust included
    (BZL-TEST-02). rules_rust supplies only the instrumentation-to-lcov
    translation: `-Cinstrument-coverage` → `.profraw` →
    `llvm-profdata merge --sparse` → `llvm-cov export -format=lcov`
    (`util/collect_coverage/collect_coverage.rs:179-239`). Both
    `--experimental_split_coverage_postprocessing` and
    `--experimental_fetch_all_coverage_outputs` default **`false`** at 8.8.0 and
    9.2.0, which makes the shared-budget property the default, not the exception.
    BZL-RUST-26 states only what is Rust-specific and cites the rest.

## The ruleset

**This topic owns `BZL-RUST` exclusively.** Thirty-seven rules, 24 MUST, 11
SHOULD, 2 CONSIDER. Rows are grouped by the check that catches them: 01-08 and
31-33 share one read of `MODULE.bazel`/`WORKSPACE*` plus one `git check-attr`;
10-18 share one grep sweep over `**/build.rs` and the annotation call sites;
19, 34 and 35 share one read of the Gazelle directives plus one `bazel query`;
20-25 share one read of `.bazelrc*` plus one `git ls-files`; 27-30 share one
`bazel query` pass; 36 and 37 ride the CI-workflow read that 02 already needs.

**Every grep in this table reads the calling repository's own
`BUILD.bazel`/`MODULE.bazel`/`.bzl`/`.rs` text only. Generated-repo BUILD and
`.bzl` content — everything `crate_universe` renders into `@crate_index` and its
spokes — is out of a grep's reach by construction** (frame wave-2 correction 9).
Where a rule's real subject is generated content, its verification reads the
*configuration that produced it*, and that limit is stated on the row.

**Flag-surface verifications must read both help surfaces.** A Bazel flag can be
a command option or a startup option, and `bazel help build --long` shows only
the first — measured, `--experimental_remote_repo_contents_cache` exists from
8.8.0 as a startup option and is invisible to the command help
([flag-defaults-and-trivial-builds-across-versions.md](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)).
Any row here that says "confirm the flag exists" means
`bazel help <command> --long` **and** `bazel help startup_options`.

**pinned** marks a rule that fixes a project decision rather than deriving a
fact. Rules belonging to another family are cross-references, not rows:
`--instrumentation_filter` scoping is **BZL-TEST-22**; the
coverage-inside-the-test-budget property is **BZL-TEST-02**; the Windows
coverage-leg verification split is **BZL-TEST-24**; `manual`-tag semantics are
**BZL-TEST-10**; generator maturity and the `gazelle_test` gate are
**BZL-ARCH-11/-12/-13/-14**; the Rust-binary-under-a-Python-test seam (M-I-15) is
**BZL-PY-25**; the fork-submodule-to-Bazel-module question is **BZL-ARCH**'s
`git_override`-versus-`bazel_dep` decision; `--credential_helper` configuration
is **BZL-CACHE-04**; `Cargo.toml`/`Cargo.lock`, `rust-toolchain.toml`,
`clippy.toml` and `rustfmt.toml` hygiene is covered by the sibling `rust-cargo`
and `rust-quality` lore sets.

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles | Depends on |
|---|---|---|---|---|---|---|---|
| **BZL-RUST-01** | Set an explicit `lockfile =` on every crate-universe instance — `crates_repository(lockfile = "//:cargo-bazel-lock.json")` under WORKSPACE, `crate.from_cargo(lockfile = ...)`/`from_specs(lockfile = ...)` under bzlmod — including in a non-root module. | Without it `determine_repin()` returns `True` unconditionally: every build silently re-splices, forever, and no freshness gate is even possible. In a non-root bzlmod module the same omission is an outright `fail()`, because repinning is disabled across module boundaries and the consumer must trust a permanently-current producer lockfile. | `grep -n -A20 'crates_repository(\|crate\.from_cargo(\|crate\.from_specs(' MODULE.bazel WORKSPACE*` and confirm a `lockfile =` inside every block. **An instance with no `lockfile =` is the FINDING; empty output (no crate-universe instance at all) = pass by default.** | MUST | Bazel 7/8/9; rules_rust 0.74.0–main@51f3042; shapes B, C, F | M-I-01, M-I-02 | — |
| **BZL-RUST-02** | Scope every `CARGO_BAZEL_*` environment variable to the single job that needs it — `CARGO_BAZEL_REPIN`/`REPIN` to a `workflow_dispatch`- or `schedule`-triggered repin job, `CARGO_BAZEL_ISOLATED=false` to a private-registry job — treat an ordinary build/test job that leaves `CARGO_BAZEL_REPIN` unset as the drift gate itself, and reach for a committed `cargo_config =` file before reaching for `ISOLATED=false`. | `determine_repin()` already shells to `cargo-bazel query`, recomputes the digest and hard-`fail()`s on a mismatch on every build — stricter by default than Bzlmod's opt-in `--lockfile_mode=error`, so no new check may be invented. An always-on `REPIN` inverts the gate into a silent regenerate. `isolated = True` (the default) exists specifically to keep host `~/.cargo/config.toml` state out of generated targets; disabling it globally reintroduces that leak for jobs that never needed it. `CARGO_BAZEL_ISOLATED=false` **is** the ruleset's own documented private-registry recipe, naming Artifactory (`extensions.bzl:69-73`, [#3278](https://github.com/bazelbuild/rules_rust/pull/3278) merged 2025-02-20) — but the narrower `cargo_config` attribute reaches a private `[registries.NAME]`/`[source]` block while `isolated = True` still holds, by symlinking the file into the synthetic `CARGO_HOME` (`common_utils.bzl:125-129`). Name which network path is failing before reaching for either: the per-crate tarball fetch renders as a plain `http_archive` and **is** covered by `--credential_helper`/`.netrc`; the `cargo-bazel splice`/`query` phase is a `repository_ctx.execute()` subprocess Bazel's downloader cannot see. | `grep -rn 'CARGO_BAZEL_REPIN\|CARGO_BAZEL_ISOLATED\|\bREPIN\b' .bazelrc* .github/workflows/ taskfile*.yml`. **EMPTY in the build/test lanes = the default gate is intact = pass.** Any `REPIN` hit must resolve to a manual/scheduled job, never `push`/`pull_request`; any `ISOLATED=false` hit must be scoped to a named private-registry job, never a base config, **and must carry a note saying why `cargo_config =` was insufficient — an unexplained global `ISOLATED=false` is the FINDING.** | MUST | Bazel 7/8/9; rules_rust 0.74.0–main@51f3042; shapes B, C, F | M-I-02, M-I-03 | BZL-MOD-02 (shape inverted, see Verdict 1), BZL-CACHE-04 |
| **BZL-RUST-03** | Repin with `CARGO_BAZEL_REPIN=1 bazel fetch --repo=@<repo>` or a plain build of a target under that repo; never `bazel sync --only=<repo>`, whatever the ruleset's own docs print. | `bazel sync` was removed in Bazel 9.0.0 ("Use `bazel fetch --all` instead" — Bazel CHANGELOG, 9.0.0-pre.20250526.2); the recipe hard-fails the day the pin crosses 9.0.0. Both the `extensions.bzl` docstring on `main`@51f3042 and the live rendered `crate_universe_bzlmod.html` still instruct the removed command, eight months after GA — so copying from the primary source is exactly what produces the wrong command. The replacement needs no version branch: `--repo` is present on 8.7.0 and 9.2.0 alike. | `grep -rn 'bazel sync' . --include='*.md' --include='*.sh' --include='*.yml' --include='*.bzl'`. **EMPTY = pass.** Then confirm the replacement against the pinned binary: `bazel help fetch --long` must list `--repo`, `--all`, `--configure` and `--force` — **all four measured present on both 8.7.0 and 9.2.0 on 2026-09-06; a `bazel help` read is a property of the binary, not the host, so this needs no CI-runner caveat.** **Empty output from `bazel help fetch` for a flag means it does not exist on that version — an answer, not a pass.** | MUST on Bazel 9.0.0+; SHOULD proactively on 7/8 | Bazel 9.0.0+ (GA 2026-01-20); flag surface measured on 8.7.0 and 9.2.0; rules_rust 0.74.0–main@51f3042; shapes B, C, F | M-I-03 | BZL-MOD-13 |
| **BZL-RUST-04** | For a `crates_vendor` setup the CI drift check is `bazel run //<pkg>:crates_vendor && git diff --exit-code -- <vendor_path>`; a green build alone proves nothing about vendored-tree freshness. Tag the `crates_vendor` target `tags = ["manual"]`. | `crates_vendor` writes committed source that no ordinary build re-derives, and `determine_repin()`'s fail-fast guards fetch-time repos only. The regenerate-then-diff shape is BZL-MOD-10's, reused rather than reinvented. The target is `executable = True` and meant to be `bazel run`, so a wildcard build should not pick it up — the ruleset's own example carries the tag (`crates_vendor.bzl:634`). | The two-command pipeline; **exit 0 (empty diff) = the vendored tree matches regeneration = pass**, non-empty = stale output to review before merge. Separately, `bazel query 'attr(tags, manual, kind(crates_vendor, //...))'` count must equal `bazel query 'kind(crates_vendor, //...)'` count — **equal, including both EMPTY (no `crates_vendor` targets exist), = pass.** | MUST once `crates_vendor` is adopted; N/A otherwise | Bazel 7/8/9; rules_rust 0.74.0; shapes B, C, F | M-I-02 | BZL-MOD-10, BZL-TEST-10, BZL-RUST-36 |
| **BZL-RUST-05** | Give `cargo-bazel-lock.json` / `Cargo.Bazel.lock` a JSON-aware git merge driver; never `union`, `ours` or any other line-based driver — and never point Bazel's own `bazel-lockfile-merge` driver at it, which is `MODULE.bazel.lock`-schema-specific. | Identical risk shape to `MODULE.bazel.lock`: an opaque, generator-computed `checksum` that a line-based merge desyncs with **no conflict markers at all**, which also defeats any conflict-marker detection downstream. A silently bad merge is strictly worse than a visible conflict. Reusing Bazel's jq driver would parse a schema it was not written for. | `git check-attr merge cargo-bazel-lock.json` (or whatever the `lockfile =` attribute names). **Anything other than a JSON-aware driver — `union`, `ours`, `unspecified` — is the FINDING.** Setup is a `.gitattributes` line plus a per-clone `git config merge.<driver>.driver …`, so the check must confirm that config exists too. | MUST | Bazel 7/8/9; rules_rust 0.74.0; shapes B, C, F | M-I-02 | BZL-MOD-04 (shape reused verbatim; see the driver caveat) |
| **BZL-RUST-06** | After any suspected interrupted repin — a killed CI job, Ctrl-C, an OOM — validate the lockfile parses and carries a non-empty `checksum` before trusting it, and never couple review tooling to anything deeper than that. | `write_lockfile` is a plain `fs::write`, not temp-file-then-rename (`lockfile.rs:41-58`), so a mid-write kill can leave truncated JSON. The failure is loud on the next `query` ("Could not load lockfile", `query.rs:52`) but nothing auto-repairs it. The serialized shape is a cargo-bazel implementation detail with no versioned schema — it changed inside 0.74.0 itself (#4133). | `python3 -c "import json,sys; d=json.load(open('cargo-bazel-lock.json')); sys.exit(0 if d.get('checksum') else 1)"`. **There is no empty case — a parse error or a missing `checksum` IS the finding**, and the fix is `git checkout` the last-good lockfile or repin again. Any script reading nested keys beyond validity plus `checksum` is a second finding. | MUST as a recovery step | Bazel 7/8/9; rules_rust 0.74.0–main@51f3042; shapes B, C, F | M-I-03 | BZL-MOD-05 (shape reused verbatim) |
| **BZL-RUST-07** | **pinned** — Default to `crates_repository`/`crate.from_cargo` for a repository nothing else builds against; switch to `crates_vendor` (`mode = "remote"`) the moment something does — a BCR module, an internal library another module `bazel_dep`s or `git_override`s. | `crates_vendor`'s own doc names this exact case ("workspaces expected to be consumed in other workspaces", `crates_vendor.bzl:596-600`), and a non-root bzlmod consumer of `crate.from_cargo` can never repin and must trust a producer-owned lockfile permanently. Checked-in BUILD files remove that dependency for the consumer entirely — they never fetch `cargo-bazel` or evaluate a repository rule. **No primary source states a default; this is the project's call** (Verdict 12). The switch is not free: `crates_vendor`'s repin step forwards the full ambient environment (BZL-RUST-36). | Reading heuristic: does anything outside this repository `bazel_dep`/`git_override`/BCR-publish on it, now or planned? **Yes, while `crates_repository`/`from_cargo` is in use = a finding to discuss, never a mechanical failure.** No consumer = the default is correct as-is. | SHOULD | Bazel 7/8/9; rules_rust 0.74.0; shapes B, C, F | M-I-01 | — |
| **BZL-RUST-08** | Set `supported_platform_triples` to exactly the platforms the CI matrix and developer hosts actually build for: add the ones the curated default omits — Intel macOS (`x86_64-apple-darwin`) and ARM64 Windows (`aarch64-pc-windows-msvc`) — and remove any entry no target resolves to. Never reason about this list from `rust.toolchain()`'s `extra_target_triples`, or the reverse. | The default is a curated seven because splicing is `O(N²)` per triple added, stated as a source comment (`crates_repository.bzl:26-37`). That curation silently excludes two still-common host platforms, so a CI leg on either resolves wrongly; and a speculative extra pays the quadratic cost on every repin and every `generate` run for nothing. **The two curated defaults are different lists in different files**: `DEFAULT_EXTRA_TARGET_TRIPLES` (`rust/private/repository_utils.bzl:27-35`) carries three wasm triples plus both Apple and Linux arches and **zero Windows**; `SUPPORTED_PLATFORM_TRIPLES` carries neither wasm nor Intel macOS. Adjacent prose calls both "the curated default seven", which is exactly what makes the substitution look safe. | Cross-reference the CI matrix's OS/`--platforms=` list against the `supported_platform_triples` value in `MODULE.bazel`/`BUILD.bazel`. **A CI platform absent from the list is the FINDING; a list entry with no CI or developer platform resolving to it is the second; a claim about "the default triples" that does not name which of the two attributes it read is the third.** This check reads only the calling configuration — the generated crate-repo `.bzl`/BUILD text it produces is out of a grep's reach. | MUST for a missing platform in the matrix; the speculative-extra half is SHOULD | Bazel 7/8/9; rules_rust 0.74.0–main@51f3042; shapes B, C, F | M-I-04 | BZL-RUST-31 |
| **BZL-RUST-09** | A pinned-rev git dependency (`git = "…", rev = "…"`) needs no special crate_universe configuration; a forked git submodule consumed through a Cargo `path` dependency needs a `BZL-ARCH` decision instead. Never conflate the two. | crate_universe models a git-sourced `Cargo.lock` entry natively as `SourceAnnotation::Git` with `shallow_since`/`patches`/`patch_args`/`patch_tool` (`crate_context.rs:795-812`), and Cargo's own `rev`-over-`branch`/`tag` reproducibility guidance is echoed in `crate.spec()`'s docstring. A path dependency is resolved locally and never appears in `Cargo.lock` at all, so crate_universe structurally cannot see it. | `grep -n -A2 'source = "git+' Cargo.lock` — an entry with a `#<sha>` suffix is already `rev`-pinned and needs nothing further; a `branch`/`tag` spec in `Cargo.toml` without a lockfile rev is the finding. Separately confirm no submodule path appears as a `[[package]] source` — **it structurally cannot, so EMPTY there is the expected result, not evidence the submodule is handled.** | SHOULD | Bazel 7/8/9; rules_rust 0.74.0; shapes B, F | M-I-13 | BZL-ARCH (`git_override` vs `bazel_dep`) |
| **BZL-RUST-10** | Never treat `cargo:rerun-if-changed` or `cargo:rerun-if-env-changed` as load-bearing for correctness under Bazel; leaving them in for Cargo's benefit is fine. | rules_rust's runner parses both and explicitly discards them — "Ignored because Bazel will re-run if those change all the time" (`cargo_build_script_runner/lib.rs:76-80`). Bazel re-executes the action whenever a declared input, `build_script_env` value or the toolchain changes, so the whole "tell the build system when to invalidate me" half of Cargo's contract has no Bazel equivalent to port. | Named reading heuristic: a build.rs comment, migration note or design doc that treats these directives as load-bearing for *Bazel* invalidation is the finding — as is a migration PR that adds a genrule or aspect to "watch" a file `rerun-if-changed` already names. **A grep for the directives themselves is not meaningful; their presence is fine, their assumed effect is the finding.** | SHOULD | Bazel 7/8/9; rules_rust 0.74.0 (no version floor); shapes B, C, F | M-I-05 | — |
| **BZL-RUST-11** | Never author or accept a build.rs that emits `cargo:rustc-link-arg-bin`, `cargo:rustc-link-arg-bins` or `cargo:rustc-cdylib-link-arg` for a crate built under `cargo_build_script`. | The runner recognizes all three as unsupported: it prints a warning and drops the directive (`cargo_build_script_runner/lib.rs:101-109`). Per-binary link-arg scoping silently stops applying, with no build failure anywhere to surface it. | `grep -rn 'cargo::\?rustc-\(cdylib-link-arg\|link-arg-bin\|link-arg-bins\)' --include=build.rs .`. **Any hit on a crate consumed under `crate_universe`/`cargo_build_script` = FINDING; EMPTY = pass.** Third-party crates' build.rs sources are not in the local tree, so this grep covers first-party build scripts only. | MUST | Bazel 7/8/9; rules_rust 0.74.0; shapes B, C, F | M-I-05 | — |
| **BZL-RUST-12** | Treat any build.rs that opens `.git` — directly, or through `vergen`/`vergen-gix`/`git2`/`gix`/`Command::new("git")` — as hitting its no-git fallback on **every** Bazel build, not only on tarball builds, and require that fallback to be non-panicking. | `CARGO_MANIFEST_DIR` under `cargo_build_script` is a synthesized runfiles-backed path built from the target's own `data`/`data_runfiles`, never the repository root; nothing declares `.git` as an input, and declaring it would defeat action caching since its content changes every commit. A crate whose only git path is `.unwrap()`ed panics on every Bazel build; one with a graceful fallback silently produces a different binary than `cargo build` does from the same commit. **`root_path` (added to `cargo_build_script` by [#4243](https://github.com/bazelbuild/rules_rust/pull/4243), merged 2026-08-27) does not weaken this**: read as a diff it is three lines in `cargo_build_script_wrapper.bzl` forwarding a compile-time crate-root attribute into the internal `rust_binary`, and it never touches `cargo_build_script.bzl`'s `_cargo_build_script_impl` (`:433-464`), the only place `CARGO_MANIFEST_DIR` is computed. | `grep -rln 'vergen\|git2\|gix\|Command::new("git")' --include=build.rs .`, then read each hit for a `match`/`Result`/`?` short-circuit rather than `.unwrap()`/`.expect()`. **A hit with no fallback = FINDING (panics under Bazel); a hit with a fallback = a decision to record, not a pass by default (see BZL-RUST-13). EMPTY = nothing to check.** For any claim that a rules_rust change affects this rule, read which file the diff touches: `cargo_build_script.bzl` is execution, `cargo_build_script_wrapper.bzl`/`rust.bzl` are compilation — **only the former could matter.** | MUST | Bazel 7/8/9; rules_rust 0.74.0 (re-confirmed against #4243); shapes B, C, F | M-I-05 | BZL-HERM-02 |
| **BZL-RUST-13** | A provenance field that must actually resolve under Bazel goes through `--workspace_status_command` plus `rustc_env_files` with bracketed placeholders, never through a sandboxed `.git` read — and set `stamp` explicitly on the target rather than inheriting the rule default. | The status-command script runs once per build **outside every action sandbox**, with real `.git` access; `rustc.bzl` passes `ctx.info_file`/`ctx.version_file` to the compile action only when `is_stamping_enabled()` holds. Rule defaults diverge silently: `rust_binary`'s `stamp` is `-1` (defer to `--stamp`), `rust_library`'s is `0` (never) — a library and a binary in the same crate family behave differently with no warning. | For a `rust_binary` whose consumer code reads a `VERGEN_GIT_*`-shaped variable, confirm both a `rustc_env_files` target with a `{STABLE_…}` placeholder and a `build --workspace_status_command=` line in `.bazelrc`. **Consumer code reading such a variable with neither present = FINDING** (that field is permanently `None` under Bazel and nobody chose that). Then `bazel query 'attr(stamp, -1, kind(rust_binary, //...))'` enumerates every binary deferring to the flag; **EMPTY = no target defers = pass.** | MUST wherever a genuine git-provenance requirement exists; N/A otherwise | Bazel 7/8/9; rules_rust 0.74.0 (re-confirmed against #4243); shapes B, C, F | M-I-05 | BZL-HERM-17, BZL-HERM-18 |
| **BZL-RUST-14** | On a Rust-only repository set **both** `common --repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` and `--@rules_rust//cargo/settings:use_cc_toolchain=false`. In a mixed Rust/C workspace use per-crate `crate.annotation(build_script_use_cc_toolchain = …)` instead — never the global flag. | rules_rust's own rules mark the C++ toolchain type `mandatory = False`, but `cargo_build_script`'s `use_cc_toolchain` setting defaults `True` ruleset-wide and Bazel's autoconfiguration probe runs at module-extension setup regardless of graph content — so one switch is not enough. Conversely the global flag is `scope = "universal"`: turning it off breaks every genuinely C-compiling build script (`openssl-sys`, `libsqlite3-sys`) with a late `No binary provided for cc` at execution time, which the per-crate attribute exists to avoid. | `grep -n 'use_cc_toolchain\|BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN' .bazelrc* MODULE.bazel` **and** `grep -rln 'cc::Build\|cmake::Config\|pkg_config::' --include=build.rs .`. **EMPTY on the second with no override on the first = FINDING** (paying autodetection and a toolchain pull for nothing). **A build.rs hit alongside a global `false` = FINDING** (that crate will fail at execution time). | SHOULD | Bazel 8/9; rules_rust 0.74.0; shapes B, C, F | M-I-08, M-I-14 | BZL-HERM-07, BZL-HERM-24 |
| **BZL-RUST-15** | Use `extra_exec_rustc_flags_triples` when exec-configuration rustc flags must differ by host platform; never combine it with `extra_exec_rustc_flags` on the same `rust.toolchain()` tag, and never register a second `rust_toolchain` to "give proc-macros their own". | The module extension `fail()`s outright if both are set on one tag — enforced, not merely documented, and re-confirmed at the 0.74.0 tag (`rust/extensions.bzl:121-122`). And nothing in the public API supports swapping components of the bundled `ToolchainInfo`: `rust_toolchain` still declares `rustc`, `rustc_lib`, `cargo`, `clippy_driver`, `rustfmt` and `rust_std` on one rule at 0.74.0 (`toolchain.bzl:684-856`), so a second registration duplicates the entire asset bundle — `discussions#815`'s exact complaint, left unfixed since 2022-01-27. | `grep -n 'extra_exec_rustc_flags\b' MODULE.bazel` and `grep -n 'extra_exec_rustc_flags_triples' MODULE.bazel` — **both present on the same `rust.toolchain(...)` call already hard-fails at build time (self-verifying).** The reviewable half is the second: does a proposed cross-compilation fix touch the triples attribute, or does it register a new toolchain set? **The latter is solving the wrong layer.** | MUST once both a Linux and a Darwin/Windows exec platform are in play | Bazel 7/8/9; rules_rust 0.74.0; shapes C, F | M-I-07 | BZL-RUST-31 |
| **BZL-RUST-16** | A third-party crate whose build.rs probes the host — `pkg-config`, a `*-sys` system-library lookup, any `PATH` tool search — gets a `crate.annotation(build_script_env = {…})` naming the exact variable that forces the self-contained path. Never a patched fork. | This is the documented, current escape hatch (`build_script_env` unchanged at 0.74.0, mapping to `cargo_build_script.build_script_env`), and it avoids the maintenance cost of a fork. An unpatched probe is a live, silent hermeticity break every time the host differs — a different `pkg-config` search path, a missing system package. `use_default_shell_env` defaults `True` specifically so build scripts *can* probe `$PATH`, which makes the break look like intended behaviour — and what `$PATH` contains is itself Bazel-major-dependent: `--incompatible_strict_action_env` is **`false` on 8.7.0 and 8.8.0 and `true` on 9.2.0**, measured on the binaries, so the same build script sees a different ambient environment across the fleet's own CI matrix (BZL-HERM-01). | For every crate in the closure whose build.rs uses `pkg_config::` or shells to `pkg-config`, confirm a matching `crate.annotation(build_script_env = …)` (or `build_script_use_cc_toolchain`, per that crate's `*-sys` convention) exists in `MODULE.bazel`/`crates.bzl`. **A probing crate with no matching annotation = FINDING.** The crate's own source is not in the local tree, so the reachable check is over the annotation list, not over the third-party build.rs. | MUST | Bazel 7/8/9 (env split measured at 8.7.0, 8.8.0, 9.2.0); rules_rust/crate_universe 0.74.0; shapes B, C, F | M-I-05, M-I-08 | BZL-HERM-01, BZL-HERM-13 |
| **BZL-RUST-17** | Never port a `crate.annotation()` between the WORKSPACE macro form and the bzlmod tag-class form by substitution — diff the declared attribute type on both sides first. | The two are documented as kept "in sync" (`extensions.bzl:1290`) but do not share value encodings: `build_script_use_cc_toolchain` is an `int` (unset/`1`/`0`) in `crate.bzl`'s macro and a three-valued **string** (`"auto"`/`"on"`/`"off"`, default `"auto"`) in `extensions.bzl:1322-1330`'s tag class. A pattern-matched port silently changes the attribute's type, and the "in sync" comment is what makes it look safe. | Named reading heuristic: for each annotation attribute being moved across the WORKSPACE/bzlmod boundary, read its `attr.*()` declaration in `crate.bzl` against `_ANNOTATION_NORMAL_ATTRS`/`_ANNOTATION_ATTRS` in `extensions.bzl` **on the pinned rules_rust version**. **No grep substitutes — both encodings are valid Starlark and neither errors.** | MUST | Bazel 7/8/9; rules_rust 0.74.0–main@51f3042; shapes B, C, F | M-I-08 | — |
| **BZL-RUST-18** | Every internal edge between first-party workspace crates is a hand-written `deps = ["//crates/<name>"]` entry on the BUILD target; never expect `crate_universe` to wire it from `Cargo.toml`'s `path = "…"` field. | `cargo-bazel`'s metadata pass filters every workspace-member node out of the crate-rendering set before generating BUILD content (`metadata_annotation.rs:191-213`, confirmed at 0.74.0, not merely reported in the 2023 practitioner account). There is no code path that could wire this even in principle, and the failure reads as "crate_universe is broken" rather than "this dependency needed declaring". | For each `path = "…"` dependency in a workspace member's `Cargo.toml`, confirm the corresponding first-party BUILD target lists the sibling crate's label directly, never a generated `@crate_index//` alias. **A path dependency with no matching hand-written `deps` entry = FINDING** — self-verifying at `bazel build` time, but worth checking in review because the error message misdirects. | MUST | Bazel 7/8/9; rules_rust/crate_universe 0.74.0; shapes B, C, F | M-I-06 | — |
| **BZL-RUST-19** | If the hand-written internal-dependency list is expected to stay in sync with source-level `use` statements automatically, run `Calsign/gazelle_rust` behind a `gazelle_test` target you wire yourself — never a bare `gazelle -mode=diff` shell step. Before adopting it, confirm the project needs none of: Rust-protobuf rule generation, dead-target removal when a source file is deleted, `mod`-aware structure inference, `resolve`-into-`proc_macro_deps`, or sources in subdirectories with no per-directory `Cargo.toml`. Otherwise write the drift risk into the onboarding doc and rely on `bazel build` failures as the only backstop. | `crate_universe` provides no sync mechanism of its own (BZL-RUST-18); `gazelle_rust` is the one tool that resolves imports against a namespace spanning both first-party and crate_universe crates. It is also third-party and single-maintainer at its **only** tag, `v0.1.0` (2026-05-05, main active through 2026-08-24), so semver makes no stability promise — BZL-ARCH-11 puts Rust generation at **experimental** and applies at full force. Its default generation mode is **one target per source file**, not the package grain Go and rules_python default to; assuming parity across plugins is BZL-ARCH-14's finding. The gap list comes from the maintainer's own tracking issue ([#16](https://github.com/Calsign/gazelle_rust/issues/16), framed by him as "non-exhaustive, and I may change it") — a private backlog standing in for a public tracker, so none of it is on a committed roadmap and a rule built on "this will be fixed" would be inventing one. **The absence of a shipped `gazelle_test` gate is never evidence about the plugin**: no Gazelle ecosystem wires one, gazelle_rust's own `example/BUILD.bazel` included (BZL-ARCH-12). | `bazel query 'kind(gazelle_test, //...)'`. **A Rust repository with hand-written internal `deps`, no `gazelle_test`, and no documented drift-risk note = FINDING; either one present = pass.** Then, before adoption, walk the five-item gap list above against the project by hand — **a project needing any of them with gazelle_rust proposed anyway = a finding to discuss, never a mechanical failure.** Confirm the version live rather than from memory: `curl https://bcr.bazel.build/modules/gazelle_rust/metadata.json`. | SHOULD | Bazel 7/8/9; `gazelle_rust` 0.1.0 (needs rules_rust ≥0.40.0 and `bazel_compatibility >=7.0.0`, both cleared against 0.74.0); shapes B, C, F | M-I-06 | BZL-ARCH-11, BZL-ARCH-12, BZL-ARCH-13, BZL-ARCH-14 |
| **BZL-RUST-20** | Run `bazel run @rules_rust//tools/rust_analyzer:setup -- <editor>` before a Rust repository is handed back; commit `.vscode/settings.json` and any `*.code-workspace`, and gitignore the launcher cache directory (`.vscode/.rules_rust_analyzer/`). | Without setup the repository has a working Bazel build and no working IDE, and setup is the step that resolves rust-analyzer, the proc-macro server and rustfmt entirely off the Bazel toolchain with no host Rust install. The doc states the settings file is safe to commit (re-runs preserve user keys and comments) while the launcher directory is regenerated, per-machine, disposable state. | `git ls-files .vscode/settings.json` returns the path (or the Neovim/Helix snippet is present in the onboarding doc — those two editors are stdout-printed, not written) **and** `git check-ignore .vscode/.rules_rust_analyzer` exits 0. **Either check failing = FINDING.** | MUST | Bazel 7/8/9; rules_rust 0.74.0 (no stated floor for the tool); shapes B, C, F | M-I-09 | — |
| **BZL-RUST-21** | Generate `.vscode/launch.json` with `bazel run @rules_rust//tools/vscode:gen_launch_json` and name CodeLLDB as the required extension; never document or rely on VSCode's built-in `▶ Debug` codelens for a Bazel Rust target. | The codelens is explicitly documented as **not working** for Bazel projects. Pointing a new developer at it costs them their whole first debugging session on a dead end. One launch config covers every test in a binary — it is per test-binary target, not per test. | `git ls-files .vscode/launch.json` returns the path, and the onboarding doc names CodeLLDB. **Missing `launch.json` while the repository documents Rust debugging as supported = FINDING; a repository that documents no debugging support = N/A.** | MUST where the repository documents debugging at all; N/A otherwise | Bazel 7/8/9; rules_rust current; shapes B, C, F | M-I-09 | — |
| **BZL-RUST-22** | Leave `--clippy`/`--no-clippy` and `--per-package-workspaces` as per-developer choices in the gitignored `user_config.json`; document the `--per-package-workspaces` find-usages cost wherever it is recommended; and name "re-run `setup` after any `MODULE.bazel` edit or `bazel clean --expunge`" as a recurring step in the contribution docs. | Both flags are designed to write to a gitignored file so two developers can diverge; hand-editing the committed settings imposes one developer's indexing trade-off on everyone. That trade-off is a correctness cost, not a speed knob — the doc's own words: "dependents of the package you're working on aren't indexed, so 'find usages' can miss callers in other packages". And treating `setup` as a one-time install yields stale configuration with no error, only degraded IDE behaviour. | Reading heuristic: `git diff .vscode/settings.json` on a PR touching only IDE preferences — **a diff to `rust-analyzer.*` keys outside a `setup` re-run = FINDING.** Then the onboarding/CONTRIBUTING doc must mention the find-usages cost next to the flag and both re-run triggers next to the `setup` command; **neither mentioned = FINDING.** | SHOULD | Bazel 7/8/9; rules_rust current; shapes B, C, F | M-I-09 | — |
| **BZL-RUST-23** | Gate clippy and rustfmt exclusively through `.bazelrc` aspect registration plus `--output_groups=` — there is no per-target `clippy`/`rustfmt` attribute to reach for — and treat the two opt-out tag families as disjoint sets. | No such attribute exists in any rule's `attrs` dict; the mechanism is `build --aspects=@rules_rust//rust:defs.bzl%rust_clippy_aspect` + `build --output_groups=+clippy_checks` (and the rustfmt equivalents), applied to every Rust target once registered. Read from the aspects' own sources, clippy's ignore list is `no_clippy`/`no_lint`/`nolint`/`noclippy` and rustfmt's is `no_format`/`no_rustfmt`/`norustfmt` — hyphens and case are normalized, but `no-lint` does **not** silence rustfmt and `no-format` does **not** silence clippy. | `grep -rn '^\s*\(clippy\|rustfmt\)\s*=' --include=BUILD.bazel .` — **any hit is invalid for these rules and a FINDING regardless of Bazel major.** Then `grep -n 'rust_clippy_aspect\|rustfmt_aspect' .bazelrc*` — **EMPTY = the lints are not gated at all**, which is its own finding for a repository claiming to enforce them. For any skip-tagged target, confirm the commit states which aspect is skipped; a tag from one family with no awareness of the other still running is a review finding. | MUST | Bazel 7/8/9; rules_rust current (source-verified 0.74.0-era `main`); shapes B, C, F | M-I-10 | — |
| **BZL-RUST-24** | Register the rustfmt aspect in a CI-only config (`build:ci --aspects=…` or a CI-specific rc file), never in the default `build` config every local build inherits. | rustfmt's own doc states the reason directly: "It's recommended to only enable this aspect in your CI environment so formatting issues do not impact users' ability to rapidly iterate on changes." Clippy's doc names no equivalent recommendation — silence, not a stated exception, so clippy stays in the default config unless BZL-RUST-25's precondition holds. | `grep -n 'rustfmt_aspect' .bazelrc*`. **A hit under a bare `build --aspects=…` line = FINDING; a hit scoped to a named config (`build:ci`, a CI rc file) = pass; EMPTY = rustfmt is not gated at all** (BZL-RUST-23's finding, not this one). | SHOULD | Bazel 7/8/9; rules_rust current; shapes B, C, F | M-I-10 | — |
| **BZL-RUST-25** | Before running the clippy aspect over a target tagged `no-sandbox` with `--@rules_rust//:rustc_output_diagnostics=true` set, either confirm the build order does not trigger `rules_rust#2510` or add `no-clippy` to that target as a stated, temporary exception. | Three conditions together produce a reproduced `Permission denied`: an unsandboxed target (tag propagation makes the clippy action unsandboxed too), `rustc_output_diagnostics=true`, and a clippy build after the target's own compile action already wrote the undeclared, shared output file. Filed 2024-02-22, zero comments, no linked PR as of 2026-09-05; the filer's own workaround is "disable clippy for any unsandboxed tests". Treating it as fixed, or as flaky-and-ignorable, is wrong either way. | `grep -rn 'no-sandbox\|no_sandbox' --include=BUILD.bazel .` cross-referenced against `grep -n 'rustc_output_diagnostics' .bazelrc*`. **Both present together is the exact precondition** — confirm a stated `no-clippy` exception on those targets. **`rustc_output_diagnostics` never set anywhere = the precondition cannot fire = pass.** | SHOULD where `rustc_output_diagnostics` is set; CONSIDER otherwise | Bazel 7/8/9 (traced to bazelbuild/bazel#21474, tag propagation default since 7.x); rules_rust current, unfixed; shapes B, C, F | M-I-10 | — |
| **BZL-RUST-26** | State, wherever a Rust coverage number is reported or reviewed, that `rust_test(crate = …)` instruments the crate's own `#[cfg(test)]` code even without `--instrument_test_targets`, and budget the test's `size`/`timeout` for the llvm-cov post-processing that runs inside the same spawn. | `coverage.md` documents the instrumentation half as a named, intentional break from the Bazel-wide convention: the whole crate compiles as one unit, so rules_rust checks the underlying crate for eligibility regardless of the flag, and test-only code is instrumented too. A reviewer applying the C++/Java mental model misreads test code appearing in the report as a leak rather than expected behaviour. A standalone integration `rust_test` with its own `srcs` follows the normal convention — only the `crate = …` wrapper diverges. The budget half is Bazel's, not the ruleset's: `collect_coverage.sh` is the process substituted for the test binary and chains into `$LCOV_MERGER` before the spawn exits, with `--experimental_split_coverage_postprocessing` defaulting **`false`** at 8.8.0 and 9.2.0 — so rules_rust's `llvm-profdata merge --sparse` plus `llvm-cov export -format=lcov` (`util/collect_coverage/collect_coverage.rs:179-239`) spends the test's own timeout (BZL-TEST-02). | Named reading heuristic: before citing a Rust coverage percentage, check whether the target set includes any `crate = …` unit-test wrapper — `bazel query 'attr(crate, ".+", kind(rust_test, //...))'`. **Non-empty = the percentage includes test code by design; EMPTY = the normal convention applies.** Neither outcome is a defect; a report published without the distinction is. Separately, a `rust_test` that times out only under `bazel coverage` is the shared-budget symptom, not a flaky test — raise `timeout`, do not retry. | CONSIDER | Bazel 7/8/9 (coverage-budget property source-verified at 8.8.0 and 9.2.0); rules_rust 0.74.0; shapes B, C, F | M-I-11 | BZL-TEST-02, BZL-TEST-22, BZL-TEST-24, BZL-TEST-25 |
| **BZL-RUST-27** | Every `rust_library`/`rust_binary` carrying a `#[cfg(test)]` module has a matching `rust_test(crate = …)`, and every file under a crate's `tests/` directory has a `rust_test` (direct or `rust_test_suite`-generated) with `crate_root` set explicitly whenever `srcs` holds more than one file. When certifying migration parity, diff test **names**, not counts. | Cargo auto-discovers unit and integration tests from one crate layout; Bazel requires an explicit target for each, and a missing one is a silent, permanent coverage gap with no build error. `crate_root` inference covers only `lib.rs`/`main.rs`/a single-file `srcs`, so a test pulling in `tests/common/mod.rs` falls outside it. And a `rust_test_suite`-generated name (`<suite>_<path>_test`) does not match Cargo's, so an equal or higher Bazel count can still hide a dropped test. | Per crate: `grep -rn '#\[cfg(test)\]' src/` cross-referenced against `bazel query 'kind(rust_test, //<pkg>:*)'` for a `crate = …` target; and one target per `tests/*.rs` file. **Source pattern present with no corresponding target = FINDING.** Then set-diff `cargo test -- --list` (or `cargo nextest list`) against the `bazel query` output by normalized name — **a count comparison alone is not the check.** | MUST for any migration claiming test parity with Cargo | Bazel 7/8/9; rules_rust current; shapes B, C, F | M-I-12 | — |
| **BZL-RUST-28** | Every crate whose public items carry doc comments with runnable fenced code blocks has a `rust_doc_test(crate = …)` target. | This is the one Cargo test kind (`cargo test --doc`) Bazel never auto-generates under any mechanism — no glob, no aspect, no macro scans doc comments the way `rust_test_suite` scans `tests/`. `rust_doc_test`'s `crate` attribute is `mandatory = True` and there is no `srcs`/glob variant. | `grep -rn '^///.*```\|^//!.*```' --include='*.rs' src/` per crate, cross-referenced against `bazel query 'kind(rust_doc_test, //<pkg>:*)'`. **Fenced doc examples present with no `rust_doc_test` for that crate = FINDING; EMPTY grep = nothing to check, pass by default.** | MUST when doc examples exist; N/A otherwise | Bazel 7/8/9; rules_rust current; shapes B, C, F | M-I-12 | — |
| **BZL-RUST-29** | Every fixture a test reads at run time is listed in `data` — never in `compile_data`, never omitted in favour of an ambient path. | `data` is documented as the files used "at compile time and runtime" and is what Bazel stages into the test's runfiles; `compile_data` exists for `include_str!()`-style compile-time inclusion only. A test reading a fixture with neither passes locally (the real filesystem still has the file) and fails hermetically — in a sandbox, on a clean checkout, in CI — with a confusing "file not found". | Grep the test sources for hard-coded relative paths (`std::fs::read`, `File::open`, `include_bytes!` used outside a compile-time context) and cross-check the owning target's `data` list. **A referenced path absent from `data` = FINDING; EMPTY (no runtime file reads) = pass.** | MUST | Bazel 7/8/9; rules_rust current; shapes B, C, F | M-I-12 | — |
| **BZL-RUST-30** | Confirm every `rust_test_suite`'s resolved test list is non-empty before trusting its `srcs` glob. | `test_suite` special-cases an empty `tests` list as "run everything in the package", and `rust_test_suite`'s synthetic `restrict_<name>` tag exists purely to suppress that — so a glob matching nothing (a typo'd path, a renamed directory) yields a target that exists, is empty, and passes with a green result and zero tests run. The ruleset ships `test/empty_suite/BUILD.bazel` as a regression fixture for exactly this, with the behaviour stated in the macro's own doc comment. | `bazel query 'tests(//<pkg>:<suite_name>)'`. **EMPTY output on a suite whose `tests/` directory is known to hold files = FINDING** (wrong glob path, renamed directory, or never wired to real sources); a non-empty list of the expected targets = pass. | MUST | Bazel 7/8/9; rules_rust current; shapes B, C, F | M-I-12 | — |
| **BZL-RUST-31** | Call `rust.toolchain(versions = [...], edition = "…")` explicitly in the root module and pin every entry; never rely on the tag class's default, and never leave the `rust` extension `use_extension`ed with no `rust.toolchain()` call of your own. Give a `beta`/`nightly` entry its ISO date, and drop the channel you do not select. | The default is hermetic but not pinned, and it moves: `DEFAULT_RUST_VERSION` went 1.95.0 → 1.96.0 → 1.97.1 → 1.97.1 → 1.98.0 across tags 0.70.0–0.74.0, four of five releases (`rust/private/common.bzl:34,36`, read at each tag), so a `rules_rust` `bazel_dep` bump alone re-pins the compiler. Worse, omitting the call entirely is not an error: `_rust_impl` selects `root.tags.toolchain or rules_rust.tags.toolchain` (`rust/extensions.bzl:116`) and rules_rust's own `MODULE.bazel:47-49` declares a **non-dev** `rust.toolchain(edition = "2021")`, so the build silently succeeds against the ruleset's default with nothing in your `MODULE.bazel` naming a version. The default `versions` list registers both a stable and a nightly toolchain and downloads both, while selection is a flat `channel` build setting (`build_setting_default = "stable"`, `scope = "universal"`) with no MSRV awareness — paying a nightly download nothing will pick. A bare `"nightly"`/`"beta"` is a hard `fail()` ("iso_date must be specified…", `repository_utils.bzl:842-843`). Integrity has a narrow real gap: an empty `sha256s` falls back to the committed `known_shas.bzl` table, and a version/target combination absent from it resolves `sha256 = None` and downloads **unverified**, silently (`repository_utils.bzl:685`). | `grep -n -A6 'rust\.toolchain(' MODULE.bazel`. **A call with no `versions =` argument = FINDING. No `rust.toolchain(` at all in a module that `use_extension`s `//rust:extensions.bzl` = the same FINDING, and the more dangerous one — the build works, so nothing else will surface it.** A `versions` entry spelled `"nightly"`/`"beta"` without `/YYYY-MM-DD` fails the build (self-verifying). EMPTY (no `rust` extension anywhere) = no Rust toolchain in this module = nothing to check. | MUST | Bazel 7/8/9; rules_rust 0.74.0 (defaults measured across tags 0.70.0–0.74.0); shapes B, C, F | — (new; answers the toolchain-registration round) | BZL-RUST-08, BZL-RUST-15, BZL-RUST-32 |
| **BZL-RUST-32** | Where a repository keeps a `rust-toolchain.toml` alongside Bazel, add a CI step comparing its `channel` against the first stable entry of `rust.toolchain(versions = [...])` and fail on mismatch. Never state or imply that rules_rust reads, validates or reconciles that file. | `grep -rn "rust-toolchain"` over the entire extracted 0.74.0 tag — every `.bzl`, `.rs`, `.md` and test fixture — returns **zero matches**. Cargo's toolchain-pin file has no code path into the ruleset at all, so a repo carrying both has two independent, unlinked version sources and nothing in either tool notices divergence. The audience is genuinely narrow, which is why this is not a MUST: after `rust_analyzer:setup` (BZL-RUST-20) the IDE runs off the Bazel toolchain with no host Rust install, so `rust-toolchain.toml`'s only remaining live consumer is a bare `cargo build`/`cargo test` outside Bazel — a contributor without Bazel, or a CI leg that deliberately exercises the Cargo path. | `test -f rust-toolchain.toml` first. **Absent = N/A, and the more urgent question is BZL-RUST-31's "pin `versions=` at all", not drift.** Present: compare the parsed `[toolchain] channel` against `MODULE.bazel`'s first stable `versions` entry; **equal = pass, unequal = FINDING.** Any check that claims rules_rust enforces this itself is a second finding. | SHOULD where `rust-toolchain.toml` exists; N/A otherwise | Bazel 7/8/9; rules_rust 0.74.0 (absence verified by full-tree grep, not a single doc read); shapes B, C, F | — (new; answers the toolchain-registration round) | BZL-RUST-31, BZL-RUST-20 |
| **BZL-RUST-33** | **pinned** — Generate Rust protobuf and gRPC code with `rust_prost_library` on a `proto_library`, adding `bazel_dep(name = "rules_rust_prost", version = "<same as rules_rust>")` as its own module, and author a `rust_prost_toolchain` naming this repository's own crate_universe-resolved `prost`/`tonic` versions rather than accepting the shipped default. Never cite `rust_proto_library`; never keep a `build.rs` running `tonic-build`/`prost-build` as the Bazel path. | At 0.74.0 `extensions/` contains `bindgen, mdbook, prost, pyo3, wasm_bindgen` and no `proto`/`protobuf` directory — `rust_prost_library` is the only Bazel-native path that ships, and `rust_proto_library` survives only as a stale doc link in `examples/proto/README.md` (Verdict 3's pattern again). It is a **separate BCR module**: `extensions/prost/MODULE.bazel` declares `module(name = "rules_rust_prost", version = "0.74.0")` with its own `bazel_dep`s, so `bazel_dep(name = "rules_rust")` alone does not pull it in. Tonic is not a second rule — `tonic_plugin`/`tonic_runtime` sit on the same `rust_prost_toolchain` (`extensions/prost/defs.bzl:99-119`) and the codegen is done by the `protoc-gen-tonic` protoc plugin, not the `tonic-build` crate. A working default toolchain **does** register (`//:default_prost_toolchain`, vendored prost 0.13.1 / tonic 0.12.1), contradicting the docstring's "no default toolchain"; the reason to override it is type identity — generated code references `tonic::Request<T>` from the toolchain's runtime, and a service crate resolving a different `tonic` through its own crate_universe graph fails to compile with "expected `tonic::Request`, found `tonic::Request`". **No primary source ranks the alternatives, and keeping the build.rs is technically possible, so this is the project's call** (Verdict 12). | `grep -rn 'tonic_build\|prost_build' --include=build.rs .` — **any hit in a repository adopting Bazel = a migration item, not a steady state.** Then `grep -n 'rules_rust_prost' MODULE.bazel`: **a repo with `rust_prost_library` in any BUILD file and no `bazel_dep(name = "rules_rust_prost")` will not load (self-verifying); a repo using `rust_prost_library` with no hand-authored `rust_prost_toolchain` is the reviewable FINDING** — it compiles today against the module's vendored prost/tonic and breaks the moment a service crate's own graph resolves a different version. On Bazel 9 each underlying `proto_library` needs its own explicit `load("@protobuf//bazel:proto_library.bzl", "proto_library")`; **EMPTY grep for that load in a file declaring `proto_library` = FINDING on 9.x** (autoload defaults empty). EMPTY (no `.proto` files) = N/A. | SHOULD | Bazel 8/9 (the `load()` clause is 9-only); rules_rust / rules_rust_prost 0.74.0, with rules_proto 7.1.0 and protobuf 28.3 as that module pins them; shapes C, F | — (new; answers the prost/tonic round) | BZL-RUST-31 |
| **BZL-RUST-34** | Point gazelle_rust at the bzlmod-produced crate_universe lockfile with `# gazelle:rust_lockfile cargo-bazel-lock.json`, never at a raw `Cargo.lock` with `# gazelle:rust_cargo_lockfile`. | The two directives are mutually exclusive and only one is correct. Parsing a raw `Cargo.lock` "include[s] all packages, including transitive dependencies" (the maintainer's own words on [gazelle_rust#15](https://github.com/Calsign/gazelle_rust/issues/15), open): unused-dependency reporting then flags every transitive crate as unused, and gazelle can add a `deps` entry for a transitive-only crate that has **no corresponding top-level target**, breaking the build. Direct-dependency parsing from crate_universe's own lockfile is the maintainer's stated preferred direction and an open feature request, not shipped. | `grep -rn 'gazelle:rust_cargo_lockfile' .` — **any hit requires an adjacent comment justifying it over `rust_lockfile`; an unexplained hit = FINDING. EMPTY = pass.** Presence of *a* lockfile directive is not the check: `grep -rn 'gazelle:rust_lockfile\|gazelle:rust_cargo_lockfile\|gazelle:rust_crates_prefix' .` and confirm `rust_crates_prefix` is set too — gazelle_rust needs it to know where crate_universe labels live, and without it resolution has nowhere to point. | MUST wherever gazelle_rust is adopted; N/A otherwise | Bazel 7/8/9; `gazelle_rust` 0.1.0 (bug open at that tag); shapes B, C, F | M-I-06 | BZL-RUST-19 |
| **BZL-RUST-35** | Any `use` statement behind a `#[cfg(...)]` whose Bazel dependency resolves through a `select()` carries an explicit `#[gazelle::ignore]` attribute macro, and the corresponding BUILD `deps` line carries a `# keep` comment. | gazelle_rust cannot infer a platform-conditional dependency — its README says so outright ("too complex… for now you must handle this manually") and documents exactly this pair as the workaround. Without both halves gazelle rewrites the hand-authored `select()` away on **every** regeneration, so the loss is silent, recurring, and looks like a merge accident rather than a tool limitation. | `grep -rn -B3 '^\s*use ' --include='*.rs' .` for a `#[cfg(` guard with no adjacent `#[gazelle::ignore]`, cross-checked against a `select()` in that target's generated `deps` with no `# keep`. **A `select()`-populated `deps` entry with no `# keep`, or a `#[cfg]`-guarded `use` with no `#[gazelle::ignore]`, = FINDING; EMPTY (no platform-conditional dependencies) = pass.** This grep reads first-party sources and the repository's own committed BUILD files only. | MUST wherever gazelle_rust is adopted and any dependency is platform-conditional; N/A otherwise | Bazel 7/8/9; `gazelle_rust` 0.1.0; shapes B, C, F | M-I-06 | BZL-RUST-19, BZL-ARCH-13 |
| **BZL-RUST-36** | Before wiring a `crates_vendor` repin step into CI, read that job's environment as if every variable in it were being handed to an arbitrary subprocess — because it is. | Since [#3964](https://github.com/bazelbuild/rules_rust/pull/3964) (merged 2026-04-16, present unchanged at 0.74.0), the `crates_vendor` wrapper ends in `exec env -u OUTPUT_BASE "${_BIN}" …` — full ambient-environment passthrough minus exactly one variable. It replaced a narrow allowlist that never worked at all: the old code grepped `^CARGO_REGISTER`, a string that matches no real Cargo variable (`CARGO_REGISTRY_TOKEN`, `CARGO_REGISTRIES_<NAME>_TOKEN`), so private registries and SSH-authenticated git dependencies were both silently broken. The fix reads as a pragmatic unblock, not a stated permanent design, and no follow-up issue is linked — so the relaxation is real and unbounded today. This path is `crates_vendor`-only; `crates_repository`'s `repository_ctx.execute()` splicing never had the allowlist or the typo. | Read the `crates_vendor` CI job's `env:` block and the secrets it inherits. **A cache write token, registry credential or cloud key present in that job's environment for any reason other than the vendoring itself = FINDING.** EMPTY (no `crates_vendor` target, or a job whose environment carries only what vendoring needs) = pass. There is no grep for this inside the ruleset — the passthrough is unconditional, so the only reachable control is what the job's environment contains. | CONSIDER | Bazel 7/8/9; rules_rust 0.74.0 (fix present since 2026-04-16); shapes B, C, F | — (new) | BZL-RUST-04, BZL-RUST-07, BZL-HERM-01 |
| **BZL-RUST-37** | State in the adoption or CI documentation that rules_rust disclaims reliable Windows support, and treat any Windows Rust leg — build, test or coverage — as measured-or-nothing rather than assumed working. | The ruleset's own `docs/src/index.md` at 0.74.0 says it in the maintainers' words: *"We do not have sufficient maintainer expertise to support Windows. Most things probably work, but we have had to disable many tests in CI because we lack the expertise to fix them."* This is a capacity statement, not a technical ceiling, and "most things probably work" is explicitly not a tested guarantee. Its `coverage.md` never mentions runfiles or Windows at all, so silence there is not evidence either way — and reading that silence as "same as rules_js" (a documented hard failure) or as "fine" are both inventions. A team that puts a Windows leg in the matrix without recording this ships an untested platform as a supported one. | Reading heuristic: does the CI matrix include a Windows leg that builds or tests Rust, and does the adoption/CONTRIBUTING doc name the upstream disclaimer next to it? **A Windows Rust leg with no such note = FINDING. No Windows leg = N/A, and adding one is a decision to make deliberately, not a matrix row to copy.** For coverage specifically the verification is BZL-TEST-24's, not this rule's: run it once with `VERBOSE_COVERAGE=1` and read whether `collect_coverage.rs`'s `COVERAGE_DIR`-derived fallback resolves real paths — **do not assume either outcome.** | SHOULD | Bazel 7/8/9; rules_rust 0.74.0 (disclaimer read at that tag); shapes B, C, F | — (new) | BZL-TEST-24 |

## Applied to rules_ocx and the fleet

**This group has no fleet instance at all.** Zero fleet repositories use
`rust_*` rules, `crate_universe`, `crates_repository` or `crates_vendor`
([fleet-bazel-readiness.md:115,275](bazel-audit/fleet-bazel-readiness.md); frame
wave-1 correction 7). `rules_ocx`, the one Bazel repository, compiles no Rust:
`grep -rIl 'rust_binary\|rust_library\|crates_repository\|crate.from_cargo\|cargo_build_script'`
over the whole repository returns nothing (measured 2026-09-06). So there is
nothing to satisfy and nothing to violate — only latent shapes.

**What the fleet would have to build to exhibit this family:** one `MODULE.bazel`
with `bazel_dep(name = "rules_rust")`, a `rust.toolchain(versions = [...])`
registration naming a Rust version nothing in-repo currently states (0 MSRV pins
fleet-wide, 3 of 6 Rust repos with no `rust-toolchain.toml` —
[fleet-bazel-readiness.md:58-59,275](bazel-audit/fleet-bazel-readiness.md)), one
`crate.from_cargo(lockfile = …)` call, and a committed `cargo-bazel-lock.json`.
BZL-RUST-31 makes that version pin a day-one decision rather than an omission
nobody notices. Until then every row is grounded on upstream sources.

**Latent instances, named with file:line, that the first adopter meets on day
one:**

| What | Where | Which rule, and what it would say |
|---|---|---|
| A live `vergen-gix` build script whose `.git` read is the only path Bazel can never give it | `ocx/crates/ocx_cli/build.rs:52-74` (the `match GixBuilder…` block), `Err` arm `:71-73`, warning string `:72`; consumed at `ocx/crates/ocx_cli/src/app/build_info.rs:116-117` (`option_env!("VERGEN_GIT_SHA")?`) | **BZL-RUST-12 passes** — the fallback is a caught `Err`, not an `.unwrap()`, so nothing panics, and `root_path` (#4243) changes nothing about it. **BZL-RUST-13 fires**: under `cargo_build_script` that branch runs on *every* build, so `ocx version --format json` would omit `commit` from any Bazel-built binary while a `cargo build` of the same commit includes it — a silent divergence with only a `cargo:warning` line in the action log. The fix is a `tools/workspace_status.sh` emitting `STABLE_GIT_*`, a `build --workspace_status_command=` line, and a `rustc_env_files` target keeping the existing variable names so `build_info.rs` needs no change. |
| Two `rerun-if-changed`-only build scripts | `creeptd-ng/services/leaderboard/build.rs`, `creeptd-ng/services/profile/build.rs` ([fleet-bazel-readiness.md:121](bazel-audit/fleet-bazel-readiness.md)) | **BZL-RUST-10**: inert under Bazel, harmless to leave in. The live problem in those two crates is `sqlx::query!`'s compile-time live-database dependency (24 + 11 call sites, no `.sqlx/` cache committed — [fleet-bazel-readiness.md:270](bazel-audit/fleet-bazel-readiness.md)), which is `BZL-HERM`'s non-hermetic-build-dependency treatment, not `cargo_build_script` mechanics. |
| Seven `.proto` files behind one `tonic-build` build script — the frame's "zero `.proto` files" row was wrong | `creeptd-ng/crates/creeptd-proto/build.rs` (five `tonic_build::configure()…compile_protos()` steps over `health`, `ids`, `identity`, `lobby`, `game`, and `match_result`+`leaderboard` together), vendored `protoc` via `protoc-bin-vendored`, `proto_root` at `CARGO_MANIFEST_DIR/../../proto` | **BZL-RUST-33 fires**, and it is the largest single migration item in the fleet: six `proto_library` targets (one per package, `deps = [":common_proto"]` wherever `creeptd.common.v1` is imported — Bazel's native `deps=` graph does that resolution structurally, so no `extern_path` analogue is needed for cross-package imports), one `rust_prost_library` each, a `bazel_dep(name = "rules_rust_prost")`, one hand-authored `rust_prost_toolchain` naming this workspace's own `prost`/`tonic`, and an explicit `load()` on every `proto_library` for Bazel 9. Open: whether `rust_prost_transform`'s `prost_opts`/`tonic_opts` reproduces the current `extern_path`-flattened `crate::common` layout — a spike, not a source read. |
| Four pinned-rev git dependencies sharing one `rev` by policy | `ocx-mirror/crates/ocx_python/Cargo.toml:29-32` (`uv-distribution-filename`, `uv-platform-tags`, `uv-pep508`, `uv-pep440`, all at `rev = "0adb4448…"`), rationale comment at `:25-28` | **BZL-RUST-09 passes** — the shared `rev` is exactly the shape crate_universe and Cargo both want, and needs no special configuration. The map's M-I-13 premise that these lack a registry analogue is wrong (Verdict 8). |
| Two fork-as-submodule vendorings pinned by a moving branch ref | `grimoire/.gitmodules:1-8` — `external/docker_credential` on branch `feat/store-erase-list`, `external/rust-oci-client` on branch `ocx/integration`; consumed as Cargo `path` deps | **BZL-RUST-09's second half**: no crate_universe path exists and none can — a path dep never enters `Cargo.lock`. This is a `BZL-ARCH` `git_override`-versus-`bazel_dep` decision. `ocx-mirror` compounds it, reaching two levels into a nested submodule ([fleet-bazel-readiness.md:95,271](bazel-audit/fleet-bazel-readiness.md)). |
| Every intra-workspace `path` edge in five workspaces | `ocx` (`ocx_cli→ocx_lib`, `ocx_schema→ocx_cli,ocx_lib`), `creeptd-ng` (DAG rooted at `creeptd-proto`/`creeptd-sim`/`test-support`), `bob` (`bob_cli/bob_engine/bob_graph/bob_host → bob_cas`), `ocx-mirror`, `grimoire` ([fleet-bazel-readiness.md:93-98](bazel-audit/fleet-bazel-readiness.md)) | **BZL-RUST-18**: every one is hand-written `deps` on adoption. **BZL-RUST-19**: no fleet repo has a Gazelle target, so the drift risk is currently undocumented everywhere — and gazelle_rust cannot generate the `creeptd-proto` half at all (no Rust-protobuf support), which is exactly the pre-adoption gap check -19 now demands. |
| A `.gitattributes` already carrying the exact defect BZL-RUST-05 forbids, on a sibling lockfile | `rules_ocx/.gitattributes:5` — `MODULE.bazel.lock merge=union` (and `:4` — `ocx.lock merge=union`) | **BZL-MOD-04's finding, not this family's** — recorded here because it is the same class of defect and the same repository would inherit BZL-RUST-05 the day it adds a crate lockfile. The frame's wave-2 correction 5 already owns it. |
| A `--check` mode that shares code with the refresh, not a weaker duplicate | `rules_ocx/scripts/bump_ocx.py`, wired through `.github/workflows/update-dist.yml:33-36` ([build-contracts-and-ci-posture.md:258,308](bazel-audit/build-contracts-and-ci-posture.md)) | The positive exemplar for **BZL-RUST-04**: the audit itself names crate_universe lockfiles as a target for this pattern. A `crates_vendor` drift check should reuse the regeneration path, never reimplement a weaker one — and **BZL-RUST-36** applies to whatever job runs it. |
| Three Windows CI shards plus a Windows BCR-parity target, on a ruleset that would disclaim them | `rules_ocx` CI (3 of 9 test shards on Windows, plus one BCR-parity platform — frame wave-2 correction 7) | **BZL-RUST-37** the day any Rust lands here: the matrix row already exists and would silently extend to a platform rules_rust's own index disclaims. No coverage leg exists yet, so BZL-TEST-24 stays N/A. |
| A pilot candidate with nothing to preserve | `bob` — 9 `Cargo.toml`, 5 crates + 3 `playground/`, one clean DAG, no Python, no TypeScript, no CI ([fleet-bazel-readiness.md:97,255](bazel-audit/fleet-bazel-readiness.md)) | Orchestrator decision Q1's named candidate. It would exercise BZL-RUST-01/-02/-06/-18/-20/-27/-29/-30/-31 first, none of the build-script rows (0 build scripts) and none of the prost rows (0 `.proto`). It also has no `rust-toolchain.toml` and no MSRV pin, so **BZL-RUST-31 lands immediately and BZL-RUST-32 does not**: `rust.toolchain(versions = [...])` must name a version nothing in `bob` states today, and there is no second file to drift against. |

**Cannot exhibit, and would not even after adoption:** BZL-RUST-15
(`extra_exec_rustc_flags_triples`) — zero proc-macro crates exist anywhere in
the fleet ([fleet-bazel-readiness.md:60](bazel-audit/fleet-bazel-readiness.md)),
and no fleet repository cross-compiles to a non-host exec platform. BZL-RUST-16
— no fleet crate's build.rs uses `pkg_config::`. BZL-RUST-25 — nothing sets
`rustc_output_diagnostics`, so the `#2510` precondition cannot fire.
BZL-RUST-32 — 3 of 6 Rust repos have no `rust-toolchain.toml` at all, and the
other three have no Bazel side to drift from yet. BZL-RUST-34 and -35 — no fleet
repository has a Gazelle target of any kind.

## Applied to the fleet shapes

- **A — Starlark ruleset publishing to the BCR (`rules_ocx`)**: binds **nothing**
  today. Zero Rust targets, zero `Cargo.toml`, no crate_universe. Two
  transferable things run the other way: `scripts/bump_ocx.py --check` is the
  shape BZL-RUST-04's regenerate-then-diff wants, already implemented here for a
  different manifest; and its three Windows CI shards are the shape BZL-RUST-37
  would bind the day any Rust lands.
- **B — Rust CLI + Python harness, incl. plain Rust workspaces (`ocx`,
  `grimoire`, `ocx-mirror`, `bob`, `rust-oci-client`)**: binds thirty-five of
  thirty-seven on adoption — all but 33 (no `.proto`) and 15 (no proc-macro
  crates, no non-host exec platform). The rows that fire first are 01, 02, 05,
  18, 20, 27-31 for every repo; 09 for `ocx-mirror` and `grimoire` specifically;
  12 and 13 for `ocx` alone (the fleet's one `.git`-reading build script); 32
  only for the three repos that carry a `rust-toolchain.toml`. The
  Rust-binary-under-a-Python-test seam that both harnesses use is **BZL-PY-25**,
  not a row here.
- **C — Rust + TypeScript monorepo (`creeptd-ng`)**: binds all thirty-seven,
  plus 15 the moment anything cross-compiles. It is the only shape that binds
  **BZL-RUST-33**: `creeptd-proto`'s seven `.proto` files behind one
  `tonic-build` build script are the fleet's single largest migration item, and
  the frame's "zero `.proto` files" count was wrong for this repo. Two of its
  crates carry a non-hermetic compile-time database dependency that this family
  does not own (`BZL-HERM`).
- **D — Python library or automation**: binds nothing. The only adjacency is
  M-I-15, settled by **BZL-PY-25**.
- **E — TypeScript package, extension or Action**: binds nothing.
- **F — Future polyglot Bazel monorepo, and `rules_ocx`'s own audience**: binds
  all thirty-seven. This is the shape every row is grounded for, per the map's
  convention that no fleet repository uses a language rule today.

## AI-agent failure modes

Ranked by how often the corpus shows the mistake actually being made, not by
severity.

1. **Copying `CARGO_BAZEL_REPIN=1 bazel sync --only=<repo>` out of the ruleset's
   own current documentation.** The worst kind of trap: an agent doing the right
   thing — reading the primary source — gets a command deleted eight months ago.
   *Check:* does the generated snippet contain `bazel sync`? If yes and the
   target Bazel major is ≥9, it is wrong. Replace with
   `bazel fetch --repo=@<repo>` or a plain build; `--repo` is present on 8.7.0
   and 9.2.0 alike, so the replacement needs no version branch. (BZL-RUST-03)
2. **Dropping the `lockfile` attribute as "the safe default" when unsure what to
   pass.** It is the single worst configuration in the ruleset for CI
   trustworthiness — unconditional, silent re-splicing forever.
   *Check:* `crates_repository(...)`/`crate.from_cargo(...)` with no `lockfile =`
   is always a finding, never a fallback. (BZL-RUST-01)
3. **Inventing a `--crate_lockfile_mode`/`--locked` flag by analogy with
   Bzlmod's `--lockfile_mode=error`.** No such flag exists; the mechanism is an
   attribute plus an environment variable.
   *Check:* `bazel help build --long | grep <flag>` **and**
   `bazel help startup_options | grep <flag>` before citing any flag name — a
   flag can live in either surface and only one of them is usually read
   (`--experimental_remote_repo_contents_cache` is a startup option from 8.8.0,
   invisible to the command help).
   **Empty output from both means the flag does not exist on that version — an
   answer, not a pass.** (BZL-RUST-02, BZL-MOD-13)
4. **Inventing a per-target `clippy = True` / `rustfmt = True` attribute**, by
   porting a `#[allow(...)]`-shaped mental model onto Bazel.
   *Check:* `grep -rn '^\s*\(clippy\|rustfmt\)\s*=' --include=BUILD.bazel .` —
   any hit fails to load, but the design mistake (assuming per-target control
   exists) is what to catch in review. (BZL-RUST-23)
5. **Porting a `crate.annotation()` between WORKSPACE and bzlmod by
   substitution.** `build_script_use_cc_toolchain` flips from `int` to a
   three-valued string across the boundary, under a comment saying the two are
   kept in sync.
   *Check:* diff the declared `attr.*()` type in `crate.bzl` against
   `extensions.bzl`'s annotation attrs on the pinned version. (BZL-RUST-17)
6. **Assuming a build.rs that reads `.git` works under Bazel the way it does
   under a local `cargo build`.** There is no code path by which `.git` reaches a
   `cargo_build_script` sandbox.
   *Check:* `grep -rln 'vergen\|git2\|gix\|Command::new("git")' --include=build.rs .`
   — any hit needs an explicit stamping plan, not an assumption that the crate's
   tarball fallback quietly covers Bazel too. It does, silently, and probably not
   on purpose. (BZL-RUST-12, -13)
7. **Setting `CARGO_BAZEL_REPIN=1` on a `bazel build` step for a `crates_vendor`
   setup.** It silently does nothing — `crates_vendor` regeneration is triggered
   by `bazel run … -- --repin`, not by an environment variable on a build.
   *Check:* for a `crates_vendor` target, the CI step must be
   `bazel run //<pkg>:crates_vendor -- --repin`. (BZL-RUST-04)
8. **Treating `cargo:rerun-if-changed` as something needing a Bazel-side
   equivalent when porting a build script.** It has none and needs none.
   *Check:* if a migration PR adds a genrule or aspect to "watch" a file the
   build.rs already names in `rerun-if-changed`, that work is redundant — delete
   it. (BZL-RUST-10)
9. **Citing 2019-2024 history as current**: `rules_rust#205` (proc-macros built
   for the target) closed 2019-11-22 with a transition-based fix; `#1601` (pure
   Rust needs a C++ toolchain) closed 2022-10-21 and every core rule now marks
   the toolchain type `mandatory = False`.
   *Check:* read the close date before citing either as live, and redirect the
   architecture question to `discussions#815`, which genuinely is still open.
   Guidance asserting "rules_rust requires a C++ toolchain" without naming
   `use_cc_toolchain`/`cargo_build_script` is now over-broad. (BZL-RUST-14, -15)
10. **Assuming the seven default `SUPPORTED_PLATFORM_TRIPLES` cover "every
    common platform".** Told to support Intel and M-series Macs, an agent adds
    the ARM entry (already there) and calls it done — Intel macOS is not in the
    default set at all.
    *Check:* diff the CI matrix's platform list against
    `supported_platform_triples`, not against "the default should be enough".
    (BZL-RUST-08)
11. **Assuming `cargo test --doc` happens automatically**, because doc-comment
    testing "just happens" everywhere else in Rust.
    *Check:* `grep -rn '^///.*```' --include='*.rs' src/` against
    `bazel query 'kind(rust_doc_test, //<pkg>:*)'` — a non-empty grep with an
    empty query is the exact miss. (BZL-RUST-28)
12. **Assuming an empty `rust_test_suite` glob fails loudly**, the way a bad
    label reference would. It produces a green, empty, silently-passing suite.
    *Check:* `bazel query 'tests(//pkg:suite)'` — empty output on a suite that
    should cover real files is the finding. (BZL-RUST-30)
13. **Assuming one tag silences both lints.** `no-lint` stops clippy only;
    `no-format` stops rustfmt only.
    *Check:* cross-reference any skip tag against both `ignore_tags` lists —
    clippy's four names, rustfmt's three — before calling a target "excluded from
    linting". (BZL-RUST-23)
14. **Reaching for a second `rust_toolchain` registration to give proc-macros
    their own toolchain.** Nothing in the public API supports swapping components
    of the bundled `ToolchainInfo`; a second registration duplicates the whole
    asset bundle.
    *Check:* does the proposed fix touch `rust.toolchain()`'s
    `extra_exec_rustc_flags_triples`, or register a new toolchain set? The latter
    is solving the wrong layer. (BZL-RUST-15)
15. **Confusing `override_targets` with `additive_build_file_content`.** One
    substitutes a generated target wholesale; the other only appends. Picking the
    appending form for a replacement need leaves the wrong target still generated
    and still referenced.
    *Check:* does the change *replace* what crate_universe would generate
    (`override_targets`) or *add* alongside it
    (`additive_build_file_content`)? Both are valid Starlark either way, so no
    grep catches this — it is a review question.
16. **Inventing a `stamp` attribute on `cargo_build_script`.** It has none;
    stamping is a `rust_library`/`rust_binary`/`rust_test` mechanism
    (`rustc_env_files`), even though `build_script_env_files`' doc comment
    mentions workspace status in passing.
    *Check:* `grep -n '"stamp"' cargo/private/cargo_build_script.bzl` on the
    pinned version — absence confirms it. (BZL-RUST-13)
17. **Debugging build.rs logic when the log already named the cause.** A
    disabled or unresolved C++ toolchain produces the literal string
    `No binary provided for cc` from a stub binary, not a compiler error.
    *Check:* grep a failing `cargo_build_script` action's log for
    `no_ar`/`no_cc`/`no_cxx`/`No binary provided for` **before** reading the
    crate's build.rs. Diagnosis procedure — belongs in `bazel-diagnose`, not as a
    standing repository check. (BZL-RUST-14)
18. **Treating "whatever `rust.toolchain()` defaults to" as a safe, neutral
    choice.** It is neither: the default moved on four of the last five releases,
    and a root module with no `rust.toolchain()` call at all still builds against
    rules_rust's own tag with zero signal that nobody chose a version.
    *Check:* does `MODULE.bazel`'s `rust.toolchain(...)` carry an explicit
    `versions =`? Absence is the finding — and "there is no `rust.toolchain()`
    call, so Rust must not be configured here" is the wrong inference.
    (BZL-RUST-31)
19. **Recommending `rust_proto_library` for Rust protobuf.** That name is dense
    in general Bazel-protobuf training data — it is the real, current name in
    other language ecosystems and was rules_rust's own name years ago — and the
    ruleset's own `examples/proto/README.md` still links its dead doc page.
    *Check:* does the guidance name `rust_prost_library` and add
    `bazel_dep(name = "rules_rust_prost")` as a **separate** module, or does it
    assume `bazel_dep(name = "rules_rust")` is enough? (BZL-RUST-33)
20. **Taking `rust_prost_toolchain`'s "the prost and tonic rules do not specify
    a default toolchain" literally**, then either skipping toolchain setup as
    unnecessary or inventing one from scratch. A working default *is*
    auto-registered; the real decision is whether to override it.
    *Check:* does the guidance explain *why* a custom toolchain matters (type
    identity against the service crate's own tonic/prost) or merely assert that
    one is required? (BZL-RUST-33)
21. **Citing `extra_target_triples` and `SUPPORTED_PLATFORM_TRIPLES`
    interchangeably**, because adjacent prose calls both "the curated default
    seven". They are different lists in different files: the toolchain one has
    three wasm triples and no Windows; crate_universe's has neither wasm nor
    Intel macOS.
    *Check:* which file and attribute was actually read, before reusing a "the
    default covers X" claim from one for the other. (BZL-RUST-08, -31)
22. **Reading `root_path`'s addition to `cargo_build_script` as a change to the
    build-script execution sandbox**, because `cargo_build_script` and
    `CARGO_MANIFEST_DIR` sit adjacent in most mental models of this ruleset. It
    is a compile-time crate-root attribute with zero code-path overlap.
    *Check:* does the diff touch `cargo_build_script.bzl` (execution) or only
    `cargo_build_script_wrapper.bzl`/`rust.bzl` (compilation)? Only the former
    could affect BZL-RUST-12. (BZL-RUST-12)
23. **Assuming `--credential_helper` is either the mechanism for all
    crate_universe network access or irrelevant to all of it.** It covers the
    generated `http_archive` tarball fetches and is structurally invisible to the
    exec'd-`cargo` splice/metadata phase.
    *Check:* which of the two phases is actually failing before reaching for
    `--credential_helper` as the fix — and prefer `cargo_config =` over a global
    `CARGO_BAZEL_ISOLATED=false`. (BZL-RUST-02)
24. **Reading a `# gazelle:rust_cargo_lockfile` directive as proof crate_universe
    is correctly wired.** Its presence is evidence of the mode with the open
    transitive-dependency bug, not of correctness.
    *Check:* does the configuration distinguish `rust_lockfile` from
    `rust_cargo_lockfile` and prefer the former, and is `rust_crates_prefix` set
    at all? (BZL-RUST-34)
25. **Porting Go's package-level Gazelle granularity onto Rust.** gazelle_rust's
    default is the opposite — one target per source file — and it does not
    support sources in subdirectories without a per-directory `Cargo.toml`.
    *Check:* does the guidance name the plugin's own default mode from its own
    directive docs, or assume parity across plugins? (BZL-RUST-19, BZL-ARCH-14)

## Open questions

### Needs a human decision

1. **Does `ocx version --format json` keep a `commit` field under Bazel?**
   BZL-RUST-13 says a provenance field that must resolve needs
   `--workspace_status_command` plus a `rustc_env_files` target plus CI wiring
   for `GITHUB_*` — real migration work. The alternative is honest and free:
   accept a permanently absent `commit` under Bazel, since the JSON contract
   already documents every provenance field as optional
   (`ocx/crates/ocx_cli/build.rs:22-24`). This is a product-contract decision,
   not a build one. The wrong move is to make it silently, which is what
   adopting Bazel with no decision does.
2. **Whether to run the `bob` pilot at all** (orchestrator decision Q1, still the
   owner's). The crate_universe-specific cost this consolidation adds to that
   decision: a first repin, a committed `cargo-bazel-lock.json` and a merge
   driver, plus an explicit `rust.toolchain(versions = [...])` pin that nothing
   in `bob` states today — `bob` has no `rust-toolchain.toml` and no MSRV
   ([fleet-bazel-readiness.md:59,275](bazel-audit/fleet-bazel-readiness.md)), so
   BZL-RUST-31 forces a version choice on day one rather than inheriting
   whichever `DEFAULT_RUST_VERSION` the pinned `rules_rust` happens to ship.
3. **Whether `bazel-adopt` gets a `crates_vendor` branch at all.** BZL-RUST-07
   pins `crates_repository` as the default, and no fleet repository meets the
   switch criterion today. Shipping both branches doubles the skill's Rust
   section for an audience (`rules_ocx`'s "Bazel monorepo maintainers") whose
   need for it is asserted, not measured.
4. **Whether `bazel-adopt` gets a prost branch.** BZL-RUST-33 settles *what* the
   right path is; the cost is a second BCR module kept in lockstep with
   `rules_rust`, one hand-authored `rust_prost_toolchain`, and reshaping one
   `build.rs` into a `proto_library` graph. Exactly one fleet repo has `.proto`
   files (`creeptd-ng`, seven), and it is the repo the fleet is least likely to
   migrate first. Shipping the branch is a bet on shape F, not on the fleet.

### Deserves another research round

| Subarea | Exact question |
|---|---|
| rust-analyzer at scale | What is the actual failure mode at ~600k lines / few-hundred packages, and has it moved since? This needs a measurement on a real large repository, not another source — the corpus has exactly one data point and no curve (Verdict 9). Carried unchanged: the 2026-09-06 follow-up round did not address it. |
| `rust_prost_transform` and generated module layout | Does `prost_opts`/`tonic_opts` reproduce a `tonic-build` crate's `extern_path`-flattened module tree (`crate::common` rather than nested `pkg::common::v1`) across a real multi-package `.proto` graph? The mechanism exists (`extensions/prost/private/prost_transform.bzl`); nothing has run it end to end. Needs a scratch Bazel workspace with `rules_rust_prost` and real `.proto` files — a spike, not a source read (Verdict 19c). |
| `known_shas.bzl` currency | How often does a freshly-released stable or nightly fall outside rules_rust's committed hash table, and therefore download with `sha256 = None` and no integrity check at all? The fallback's existence and logic are confirmed (BZL-RUST-31); the table's actual currency against `static.rust-lang.org`'s release cadence was never measured. |
| Rust coverage on real Windows CI | Run `bazel coverage` for a `rust_test` on a Windows executor with and without `--enable_runfiles`, and read whether `collect_coverage.rs`'s `COVERAGE_DIR`-derived fallback produces a non-empty, correct lcov report. BZL-TEST-24 currently says "measure it"; nobody has. Needs a Windows runner, which this program does not have. |
| `CARGO_REGISTRIES_<NAME>_TOKEN` through `crates_repository` | Are `repository_ctx.execute()`'s ambient-environment semantics consistent enough across CI systems for a single portable private-registry recipe, as opposed to `crates_vendor`'s now-fixed path? The code path is traced (Verdict 18); it was never run against a real private registry. |

### M-I rows not settled by a rule row here

| Row | Why |
|---|---|
| **M-I-15** — "Is a Rust binary under test reachable from a Python test through runfiles rather than an env var and a fixed path?" | **Settled by BZL-PY-25**, cross-family, deliberately not duplicated here. `bazel-python.md` names it explicitly as the cross-family row that rule settles. The mechanism is `data = [":the_binary"]` plus `@rules_python//python/runfiles`; the finding is the fleet's `OCX_COMMAND`/`GRIM_COMMAND` plus `test/bin/<tool>` fallback in 2 of 2 harnesses. |
| **M-I-16** — "Is keeping Cargo as the IDE and dependency source of truth a stable end state or a migration phase?" | **Decided in the Verdict (item 7), deliberately no rule row.** The answer splits: the IDE half is a migration-phase workaround that `rust_analyzer:setup` closes; the dependency half is permanent by design, because crate_universe consumes `cargo metadata` and `Cargo.lock` and hashes the manifests. Following the `bazel-python.md` precedent for M-J-15, a rule whose only content is "state the correct reason" carries no verification that would change a diff inside a Bazel repository, which is the bar the house standard sets. The one narrow mechanical consequence — `rust-toolchain.toml` is invisible to rules_rust — did earn a row, BZL-RUST-32. |

All other family-I rows are settled: M-I-01 (BZL-RUST-01, 07), M-I-02 (01, 02,
04, 05), M-I-03 (02, 03, 06), M-I-04 (08), M-I-05 (10, 11, 12, 13, 16), M-I-06
(18, 19, 34, 35), M-I-07 (15), M-I-08 (14, 16, 17), M-I-09 (20, 21, 22), M-I-10
(23, 24, 25), M-I-11 (26), M-I-12 (27, 28, 29, 30), M-I-13 (09), M-I-14 (14).
Rules 31, 32, 33, 36 and 37 answer questions the map never asked; they come from
the 2026-09-06 follow-up round and carry "— (new)" in the Settles column.

## Sub-artifacts

- [`bazel-rust/crate-universe-lockfiles-and-repin.md`](bazel-rust/crate-universe-lockfiles-and-repin.md)
  — `crates_repository` versus `crates_vendor` and which publication model each
  serves, the two-lockfile model and the digest that ties them,
  `determine_repin()`'s built-in fail-fast gate, the Bazel-9-safe repin
  invocation after `bazel sync` was deleted, the curated seven triples and their
  `O(N²)` cost, the non-atomic lockfile write, and the non-root bzlmod
  repin prohibition.
- [`bazel-rust/cargo-build-scripts-and-cross-compilation.md`](bazel-rust/cargo-build-scripts-and-cross-compilation.md)
  — which `cargo:*` directives the runner keeps, drops and refuses; the exact
  build-script action environment and the structural absence of `.git`;
  `use_cc_toolchain`'s ruleset-wide default and its stub-binary fallback; the
  `crate.annotation()` escape hatch attribute by attribute; why crate_universe
  filters workspace members out of the render set; the fixed proc-macro bug and
  the unfixed monolithic-`ToolchainInfo` architecture; and workspace-status
  stamping as the Bazel-native replacement for a git-reading build script.
- [`bazel-rust/rust-ide-lint-and-test-parity.md`](bazel-rust/rust-ide-lint-and-test-parity.md)
  — the `rust_analyzer:setup` installer and its per-user config, what
  `--per-package-workspaces` costs, the non-working Debug codelens and
  `gen_launch_json`, clippy and rustfmt as aspects with two disjoint opt-out tag
  families, the open `#2510` sandbox interaction, the `rust_test(crate=…)`
  coverage inconsistency, and the three-kind Cargo-to-Bazel test-parity
  checklist including the silently-green empty `test_suite`.

**Folded in on revision (2026-09-06):**

- [`bazel-followups/rust-toolchain-pinning-prost-rustdoc-and-private-registry.md`](bazel-followups/rust-toolchain-pinning-prost-rustdoc-and-private-registry.md)
  — commissioned by this file's own "Deserves another research round" table and
  answering four of its six rows: `rust.toolchain()`'s attributes, defaults and
  measured multi-tag drift; `rust_prost_library`/`rust_prost_toolchain` as the
  only shipping protobuf path; `root_path` (#4243) read as a diff; the absence
  of any `rust_doc` staleness gate; and crate_universe's two credential
  universes under a private registry. Source of BZL-RUST-31, -32, -33 and -36,
  and of the -02, -08 and -12 revisions.
- [`bazel-followups/gazelle-plugin-maturity-per-language.md`](bazel-followups/gazelle-plugin-maturity-per-language.md)
  — `gazelle_rust`'s maintenance state, generation modes, crate_universe
  lockfile integration and its open transitive-dependency bug, plus the
  ecosystem-wide finding that no plugin wires `gazelle_test`. Source of
  BZL-RUST-34, -35 and the -19 rewrite; the maturity verdict itself lives in
  BZL-ARCH-11 and is cited, not restated.
- [`bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md`](bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md)
  — `collect_coverage.sh` inside the test spawn as a Bazel-core property,
  rules_rust's llvm-cov collector read from source, and the `rust_test(crate=…)`
  exception to `--instrument_test_targets` confirmed against the ruleset's own
  doc. Source of the BZL-RUST-26 extension; the rest binds in BZL-TEST.
- [`bazel-followups/macos-windows-sandbox-and-runfiles-parity.md`](bazel-followups/macos-windows-sandbox-and-runfiles-parity.md)
  — rules_rust 0.74.0's own fleet-wide Windows disclaimer and the
  runfiles-optional fallback in `collect_coverage.rs`. Source of BZL-RUST-37;
  the coverage-leg verification split lives in BZL-TEST-24.
- [`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md`](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)
  — `--incompatible_strict_action_env` measured false on 8.7.0/8.8.0 and true on
  9.2.0 (BZL-RUST-16's ambient-environment clause), and the
  command-versus-startup-option split every flag verification in this file now
  has to respect.

## Revision log

Every line is one change made on **2026-09-06**, folding the four follow-ups that
touch this family, the cross-version measurement, and the frame's Corrections
blocks through the Measurement wave and wave 4b. Rule IDs are a stable contract:
no number was reused, reordered or retired, and every existing ID keeps its
meaning.

| What changed | IDs | Why | Input |
|---|---|---|---|
| Rule sentence gains "reach for a committed `cargo_config =` file before `ISOLATED=false`"; rationale gains the ruleset's verbatim private-registry paragraph, the `cargo_config` symlink mechanism and the two-credential-universes split; verification now treats an unexplained global `ISOLATED=false` as the finding. `BZL-CACHE-04` added to Depends on. | BZL-RUST-02 | The escape hatch was recorded as inferred; it is the ruleset's own documented recipe (`extensions.bzl:69-73`, #3278), and `cargo_config` is the narrower mechanism nobody had named. `--credential_helper` reaches the tarball fetch and not the splice phase — an agent will otherwise apply it to the wrong half. | rust follow-up Q5 (measured + normative) |
| Verification's flag list re-checked against the real binaries and the result stated: `--repo`, `--all`, `--configure`, `--force` all present on 8.7.0 and 9.2.0. "Applies to" gains the measured scope; rationale gains "the replacement needs no version branch". | BZL-RUST-03 | The row asserted a flag surface it had not read on both majors. Measured 2026-09-06; a `bazel help` read is a property of the binary, so no CI-runner caveat applies. | live measurement, this revision |
| Rule text gains "Never reason about this list from `rust.toolchain()`'s `extra_target_triples`, or the reverse"; rationale names both curated lists, their files and their differing members; verification gains a third finding. | BZL-RUST-08 | The two defaults are different lists that adjacent prose both calls "the curated seven" — the substitution looks safe and silently changes which platforms resolve. | rust follow-up Q1 (measured) |
| Rationale gains the #4243 read-as-a-diff footnote; verification gains "which file does the diff touch — execution or compilation". No normative change. | BZL-RUST-12 | The PR landed one day before the tag, on a file whose name suggests it governs the sandbox. Confirming it does not is cheaper than re-deriving the guarantee each time the question comes up. | rust follow-up Q3 (measured) |
| "Applies to" re-scoped to note the #4243 re-confirmation. No text change. | BZL-RUST-13 | Same round; the stamping mechanism is downstream of BZL-RUST-12's guarantee. | rust follow-up Q3 (measured) |
| `extensions.bzl:121-122` cited for the `fail()`; `BZL-RUST-31` added to Depends on. | BZL-RUST-15 | The `fail()` was asserted without a line number; the follow-up re-confirmed it at the tag, and the rule now sits downstream of the toolchain-pinning row. | rust follow-up Q1 (measured) |
| Rationale gains the measured per-major `--incompatible_strict_action_env` split, so "what `$PATH` contains" is version-scoped rather than stated flat. "Applies to" gains the measured versions. | BZL-RUST-16 | `use_default_shell_env = True` was described as if the ambient environment were constant; it differs across the fleet's own 8.x/9.x matrix. | flag-defaults measurement (measured) |
| Rule and rationale rewritten around the follow-up's findings: `gazelle_test` is hand-wired (no ecosystem ships it, so its absence says nothing about the plugin), the maturity verdict is cited to BZL-ARCH-11 rather than restated, the one-target-per-file default is named, and the five-item pre-adoption gap list is folded in as a decision clause with a live BCR version check. | BZL-RUST-19 | The row said "third-party and 0.1.0" without the single-maintainer / one-tag / private-backlog shape, and did not warn that the gate's absence is ecosystem-wide. The follow-up's argued NEW-5 is folded here rather than promoted to its own CONSIDER row: two rules with one check is worse than one rule with the right check. | gazelle follow-up Q3/Q5/Q7 (measured; NEW-5 argued, folded not promoted) |
| Rule sentence gains the coverage-budget clause; rationale gains the Bazel-core mechanism, the measured `false` defaults of the two split-coverage flags and rules_rust's llvm-cov pipeline; verification gains the coverage-only timeout symptom. Four BZL-TEST cross-references added. | BZL-RUST-26 | The row covered only the `crate = …` instrumentation quirk and said nothing about post-processing spending the test's own timeout — a Bazel-wide property that bites Rust exactly as hard. | coverage follow-up Answers 1-2 (normative + measured) |
| **New rule.** Pin `rust.toolchain(versions = [...])` explicitly; a root module that never calls it still builds against rules_rust's own default. MUST. | BZL-RUST-31 | The measured default moved on four of the last five releases, and the no-call fallback is a silent-green failure of the same class as BZL-RUST-30's empty test suite. The follow-up proposed it as a clause on BZL-RUST-01; a new ID keeps -01's meaning (crate-universe lockfiles) intact, as the ID contract requires. | rust follow-up Q1, NEW-9 (measured) |
| **New rule.** CI compares `rust-toolchain.toml`'s `channel` against `rust.toolchain(versions=)`; never claim rules_rust reads that file. SHOULD, N/A where the file is absent. | BZL-RUST-32 | Zero hits for `rust-toolchain` across the entire 0.74.0 tree. Held at SHOULD, not MUST, because after `rust_analyzer:setup` the file's only live consumer is a bare `cargo` run outside Bazel. | rust follow-up Q1, NEW-10 (measured absence) |
| **New rule, pinned.** `rust_prost_library`/`rust_prost_toolchain` from the separate `rules_rust_prost` module as the Rust protobuf path; author the toolchain rather than accept the shipped default. SHOULD. | BZL-RUST-33 | Settles this file's own open round on prost/tonic. Pinned and SHOULD on BZL-RUST-07's precedent: no primary source ranks the alternatives and keeping the build.rs is technically possible, so the grade is on consequence (Verdict 12). | rust follow-up Q2, NEW-11 (measured) |
| **New rule.** gazelle_rust must read the bzlmod lockfile (`rust_lockfile`), never a raw `Cargo.lock` (`rust_cargo_lockfile`). MUST where gazelle_rust is adopted. | BZL-RUST-34 | The raw path has an open, maintainer-confirmed bug that can add a `deps` entry for a transitive-only crate with no top-level target. "A lockfile directive exists" is not the check. | gazelle follow-up NEW-4 (measured, [#15](https://github.com/Calsign/gazelle_rust/issues/15)) |
| **New rule.** Platform-conditional dependencies need `#[gazelle::ignore]` plus `# keep`. MUST where gazelle_rust is adopted and any dependency is conditional. | BZL-RUST-35 | Without both halves gazelle rewrites the hand-authored `select()` on every regeneration — silent, recurring, and indistinguishable from a merge accident. The plugin's README documents the pair as the only workaround. | gazelle follow-up NEW-3 (normative) |
| **New rule.** Review the `crates_vendor` repin job's environment: since #3964 the wrapper forwards everything except `OUTPUT_BASE`. CONSIDER. | BZL-RUST-36 | A real hermeticity relaxation traded for private-registry and SSH function, with no linked follow-up tightening it. Kept out of BZL-RUST-04 so a drift-check rule does not bury a credential-exposure check. | rust follow-up Q5, NEW-12 (measured) |
| **New rule.** Record rules_rust's own Windows disclaimer wherever a Windows Rust leg exists. SHOULD. | BZL-RUST-37 | "Most things probably work" is a maintainer-capacity statement, not a tested guarantee, and reading `coverage.md`'s silence in either direction is an invention. The coverage-leg verification stays BZL-TEST-24's. | macos/windows follow-up Q2 (normative) |
| **No rule added** for `rust_doc` freshness; recorded as a closed gap in Verdict 19a instead. | — | Zero `diff_test` hits over the whole tag, and `rust_doc`'s output is a hosted zip whose HTML depends on the pinned Rust toolchain, never the Bazel major — the `rules_ocx` stardoc-goldens analogy does not transfer. A row here would carry no verification that changes a diff. | rust follow-up Q4, NEW-13 (measured absence) |
| Verdict 3 extended with the measured `fetch` flag surface and the second stale-doc instance; Verdict 4 scopes the follow-up round to the 0.74.0 tag; Verdicts 7, 9, 12, 14, 15 extended; Verdicts 16-20 added (toolchain drift, prost, the credential split, closed gaps, coverage mechanics). | — | Each records something the rules now assume; a rule whose premise lives only in a follow-up file is unreadable in isolation. | all five inputs |
| Four of six "Deserves another research round" rows removed as answered (prost/tonic, toolchain registration, `root_path`, rustdoc freshness) plus private registries; four new rows added (prost module layout, `known_shas.bzl` currency, Rust coverage on real Windows CI, a portable `CARGO_REGISTRIES_*` recipe). rust-analyzer-at-scale kept, unchanged and still unaddressed. | — | The round answered what it was commissioned for; what it could not answer by reading is now stated as needing a spike or a runner, not another source read. | all five inputs |
| Fleet section: `creeptd-proto`'s seven `.proto` files added as a latent instance with the frame's wrong "zero `.proto` files" count corrected; a Windows-CI row added; `bob`'s row updated for BZL-RUST-31/-32; shape counts moved from thirty to thirty-seven with shape B's two exclusions named. | — | Shape C previously said protobuf codegen was uncovered, "see Open questions"; it is now BZL-RUST-33's largest instance. | rust follow-up Q2 (measured; fleet source read read-only) |
| Eight AI-agent failure modes added (18-25); mode 3's check now names both help surfaces; mode 1 states the replacement needs no version branch. | — | Six come from the follow-ups' own AI-agent sections; the both-help-surfaces correction is the measurement's, and it applies to every flag citation in this file. | all five inputs |
| Frontmatter: five inputs added to `consolidates`, `revised: 2026-09-06` added, `builds_on` extended with BZL-MOD-13, BZL-ARCH-13/-14, BZL-TEST-02/-24/-25 and BZL-CACHE-04, `grounded_in` re-scoped from four Corrections blocks to all seven. Title now names toolchains and prost. | — | The file consolidates five more inputs and cites four more families than it did. | all five inputs |

## Key sources

| URL | What it is | Why it is here |
|---|---|---|
| [`crate_universe/private/generate_utils.bzl`](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/generate_utils.bzl) | Tagged source, `main`@51f3042 (2026-09-02) | `determine_repin()`'s exact fail/repin logic and the unconditional-`True` path when no `lockfile` is set — the ground truth under BZL-RUST-01 and -02 |
| [`crate_universe/extensions.bzl`](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/extensions.bzl) | Tagged source | The bzlmod non-root repin prohibition (`:611-625`), the `reproducible` toggle (`:1176-1186`), the annotation tag-class attribute types (`:1322-1330`), the `cargo_config` attribute (`:1229`), the verbatim "Note if using Private Crate Registries" paragraph (`:69-73`), and the still-live `bazel sync` docstring |
| [`crate_universe/private/crates_repository.bzl`](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crates_repository.bzl) | Tagged source | `SUPPORTED_PLATFORM_TRIPLES` with the ruleset's own `O(N²)` comment (`:26-37`), the `isolated` attribute's doc, and `cargo_config` (`:266-268`) |
| [`crate_universe/private/common_utils.bzl` (0.74.0)](https://github.com/bazelbuild/rules_rust/blob/0.74.0/crate_universe/private/common_utils.bzl) | Tagged source, 0.74.0 | `new_cargo_bazel_fn()`'s `repository_ctx.execute()` subprocess (`:70-112`), the `cargo_config` symlink into the synthetic `CARGO_HOME` (`:125-129`) and `cargo_environ()`'s isolated-`CARGO_HOME` logic (`:161-183`) — BZL-RUST-02 and Verdict 18 |
| [`crate_universe/src/splicing/cargo_config.rs` (0.74.0)](https://github.com/bazelbuild/rules_rust/blob/0.74.0/crate_universe/src/splicing/cargo_config.rs) | Tagged Rust source, 0.74.0 | cargo-bazel's own `[registry]`/`[registries]`/`[source]` parser with an Artifactory-shaped unit-test fixture (`:220-267`) — proof the private-registry path is tested, not inferred |
| [`crate_universe/private/crate.bzl`](https://raw.githubusercontent.com/bazelbuild/rules_rust/0.74.0/crate_universe/private/crate.bzl) | Tagged source, 0.74.0 | The 40-parameter `crate.annotation()` signature and `crate.spec()`'s `rev`-over-`branch` guidance — the other half of BZL-RUST-17's type diff |
| [`cargo/settings/settings.bzl`](https://raw.githubusercontent.com/bazelbuild/rules_rust/0.74.0/cargo/settings/settings.bzl) | Tagged source, 0.74.0 | `use_cc_toolchain` (`True`, `scope="universal"`) and `use_default_shell_env` (`True`) in the ruleset's own words — BZL-RUST-14 and -16 |
| [`cargo/private/cargo_build_script_runner/lib.rs`](https://raw.githubusercontent.com/bazelbuild/rules_rust/0.74.0/cargo/private/cargo_build_script_runner/lib.rs) | Tagged source, 0.74.0 | The `cargo:*` directive match statement: what is captured, what is discarded, what is recognized-but-unsupported — BZL-RUST-10 and -11 |
| [`cargo/private/cargo_build_script.bzl` (0.74.0)](https://github.com/bazelbuild/rules_rust/blob/0.74.0/cargo/private/cargo_build_script.bzl) · [`cargo_build_script_wrapper.bzl`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/cargo/private/cargo_build_script_wrapper.bzl) · [PR #4243 files](https://github.com/bazelbuild/rules_rust/pull/4243/files) | Tagged source pair plus the PR diff via `gh api` | `_cargo_build_script_impl`'s `CARGO_MANIFEST_DIR` computation (`:433-464`) against `root_path`'s three-line pass-through — the exact evidence that BZL-RUST-12 is unaffected |
| [`crate_universe/src/metadata/metadata_annotation.rs`](https://raw.githubusercontent.com/bazelbuild/rules_rust/0.74.0/crate_universe/src/metadata/metadata_annotation.rs) | Tagged source, 0.74.0 | The workspace-member filter that makes crate_universe structurally unable to see path dependencies — BZL-RUST-18 |
| [`rust/private/rust.bzl`](https://raw.githubusercontent.com/bazelbuild/rules_rust/0.74.0/rust/private/rust.bzl) | Tagged source, 0.74.0 | `mandatory = False` on the cc toolchain type for every core rule; `stamp`/`rustc_env_files`/`crate_root`/`data` attrs and defaults; `rust_test_suite`'s `restrict_<name>` defence; `_validate_root_path()` (`:212-231`) |
| [`rust/extensions.bzl` (0.74.0)](https://github.com/bazelbuild/rules_rust/blob/0.74.0/rust/extensions.bzl) · [`rust/private/repository_utils.bzl`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/rust/private/repository_utils.bzl) · [`rust/private/common.bzl` at 0.70.0–0.74.0](https://github.com/bazelbuild/rules_rust/blob/0.74.0/rust/private/common.bzl) | Tagged source, primary, read across five tags | The `rust.toolchain()` tag class and its `root.tags.toolchain or rules_rust.tags.toolchain` fallback (`:116`); the `extra_exec_rustc_flags` `fail()` (`:121-122`); `DEFAULT_EXTRA_TARGET_TRIPLES` (`:27-35`); the `known_shas.bzl` sha256 fallback (`:685`); `check_version_valid()`'s exact `fail()` (`:842-843`); and the measured `DEFAULT_RUST_VERSION` drift 1.95.0 → 1.98.0 — BZL-RUST-31, -15 and -08 |
| [`rules_rust` `MODULE.bazel` (0.74.0)](https://github.com/bazelbuild/rules_rust/blob/0.74.0/MODULE.bazel) · [`rust/toolchain/channel/BUILD.bazel`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/rust/toolchain/channel/BUILD.bazel) | Tagged source, 0.74.0 | The ruleset's own **non-dev** `rust.toolchain(edition = "2021")` that backstops a root module calling none, and the flat `channel` build setting defaulting `"stable"` with no MSRV awareness — BZL-RUST-31 |
| [`extensions/prost/MODULE.bazel`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/extensions/prost/MODULE.bazel) · [`defs.bzl`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/extensions/prost/defs.bzl) · [`private/prost.bzl`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/extensions/prost/private/prost.bzl) · [`BUILD.bazel`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/extensions/prost/BUILD.bazel) | Tagged source, 0.74.0 | `rules_rust_prost` as a separate BCR module with its own `register_toolchains`; `rust_prost_toolchain`'s `tonic_plugin`/`tonic_runtime` (`defs.bzl:99-119`); `rust_prost_library`'s single `proto=` attribute with `aspects=[rust_prost_aspect]` (`prost.bzl:429`); and the functional vendored default toolchain — BZL-RUST-33 |
| [`util/collect_coverage/collect_coverage.rs` (0.74.0)](https://github.com/bazelbuild/rules_rust/blob/0.74.0/util/collect_coverage/collect_coverage.rs) · [`docs/src/coverage.md` (0.74.0)](https://github.com/bazelbuild/rules_rust/blob/0.74.0/docs/src/coverage.md) | Tagged source read in full plus the ruleset doc | The actual `llvm-profdata merge --sparse` / `llvm-cov export -format=lcov` invocation (`:179-239`) and its `COVERAGE_DIR`-derived runfiles-optional fallback (`:95-107`); the `rust_test(crate=…)` instrumentation exception stated as a named break from Bazel convention — BZL-RUST-26 and -37 |
| [`docs/src/index.md` (0.74.0)](https://github.com/bazelbuild/rules_rust/blob/0.74.0/docs/src/index.md) | Ruleset doc, primary | The verbatim "We do not have sufficient maintainer expertise to support Windows… we have had to disable many tests in CI" disclaimer — BZL-RUST-37 |
| [`rust/private/rustdoc.bzl` (0.74.0)](https://github.com/bazelbuild/rules_rust/blob/0.74.0/rust/private/rustdoc.bzl) · [`docs/src/rust_doc.md` (rendered)](https://bazelbuild.github.io/rules_rust/rust_doc.html) | Tagged source plus the ruleset's published doc | `rustdoc_compile_action()` built purely from the toolchain and `CrateInfo` (`:72-90`), and the "zip file" output framing — the two facts that close Verdict 19a with no rule row |
| [`docs/src/rust_analyzer.md`](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rust_analyzer.md) | Primary ruleset doc | The complete `setup` contract: editors, no host Rust install, `user_config.json`, the `--per-package-workspaces` find-usages cost, the re-run triggers — BZL-RUST-20 through -22 |
| [`docs/src/clippy.md`](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/clippy.md) · [`docs/src/rustfmt.md`](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rustfmt.md) | Primary ruleset docs | The exact aspect + output-group registration lines, and rustfmt's own CI-only recommendation — BZL-RUST-23 and -24 |
| [Bazel `CHANGELOG.md`](https://github.com/bazelbuild/bazel/blob/master/CHANGELOG.md) · [`FetchOptions.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/commands/FetchOptions.java) · `bazel help fetch --long` on 8.7.0 and 9.2.0 | Bazel's own changelog, tagged source, and a live read of both binaries (2026-09-06) | The dated removal of `bazel sync` (9.0.0-pre.20250526.2) and the measured presence of `--repo`/`--all`/`--configure`/`--force` on both majors — BZL-RUST-03 |
| [`TestActionBuilder.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestActionBuilder.java) · [`TestConfiguration.java` @ 8.8.0](https://github.com/bazelbuild/bazel/blob/8.8.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestConfiguration.java) | Bazel tagged source, both majors | `collect_coverage.sh` substituted for the test binary, and the measured `false` defaults of `--experimental_split_coverage_postprocessing`/`--experimental_fetch_all_coverage_outputs` — the Bazel-core half of BZL-RUST-26 |
| [rules_rust 0.74.0 release notes](https://github.com/bazelbuild/rules_rust/releases/tag/0.74.0) | Official release notes, 2026-08-28 | The seven crate_universe correctness fixes behind Verdict 6, plus `root_path` (#4243) landing one day before the tag |
| [rules_rust `#3964`](https://github.com/bazelbuild/rules_rust/pull/3964) · [`#3278`](https://github.com/bazelbuild/rules_rust/pull/3278) · [`#2325`](https://github.com/bazelbuild/rules_rust/pull/2325) | GitHub PRs, primary, via `gh api` | The `CARGO_REGISTER` typo and its `env -u OUTPUT_BASE` replacement (merged 2026-04-16, present at 0.74.0); the origin of the `CARGO_BAZEL_ISOLATED=false` doc recipe; long-standing sparse-registry support — BZL-RUST-36 and -02 |
| [rules_rust `discussions#815`](https://github.com/bazelbuild/rules_rust/discussions/815) | GitHub Discussion, opened 2021-06-30, last comment 2022-01-27 | The monolithic-`ToolchainInfo` problem in the maintainers' own words, and the abandonment of the proposed split — BZL-RUST-15 |
| [rules_rust `#2510`](https://github.com/bazelbuild/rules_rust/issues/2510) | GitHub issue, filed 2024-02-22, open with 0 comments as of 2026-09-05 | The reproduced clippy-aspect/unsandboxed-target failure with its exact three-condition precondition — BZL-RUST-25 |
| [`Calsign/gazelle_rust` README](https://raw.githubusercontent.com/Calsign/gazelle_rust/main/README.md) · [`#15`](https://github.com/Calsign/gazelle_rust/issues/15) · [`#16`](https://github.com/Calsign/gazelle_rust/issues/16) | Primary tool doc plus the maintainer's own open bug and tracking issue | The single-namespace import resolution, the `#[gazelle::ignore]`/`# keep` workaround, the raw-`Cargo.lock` transitive-dependency bug and the non-exhaustive private backlog — BZL-RUST-19, -34 and -35 |
| [mmapped.blog — Scaling Rust builds with Bazel](https://mmapped.blog/posts/17-scaling-rust-builds-with-bazel) | Practitioner account (argued) | The corpus's only concrete "it broke at scale" report, with the codebase-size numbers Verdict 9 rests on, and the "keep Cargo for the IDE" resolution Verdict 7 supersedes |
| [tweag.io/blog/2023-07-27](https://www.tweag.io/blog/2023-07-27-building-rust-workspace-with-bazel/) | Practitioner account (argued) | The `crate.annotation(build_script_env=…)` pkg-config workaround and the path-dependency limitation, both re-confirmed against current source rather than taken on trust |
