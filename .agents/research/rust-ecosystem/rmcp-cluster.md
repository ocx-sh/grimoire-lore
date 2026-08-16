---
title: The `rmcp` Cluster — grimoire's MCP Server SDK
topic: rmcp (Model Context Protocol Rust SDK), grimoire's `src/mcp/` server
agent: rmcp-cluster-researcher
model: sonnet
date_researched: "2026-08-14"
sources_count: 20
scope: >
  Answers the phase-4/5 open question ("the starlark and rmcp dependency
  clusters... deferred purely because neither has produced a symptom") for
  rmcp: identity/stewardship, MCP-spec version coupling and negotiation
  behavior, API stability across the crate's own breaking releases, the
  transport/trust boundary in both directions (malicious client in, raw
  registry text out), the feature-driven dependency surface, and how
  grimoire actually uses it — grounded in grimoire @ HEAD (2026-08-14),
  crates.io's JSON API, GitHub (modelcontextprotocol/rust-sdk), GitHub
  Security Advisories, RustSec, and the MCP specification's own versioning,
  tools, and security-best-practices pages (2026-07-28 and 2025-11-25
  revisions).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Applied to the codebases](#applied-to-the-codebases)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. **`rmcp` is the official Rust SDK for the Model Context Protocol**, published from the `modelcontextprotocol` GitHub organization — the same org that owns the spec itself — not a community fork or a personal project. This was already asserted in-repo (`adr_multi_registry_mcp.md`: "it is the official SDK") and is independently confirmed against the crates.io JSON API and GitHub API.
2. **The crate is current and fast-moving**: `updated_at` 2026-08-07, `newest_version` 3.1.2, 60 published versions since 2025-03-16 — roughly weekly. Grimoire's `Cargo.lock` resolves `3.1.0` (`Cargo.toml` requires `"3.0.0"`, a caret range), two patch releases behind current; neither missed patch touches anything grimoire's feature set uses.
3. **The MCP spec's own versioning model changed underneath the crate on the exact day rmcp 3.0.0 shipped.** The spec's "Current" revision is `2026-07-28` — a "Modern" era that replaced the old `initialize`-handshake with per-request `_meta`-declared protocol versions and a mandatory `server/discover` RPC. `rmcp` 3.0.0 (also dated 2026-07-28) landed SEP-2575 ("add server discovery and negotiation") as its headline breaking change. rmcp's own `ProtocolVersion::LATEST` constant is still `2025-11-25` (one revision behind spec-Current), but the SDK ships a **default `ServerHandler::discover()`/`supported_protocol_versions()` implementation** that any server — grimoire's included — inherits without writing a line of code, making grimoire's server "Dual-era" per the spec's own compatibility matrix. Per that matrix, a Dual-era server interoperates with every client era; there is no failing row for grimoire's actual configuration.
4. **API stability post-1.0 is weaker than the version number suggests.** rmcp hit `1.0.0` on 2026-03-03, `2.0.0` on 2026-06-27 (breaking: realigned model types to the 2025-11-25 spec), and `3.0.0` on 2026-07-28 (breaking: SEP-2575 discovery, SEP-2322 MRTR, SEP-2243 HTTP headers, metadata realignment, deprecated-API removal) — two breaking majors in five months. No written stability/semver promise beyond "we bump major on breaking changes" was found in the crate's README.
5. **Five GitHub Security Advisories exist against rmcp** (one also filed as RUSTSEC-2026-0189); all five are scoped to the Streamable HTTP server/client transport or the OAuth client, and all five are already patched at versions well below grimoire's locked 3.1.0. **None apply to grimoire**, because grimoire compiles in neither the HTTP transport nor the `auth` feature — confirmed by `cargo tree -e normal -p rmcp` in grimoire, which shows no `hyper`, `reqwest`, `oauth2`, or `jsonwebtoken` anywhere in the resolved graph.
6. **Grimoire enables exactly one transport: stdio.** `Cargo.toml` declares `features = ["schemars", "transport-io"]` with no `transport-streamable-http-*`/`server-side-http`/`auth` feature, and `src/mcp/server.rs` calls `rmcp::transport::stdio()` directly. This matches the MCP spec's own recommendation for locally-run servers ("Use the `stdio` transport to limit access to just the MCP client") and structurally rules out the DNS-rebinding and session-leak advisories above, which require an HTTP listener.
7. **The inverse trust boundary — registry-sourced text flowing out through a tool result into the model's context — has no MCP-scoped defense today.** `to_json()` in `src/mcp/server.rs` serializes report structs (including `SearchEntry.description`, documented as "stays full and untruncated") straight to JSON with zero sanitization. Grimoire already has a working escape/control/bidi sanitizer (`sanitize_member_label`, `src/tui/render.rs:98`, the SEC-34/36/37 implementation) — it is simply never called on the MCP path. The MCP `2026-07-28` spec's `server/tools` page has a formal "Security Considerations" section stating servers **MUST** "Sanitize tool outputs." This is unmet, and it is the highest-severity finding of this dive.
8. **A second, already-documented gap sits next to it and has quietly expired.** `adr_multi_registry_mcp.md` (2026-07-03) recorded an accepted limitation — full `anyhow` error chains (including filesystem paths, CWE-209) are returned verbatim to the MCP client — with an explicit revisit trigger: "before write tools land." `grim_render`, a write tool, has since shipped and uses the same unconditional `tool_error()` path. The trigger fired; the revisit did not happen.
9. **The feature-gated dependency surface is clean today but has a real latent duplication risk.** `rmcp`'s Cargo.toml gates a second HTTP client (`reqwest`+`rustls`), a second HTTP server (`hyper`+`hyper-util`), and an OAuth2/JWT stack (`oauth2`, `jsonwebtoken` with `aws_lc_rs`) behind opt-in features grimoire does not enable. Nothing in `deny.toml` or CI would catch it if a future PR turned one of those features on to "add HTTP transport support" — it would silently duplicate the stack ECO-04/SEC-14 already govern.

## Findings

### 1. Identity and stewardship

- crates.io JSON API (`https://crates.io/api/v1/crates/rmcp`, fetched 2026-08-14): `description: "Rust SDK for Model Context Protocol"`, `repository: "https://github.com/modelcontextprotocol/rust-sdk/"`, `created_at: 2025-03-16T09:32:51Z`, `updated_at: 2026-08-07T20:40:37Z`, `newest_version`/`max_stable_version: 3.1.2`, `downloads: 20,176,988`, 60 published versions (one yanked: `0.1.0`).
- `crates.io/api/v1/crates/rmcp/owners`: three individual GitHub accounts hold crates.io publish rights (`4t145`, `jokemanfire`, `alexhancock`) — normal for an official SDK (crates.io ownership is always user/team-scoped, never "the org" itself) and not evidence of a personal fork.
- GitHub `repos/modelcontextprotocol/rust-sdk` (via `gh api`): `owner.login: modelcontextprotocol`, `owner.type: Organization`, `description: "The official Rust SDK for the Model Context Protocol"`, `archived: false`, `pushed_at: 2026-08-13T12:40:00Z` (one day before this research), 3,800 stars. The `modelcontextprotocol` org itself (`gh api orgs/modelcontextprotocol`) describes itself as the protocol's own org, blog `https://modelcontextprotocol.io`.
- **Conclusion**: this is the official SDK, actively maintained, published under the spec-owning org's name with individual named maintainers holding crates.io rights — the standard shape for this kind of project, not a red flag.
- No RUSTSEC advisory exists against the identity/stewardship of the crate itself (only against specific transport/auth code paths — [Finding 5](#5-security-advisories)).

### 2. Protocol version coupling and negotiation

The MCP specification uses date-stamped revisions (`YYYY-MM-DD`) and defines three revision states — **Draft**, **Current**, **Final** ([Versioning](https://modelcontextprotocol.io/specification/versioning), fetched 2026-08-14). As of this research, **the current protocol version is `2026-07-28`**.

That revision made a structural change to how a client and server agree on what they're speaking, documented on the spec's own [Versioning and Compatibility](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning) page:

> "There is no negotiation handshake. Every request carries its protocol version, and the server accepts or rejects each request independently."

The page defines the terms used throughout this finding:

> - **Modern**: protocol versions that convey version, identity, and capabilities as per-request metadata (revision `2026-07-28` and later).
> - **Legacy**: protocol versions that establish a session with an `initialize` handshake (`2025-11-25` and earlier).
> - **Dual-era**: an implementation that supports both modern and legacy versions.

Every request in the Modern model carries its version in `_meta["io.modelcontextprotocol/protocolVersion"]`; a server that doesn't implement the requested version **MUST** respond with `UnsupportedProtocolVersionError` (JSON-RPC code `-32022`) listing what it does support, and servers **MUST** implement the `server/discover` RPC so a client can learn supported versions up front. This is a genuinely different wire protocol from the `2025-11-25`-and-earlier `initialize`/`initialized` handshake documented on the [2025-11-25 Lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle) page (client sends `protocolVersion` in `initialize`, server echoes back a mutually-supported one, client disconnects if it can't accept the server's answer).

**Does an old server degrade gracefully, or does a newer client fail hard?** The spec answers this with an explicit compatibility matrix (same 2026-07-28 Versioning page), keyed by client/server era:

| Client | Server | Outcome |
|---|---|---|
| Modern | Legacy | **Fails.** No fall-forward mechanism for a Modern-only client against a Legacy-only server. |
| Dual-era | Legacy | **Works** — client probes, gets a non-modern response, falls back to `initialize`. |
| Legacy | Modern | **Fails.** Legacy clients have no fall-forward mechanism. |
| Legacy | Dual-era | **Works** — server answers `initialize` and serves legacy semantics. |
| Dual-era | Modern / Dual-era / Legacy | **Works** in every case. |

`rmcp`'s own model source (`crates/rmcp/src/model.rs`, fetched at tag `rmcp-v3.1.2`) defines every published revision as a typed constant:

```rust
pub const V_2026_07_28: Self = Self(Cow::Borrowed("2026-07-28"));
pub const V_2025_11_25: Self = Self(Cow::Borrowed("2025-11-25"));
pub const V_2025_06_18: Self = Self(Cow::Borrowed("2025-06-18"));
pub const V_2025_03_26: Self = Self(Cow::Borrowed("2025-03-26"));
pub const V_2024_11_05: Self = Self(Cow::Borrowed("2024-11-05"));
pub const LATEST: Self = Self::V_2025_11_25;
pub const STANDARD_HEADERS: Self = Self::V_2026_07_28;
```

`LATEST` is the last **Legacy** revision, not the spec's Current one — but the SDK is not merely Legacy-shaped. `crates/rmcp/src/handler/server.rs` (same tag) defines default trait methods on `ServerHandler` itself:

```rust
fn supported_protocol_versions(&self) -> Cow<'static, [ProtocolVersion]> { /* … */ }
fn discover(&self, context: RequestContext) -> impl Future<Output = Result<DiscoverResult, McpError>> + '_ {
    std::future::ready(Ok(DiscoverResult::from_server_info(
        self.supported_protocol_versions().into_owned(), /* … */
    )))
}
```
and the core request router intercepts `ClientRequest::DiscoverRequest` and calls `negotiate_protocol_version`/`uses_legacy_lifecycle` generically for every request, legacy or modern — this is dispatch-layer machinery, not something a `#[tool_router]` consumer opts into. Any `ServerHandler` implementor gets Dual-era behavior for free unless it overrides `discover()`. Grimoire's `GrimMcpServer` (`src/mcp/server.rs:144-162`) overrides only `get_info()`; it never touches `discover()` or `supported_protocol_versions()`. **Consequence**: grimoire's server is Dual-era by inheritance, which per the matrix above interoperates with every client era in the wild today — the "client on a newer revision fails hard" scenario the task asked about does not apply to grimoire's actual configuration. It would only start to matter if a future MCP client shipped Modern-*only* (no Legacy fallback) before grimoire's `rmcp` dependency is bumped past whatever introduced Dual-era support (already true at the pinned 3.1.0/3.1.2).

This SDK-level Dual-era default is itself dated: it landed in `3.0.0-beta.1` (2026-07-23) as `[**breaking**] add server discovery and negotiation (SEP-2575)` — five days of beta before `3.0.0` shipped stable on the spec's own release day.

### 3. API stability

`rmcp` is well past 1.0 (`1.0.0` shipped 2026-03-03, after roughly a year at `0.x`). Version history from the crates.io API, oldest to newest, shows this cadence:

| Version | Date | Note |
|---|---|---|
| `1.0.0` | 2026-03-03 | First stable |
| `1.8.0` | 2026-06-23 | Last 1.x |
| `2.0.0` | 2026-06-27 | Breaking |
| `2.2.0` | 2026-07-08 | Last 2.x |
| `3.0.0-beta.1`…`beta.5` | 2026-07-23 → 2026-07-28 | 5-day beta cycle |
| `3.0.0` | 2026-07-28 | Breaking, same day as spec revision `2026-07-28` |
| `3.1.2` | 2026-08-07 | Current as of this research |

The last two breaking releases, read from `crates/rmcp/CHANGELOG.md` at `rmcp-v3.1.2`:

- **`2.0.0`** (2026-06-27): `[**breaking**] align model types with MCP 2025-11-25 spec` (#927), `[**breaking**] relax tool result structuredContent type` (#919, immediately reverted in the same release per #932, then re-landed later — a same-release revert-and-redo).
- **`3.0.0`** (2026-07-28, via its beta series): `[**breaking**] add server discovery and negotiation (SEP-2575)` (#973), `[**breaking**] add SEP-2243 HTTP standard headers` (#907), `[**breaking**] add MRTR behavior support / model types (SEP-2322)` (#929, #915), `[**breaking**] Implement SEP-2663 Tasks Extension` (#1020), `[**breaking**] align metadata models with draft schema` (#993), `[**breaking**] type Annotations.lastModified as a string` (#956), `[**breaking**] remove deprecated v3 APIs` (#1066), `[**breaking**] remove server_info from DiscoverResult` (#1065), plus a breaking rename (`StreamableHttpServerConfig::stateful_mode` → `legacy_session_mode`).

Both majors are directly driven by MCP spec revisions landing (2025-11-25 for 2.0.0, 2026-07-28 for 3.0.0) — this crate's major-version cadence is coupled 1:1 to the spec's own revision cadence, not to an independent API-design clock. No stability statement (semver policy, "expect breaking changes until X", MSRV-bump policy) was found in the crate's README via `gh api` content fetch. The crate does declare `rust-version = "1.88"` (`edition = "2024"`) in its workspace `Cargo.toml` at `rmcp-v3.1.2` — comfortably under grimoire's pinned toolchain (`1.95.0`).

### 4. The transport and trust boundary

**Which transports does grimoire enable?** `Cargo.toml:69`: `rmcp = { version = "3.0.0", features = ["schemars", "transport-io"] }`. No `default-features = false`, so `rmcp`'s `default = ["base64", "macros", "server"]` is also active. None of `transport-streamable-http-server`, `transport-streamable-http-client*`, `server-side-http`, `transport-child-process`, or `auth` is enabled. `src/mcp/server.rs:192` calls `rmcp::transport::stdio()` directly — **stdio is the only transport grimoire ships.**

**Who can reach it, and is there authentication?** A stdio MCP server has no network listener; reachability is "whoever spawned the process and holds its stdin/stdout" — normally the MCP host application (Claude Desktop, Claude Code, another IDE) running as the same OS user. This matches the spec's own guidance in [Security Best Practices → Local MCP Server Compromise](https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices#local-mcp-server-compromise): "MCP servers intending for their servers to be run locally **SHOULD** implement measures to prevent unauthorized usage from malicious processes: Use the `stdio` transport to limit access to just the MCP client." No authentication exists or is needed at the transport layer for this reason — grimoire's own security model is "same user, same process tree," not network auth.

**What does a malicious client get to do?** Read tools (`grim_search`, `grim_status`, `grim_fetch`, `grim_describe`) are always routed; the network reads they trigger are scoped to the resolved scope's *configured* registries only — `SearchToolArgs`/`FetchToolArgs` deliberately expose no `registry` override, and the doc comment at `src/mcp/tool_args.rs:70-75` names the reason: "Honoring an arbitrary agent-supplied registry would let a prompt-injected agent point grim at an unconfigured host (SSRF, CWE-918)." This is corroborated by `adr_multi_registry_mcp.md:230-236`, which records the same decision. The one write tool, `grim_render`, is gated behind a launch-pinned `--allow-writes` flag (`build_router`, `src/mcp/server.rs:47-53`, hides *and* rejects the tool when off) — but once a server is launched with that flag, a client can direct `grim_render` to fetch any resolvable artifact and write its vendor-projected files to **any `dest_dir` the process user can write to** (`RenderToolArgs.dest_dir: PathBuf`, `src/mcp/tool_args.rs:149-152`, documented as "created if absent" with no path allowlist). This is a deliberate, documented trust decision ("enabling writes is a trust decision of whoever wires the server... never of the model", `src/command/mcp.rs:23-26`), not an oversight — but it means the write tool's actual containment lives entirely in whatever `ArtifactMaterializer`/`ClientTarget::materialize` do with attacker-influenced artifact/file names under that directory, which this dive did not verify end-to-end (see [Normative guidance candidate 9](#normative-guidance-candidates)).

**The inverse — what stops a registry-sourced description from carrying an injection payload out through a tool result?** Today, nothing at the MCP boundary. `to_json()` (`src/mcp/server.rs:166-168`) is:

```rust
fn to_json<T: serde::Serialize>(report: &T) -> Result<String, ErrorData> {
    serde_json::to_string(report).map_err(|e| ErrorData::internal_error(format!("serialize: {e}"), None))
}
```

— a direct `serde_json::to_string` with no sanitizer in between. The reports it serializes carry raw registry text: `SearchEntry`'s JSON documentation (`src/api/search_report.rs:14-22`) states plainly "The `description` stays full and untruncated." `grep -rn "sanitiz\|strip_ansi" src/mcp/` returns zero hits. Grimoire is not starting from nothing here — `sanitize_member_label` (`src/tui/render.rs:98`) already strips ANSI/CSI/OSC/DCS escapes, C0/C1 controls, bidi overrides (U+202A–U+202E) and isolates (U+2066–U+2069), and zero-width/BOM characters, with a table-driven test corpus (`src/tui/render.rs:2779+`) — this is the codebase's own SEC-34/36/37 implementation. It is wired into every TUI display path (`src/tui/detail.rs`, `src/tui/tree.rs`, `src/tui/render.rs`) but **never into `src/mcp/`**.

Whether this rises to a spec-level requirement, not just a house convention, is settled by the spec's own `server/tools` page. Its formal ["Security Considerations"](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#security-considerations) section states:

> "Servers **MUST**: Validate all tool inputs · Implement proper access controls · Rate limit tool invocations · **Sanitize tool outputs**"
>
> "Clients **SHOULD**: ... Validate tool results before passing to LLM"

Grimoire is unambiguously the "server" here, and "Sanitize tool outputs" is a spec **MUST**, not a best-practice suggestion. Separately, the spec's dedicated [Security Best Practices](https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices) page — the document that *does* cover confused-deputy, token passthrough, SSRF, state-handle hijacking, and OAuth URL validation in detail — has **no** dedicated section on tool-description/tool-result content injection into a model's context; that concern is addressed only in the terser `server/tools` MUST line quoted above, not developed as its own attack-and-mitigation writeup the way the OAuth-adjacent risks are. This is itself worth naming: the spec obligates sanitization but doesn't yet give implementers a worked threat model for it the way it does for OAuth — grimoire cannot lean on the spec's own prose to justify *what* a sufficient sanitizer covers, only that one is required.

**Cross-referencing SEC-34**: yes, the MCP surface needs its own render-boundary rule, and the shortest correct one is not a new sanitizer but a new *call site* for the existing one — see [Normative guidance candidate 1](#normative-guidance-candidates).

### 5. Security advisories

Five GitHub Security Advisories exist against `modelcontextprotocol/rust-sdk`'s `rmcp` crate (`gh api repos/modelcontextprotocol/rust-sdk/security-advisories`, fetched 2026-08-14):

| Advisory | CVE | Severity | Vulnerable range | Patched | Scope |
|---|---|---|---|---|---|
| [GHSA-89vp-x53w-74fx](https://github.com/modelcontextprotocol/rust-sdk/security/advisories/GHSA-89vp-x53w-74fx) (= [RUSTSEC-2026-0189](https://rustsec.org/advisories/RUSTSEC-2026-0189.html)) | CVE-2026-42559 | High (CVSS 7.1) | `< 1.4.0` | `>= 1.4.0` | DNS rebinding against the Streamable HTTP **server** transport (no `Host` validation) |
| [GHSA-9pj6-vhgr-3mwh](https://github.com/modelcontextprotocol/rust-sdk/security/advisories/GHSA-9pj6-vhgr-3mwh) | CVE-2026-63128 | High (CVSS 7.5) | `<= 1.7.0` | `2.0.0` | Unauthenticated session-table leak / DoS in `LocalSessionManager` (Streamable HTTP **server**) |
| [GHSA-c9xm-49cp-xcr9](https://github.com/modelcontextprotocol/rust-sdk/security/advisories/GHSA-c9xm-49cp-xcr9) | — | High | `<= 1.8.0` | `2.0.0` | OAuth client fetches server-controlled `resource_metadata` URLs (SSRF-adjacent) |
| [GHSA-9g45-5xwm-f3wc](https://github.com/modelcontextprotocol/rust-sdk/security/advisories/GHSA-9g45-5xwm-f3wc) | CVE-2026-64684 | High | `<= 1.7.0` | `2.1.0` | Custom HTTP headers leak to cross-origin redirect targets (HTTP **client**) |
| [GHSA-33f5-2c5q-wgwj](https://github.com/modelcontextprotocol/rust-sdk/security/advisories/GHSA-33f5-2c5q-wgwj) | CVE-2026-63127 | High | `<= 1.8.0` | `2.0.0` | Missing resource-field validation in OAuth Protected Resource Metadata discovery |

Every one of the five is scoped to either the Streamable HTTP server transport or the OAuth/HTTP client machinery. RUSTSEC-2026-0189's own advisory text is explicit: **"Non-HTTP transports such as stdio and child-process transports are not affected."** Grimoire enables neither the HTTP transport nor `auth` ([Finding 4](#4-the-transport-and-trust-boundary)), and its locked version (`3.1.0`/current `3.1.2`) is well above every patched floor regardless. **No live exposure for grimoire from any of the five.**

### 6. Feature surface — what `rmcp` pulls in

`rmcp`'s own `Cargo.toml` (fetched at `rmcp-v3.1.2`) declares `default = ["base64", "macros", "server"]` and gates everything else behind opt-in features:

```toml
client = ["dep:tokio-stream"]
server = ["transport-async-rw", "schemars", "dep:pastey", "uuid"]
auth = ["dep:async-trait", "dep:oauth2", "__reqwest", "dep:url"]
auth-client-credentials-jwt = ["auth", "dep:jsonwebtoken", "uuid"]
reqwest = ["__reqwest", "reqwest?/rustls"]
server-side-http = ["uuid", "dep:rand", "dep:tokio-stream", "dep:http", "dep:http-body",
                     "dep:http-body-util", "dep:bytes", "dep:sse-stream", "tower", "base64"]
transport-streamable-http-server = ["transport-streamable-http-server-session", "server-side-http", "transport-worker"]
transport-streamable-http-client-unix-socket = ["transport-streamable-http-client", "dep:hyper",
                     "dep:hyper-util", "dep:http-body-util", "dep:http", "dep:bytes", "tokio/net"]
transport-io = ["transport-async-rw", "tokio/io-std"]
```

Optional dependencies behind these features (from `crates.io/api/v1/crates/rmcp/3.1.2/dependencies`): `hyper` (`features = ["client", "http1"]`), `hyper-util`, `reqwest` (`default-features = false, features = ["json", "stream"]`), `oauth2`, `jsonwebtoken` (`features = ["aws_lc_rs"]`), `sse-stream`, `tower-service`, `url`, `rand`, `process-wrap`, `which`.

Grimoire's actual manifest (`Cargo.toml:69`) declares `features = ["schemars", "transport-io"]` — no `default-features = false`, so the crate defaults (`base64`, `macros`, `server`) apply too, which is exactly what grimoire's `#[tool_router]`/`#[tool_handler]` usage needs. Running the requested commands against grimoire directly:

```
$ cargo tree -e normal -i rmcp
rmcp v3.1.0
└── grimoire v0.13.0 (/home/mherwig/dev/grimoire)

$ cargo tree -e normal -p rmcp
rmcp v3.1.0
├── async-trait, base64, chrono, futures, pastey, rmcp-macros, schemars,
│   serde, serde_json, thiserror, tokio, tokio-util, tracing, uuid
```

**No `hyper`, `reqwest`, `oauth2`, `jsonwebtoken`, `oauth2`, `sse-stream`, `tower-service`, `url`, `rand`, `process-wrap`, or `which` appears anywhere in grimoire's resolved dependency graph.** `tokio` is the family's existing async runtime (crates-of-record: `tokio, features=["full"]`), not a second one. `chrono` is pulled in with `features = ["serde", "now"]` unioned onto grimoire's existing `chrono` (crates-of-record: `default-features=false, features=["clock"]`) — one crate, unioned features, not a second datetime crate. `serde_json` is the family's existing JSON path. **Against the explicit ECO-04 test ("a new dependency must not duplicate a job an existing dependency already does"), `rmcp` as configured today passes clean.**

The risk is latent, not present: every feature that *would* duplicate an already-governed job (`reqwest`+`rustls` for HTTP+TLS, `hyper`+`hyper-util` for a second HTTP server, `oauth2`+`jsonwebtoken` for an auth stack this codebase has no other instance of) sits one `features = [...]` edit away, and nothing in `deny.toml` or CI would flag it — `cargo deny check bans` bans crates by name, and none of these crates are banned, because today they are correctly absent rather than incorrectly present. See [Normative guidance candidate 2](#normative-guidance-candidates).

## Applied to the codebases

- `Cargo.toml:69` — `rmcp = { version = "3.0.0", features = ["schemars", "transport-io"] }`; `Cargo.lock:2343-2347` resolves `rmcp 3.1.0` (checksum recorded), one minor-patch line behind crates.io `3.1.2` as of this research.
- `src/mcp/server.rs:21-29` — imports `rmcp::handler::server::router::tool::ToolRouter`, `rmcp::handler::server::wrapper::Parameters`, `rmcp::{ErrorData, ServerHandler, ServiceExt, tool, tool_handler, tool_router}`.
- `src/mcp/server.rs:144-162` — `impl ServerHandler for GrimMcpServer` overrides only `get_info()`; `discover()`/`supported_protocol_versions()` are inherited from rmcp's default trait implementation (Dual-era support, [Finding 2](#2-protocol-version-coupling-and-negotiation)), and grimoire has no test exercising `server/discover` directly.
- `src/mcp/server.rs:166-168` — `to_json()`: `serde_json::to_string(report)`, no sanitization call. Confirmed by `grep -rn "sanitiz\|strip_ansi" src/mcp/` returning zero hits, against `src/tui/render.rs:98`'s `sanitize_member_label` existing and being wired into every TUI display path (`src/tui/detail.rs:228,237,257`; `src/tui/tree.rs:918`; `src/tui/render.rs:561,698,707,843`).
- `src/mcp/server.rs:172-174` — `tool_error()`: `ErrorData::internal_error(format!("{op} failed: {err:#}"), None)`, applied uniformly to every tool including `grim_render`. Cross-reference `.agents/adr/adr_multi_registry_mcp.md:239-244`, which records this as an accepted-for-v1 limitation (CWE-209) with an explicit revisit trigger — "before write tools land" — that `grim_render`'s later addition (`src/mcp/server.rs:133-141`) has already crossed without a revisit.
- `src/mcp/server.rs:47-53` (`build_router`) — `router.disable_route("grim_render")` when `!allow_writes`; tested at `src/mcp/server.rs:215-225` (`grim_render_gated_behind_allow_writes`).
- `src/mcp/server.rs:182-196` (`serve`) — `rmcp::transport::stdio()` is the only transport constructed; `service.waiting().await?` blocks until stdin EOF; returns `Ok(ExitCode::Success)` on clean disconnect (doc comment `src/mcp/server.rs:176-181`).
- `src/command/mcp.rs:22-28` — `McpArgs.allow_writes`, launch-pinned via `#[arg(long)]`, doc comment: "enabling writes is a trust decision of whoever wires the server into a harness, never of the model calling the tools."
- `src/mcp/tool_args.rs:70-75` (SearchToolArgs), `112-117` (FetchToolArgs) — no `registry` override exposed on either tool; comment names CWE-918/SSRF as the reason, matching `.agents/adr/adr_multi_registry_mcp.md:230-236`.
- `src/mcp/tool_args.rs:149-152` — `RenderToolArgs.dest_dir: PathBuf`, no containment beyond the doc comment "created if absent"; the write path's actual containment lives in `ArtifactMaterializer`/`ClientTarget::materialize` (`src/mcp/render.rs:120`), not verified end-to-end by this dive.
- `src/api/search_report.rs:14-22` — JSON format doc: "The `description` stays full and untruncated" — the exact field that reaches `to_json()` unsanitized.
- `.agents/research/rust-ecosystem.md:502-510` — the open question this dive answers: "the `starlark` and `rmcp` dependency clusters... deferred purely because neither has produced a symptom, which is not the same as being safe."
- `deny.toml:17-29` — `[advisories] unmaintained = "workspace"`, no existing `[advisories].ignore` entry for `rmcp`; `cargo deny check advisories` would catch a future RUSTSEC entry against grimoire's actual resolved version (none currently apply, [Finding 5](#5-security-advisories)).
- `rust-toolchain.toml:2` — `channel = "1.95.0"`, above rmcp's declared `rust-version = "1.88"` ([Finding 3](#3-api-stability)); no MSRV conflict.

## Normative guidance candidates

1. **Sanitize every MCP tool-result payload through grimoire's existing render-boundary sanitizer before it reaches `to_json()`.** *Rationale*: the MCP `2026-07-28` spec's `server/tools#security-considerations` states servers **MUST** "Sanitize tool outputs" — grimoire currently does not, and the fix is not a new sanitizer but a new call site for `sanitize_member_label` (or an MCP-scoped equivalent covering the same class: ANSI/CSI/OSC/DCS, C0/C1, bidi overrides/isolates, zero-width/BOM) applied to every string field of every report before serialization. **Verification**: a table-driven test analogous to `src/tui/render.rs:2779+`'s corpus, but asserting the payload is stripped from the actual JSON-RPC tool-result string returned by `src/mcp/server.rs`'s `to_json()`, not just the TUI path; `grep -n "sanitiz" src/mcp/server.rs` becomes non-empty. **MUST**.
2. **Add a CI check (or `deny.toml`-adjacent gate) that fails if `rmcp` resolves with any HTTP-transport or auth feature** (`transport-streamable-http-server`, `transport-streamable-http-client*`, `server-side-http`, `auth`, `auth-client-credentials-jwt`, `reqwest`, `reqwest-native-tls`, `reqwest-tls-no-provider`). *Rationale*: grimoire's design commits to stdio-only ([Finding 4](#4-the-transport-and-trust-boundary)); any of these features would silently pull in `hyper`+`reqwest`+`oauth2`+`jsonwebtoken`, duplicating the family's already-governed HTTP/TLS/auth stack (ECO-04) the moment a feature request or copy-pasted example adds one. **Verification**: `cargo tree -e normal -p rmcp | rg -i 'hyper|reqwest|oauth2|jsonwebtoken'` stays empty; wire it as a CI assertion, not a read-time-only observation. **SHOULD**.
3. **Close, or re-date, the ADR-acknowledged CWE-209 error-chain leak now that its own trigger condition has fired.** *Rationale*: `adr_multi_registry_mcp.md` explicitly deferred trimming `{err:#}` "before write tools land"; `grim_render` has landed and still uses the unconditional `tool_error()`. Either implement the trim (top-level message only, no filesystem-path-bearing chain) for write-tool errors, or add a new dated ADR entry that re-justifies keeping full chains post-`grim_render`. **Verification**: `src/mcp/server.rs`'s `tool_error()` no longer emits raw filesystem paths from `anyhow::Error`'s `{:#}` rendering, or `adr_multi_registry_mcp.md` gains a dated follow-up section addressing the crossed trigger. **MUST**.
4. **Pin `rmcp` with `default-features = false` and an explicit feature list.** *Rationale*: grimoire currently inherits `rmcp`'s `default = ["base64", "macros", "server"]` implicitly; a future rmcp release could add a feature to `default` (as crates occasionally do across majors) with zero diff in grimoire's own `Cargo.toml` to review. **Verification**: `Cargo.toml`'s `rmcp` line carries `default-features = false, features = ["macros", "server", "schemars", "transport-io"]` (or the then-current minimal set); `cargo tree -p rmcp` is unchanged by the switch (i.e., today's default set is confirmed to already equal what grimoire needs). **SHOULD**.
5. **Treat every `rmcp` bump as a protocol-surface review, not a routine dependency bump.** *Rationale*: two breaking majors landed in the five months since 1.0, each tracking a live MCP spec revision ([Finding 3](#3-api-stability)); a routine `cargo update` discipline that only reads `Cargo.lock`'s diff will miss SEP-numbered behavior changes that compile clean but alter wire semantics. **Verification**: the PR bumping `rmcp` links the relevant `CHANGELOG.md` section (`https://github.com/modelcontextprotocol/rust-sdk/blob/rmcp-v<version>/crates/rmcp/CHANGELOG.md`) and names any `[**breaking**]`-tagged entry. **SHOULD**.
6. **Add `rmcp` to `rust-cargo/crates-of-record.md`'s table** — job "MCP server SDK", crate `rmcp`, rationale "official SDK; hand-rolled JSON-RPC was rejected in `adr_multi_registry_mcp.md` as reimplementing commodified protocol work". *Rationale*: this dive is the first to review the crate at all ([Applied to the codebases](#applied-to-the-codebases), citing the open question); the table exists precisely so the next agent doesn't have to re-derive this. **Verification**: the table has an `rmcp` row; no `[bans].deny` entry is needed since there is no live alternative to ban. **SHOULD**.
7. **Route grim's own retryable input errors (bad reference string, artifact not found) through the tool result's `isError: true` content channel, not uniformly through `ErrorData::internal_error`'s JSON-RPC protocol-error channel.** *Rationale*: the spec's `server/tools#error-handling` section distinguishes "Protocol Errors" ("models are less likely to be able to fix") from "Tool Execution Errors" ("actionable feedback that language models can use to self-correct and retry"); grimoire's `tool_error()` sends everything through the former, including command-layer validation failures a model could plausibly retry with corrected arguments. **Verification**: classify `crate::fetch`/`crate::command::*::run`'s error variants into "malformed request" (stays protocol error) vs. "valid request, resolvable input mistake" (moves to `isError: true` content); at least reference-not-found and invalid-vendor-name land in the latter. **SHOULD**.
8. **Run `cargo update -p rmcp` before the next release cut** to move from the locked `3.1.0` to current `3.1.2` (bug fixes only — MRTR state exposure, cache-hint emission, SSE auth-challenge mapping — none touching grimoire's enabled features). *Rationale*: ECO-03's discipline ("read what a fresh release contains before trusting it") applied here finds nothing alarming, only routine hygiene. **Verification**: `cargo tree -p rmcp` shows `3.1.2`; the bump is its own commit. **CONSIDER**.
9. **Verify `grim_render`'s write-path containment in a follow-up dive.** *Rationale*: `RenderToolArgs.dest_dir` is an arbitrary, agent-supplied `PathBuf` with no allowlist visible in `src/mcp/render.rs`'s first 140 lines; this dive did not trace whether `ArtifactMaterializer::materialize`/`ClientTarget::materialize` can be induced to write outside `dest_dir` via a crafted artifact/file name (the SEC-08/SEC-10 territory `grim install` already has to answer for the same materializer). **Verification**: a fixture artifact with a `../`-bearing internal file name, rendered via `grim_render`, asserts the write stays under `dest_dir`. **CONSIDER**.

## Contested / evolving

- **The Modern (`2026-07-28`) per-request negotiation model is only weeks old as of this research.** Whether real-world MCP hosts (Claude Desktop, Claude Code, other IDEs) have adopted Modern-era client behavior yet — as opposed to remaining Legacy (`initialize`-handshake) clients indefinitely — is not something this desk research can confirm; it would need a live-client trace against grimoire's actual server. The risk analysis in [Finding 2](#2-protocol-version-coupling-and-negotiation) is spec-matrix-correct but not empirically verified against a specific shipping client.
- **`rmcp`'s own `LATEST` constant staying at `2025-11-25`** even though the crate implements the Modern/`2026-07-28` model end-to-end (dispatch, `_meta` decode, `server/discover`) suggests the SDK's own maintainers are being deliberately conservative about which version a *default*, unconfigured session negotiates into. Whether that changes in a near-future release (bumping `LATEST` to `2026-07-28`) is unresolved and would itself be a breaking behavior change worth re-checking before the next `rmcp` major.
- **Whether rmcp's two-majors-in-five-months cadence is a temporary artifact of the spec's own SEP process stabilizing, or the crate's steady state**, is unresolved from the evidence gathered here. The pattern (major version ships the same day as the spec revision it implements) argues for "coupled to an external clock that is itself still moving fast," not for "the crate's API design is unsettled" — but downstream consumers experience the same churn either way.
- **The MCP spec's own Security Best Practices page has no dedicated attack-and-mitigation writeup for tool-description/tool-result content injection**, unlike its treatment of OAuth-adjacent risks (confused deputy, SSRF, token passthrough all get full sections). The obligation exists (`server/tools`'s "Sanitize tool outputs" MUST) but the *threat model* — what specifically must be stripped, at what boundary — is left to implementers. Grimoire's SEC-34-derived sanitizer is a reasonable answer, but it was designed for terminal rendering, not for "text an LLM will read as tool output," and the two threat models are not proven identical (e.g., whether bidi-override stripping matters to an LLM reader the way it matters to a terminal is untested here).

## Sources

| Source | What it established | URL |
|---|---|---|
| crates.io JSON API, `rmcp` | Identity, `updated_at`, `newest_version`, download count, version history (60 releases) | https://crates.io/api/v1/crates/rmcp |
| crates.io JSON API, `rmcp/owners` | Publish-rights holders (3 individuals) | https://crates.io/api/v1/crates/rmcp/owners |
| crates.io JSON API, `rmcp/3.1.2/dependencies` | Full normal + optional dependency list with feature gates | https://crates.io/api/v1/crates/rmcp/3.1.2/dependencies |
| GitHub API, `repos/modelcontextprotocol/rust-sdk` | Org ownership, "official Rust SDK" description, activity (`pushed_at`) | https://api.github.com/repos/modelcontextprotocol/rust-sdk |
| GitHub API, `orgs/modelcontextprotocol` | Org identity, backs `modelcontextprotocol.io` | https://api.github.com/orgs/modelcontextprotocol |
| GitHub API, `rust-sdk/tags` | Per-crate release tag scheme (`rmcp-vX.Y.Z`) used to pin all subsequent fetches | https://api.github.com/repos/modelcontextprotocol/rust-sdk/tags |
| GitHub raw content, `crates/rmcp/Cargo.toml` @ `rmcp-v3.1.2` | Full feature graph, optional deps, default features, `rust-version` | https://github.com/modelcontextprotocol/rust-sdk/blob/rmcp-v3.1.2/crates/rmcp/Cargo.toml |
| GitHub raw content, `crates/rmcp/CHANGELOG.md` @ `rmcp-v3.1.2` | Every release back to 2.0.0 with breaking-change tags and SEP references | https://github.com/modelcontextprotocol/rust-sdk/blob/rmcp-v3.1.2/crates/rmcp/CHANGELOG.md |
| GitHub raw content, `crates/rmcp/src/model.rs` @ `rmcp-v3.1.2` | `ProtocolVersion` constants, `LATEST`, `STANDARD_HEADERS` | https://github.com/modelcontextprotocol/rust-sdk/blob/rmcp-v3.1.2/crates/rmcp/src/model.rs |
| GitHub raw content, `crates/rmcp/src/model/meta.rs` @ `rmcp-v3.1.2` | `_meta` protocol-version key, per-request metadata requirements for `2026-07-28` | https://github.com/modelcontextprotocol/rust-sdk/blob/rmcp-v3.1.2/crates/rmcp/src/model/meta.rs |
| GitHub raw content, `crates/rmcp/src/handler/server.rs` @ `rmcp-v3.1.2` | Default `discover()`/`supported_protocol_versions()` on `ServerHandler`; dispatch-level `negotiate_protocol_version`/`uses_legacy_lifecycle` | https://github.com/modelcontextprotocol/rust-sdk/blob/rmcp-v3.1.2/crates/rmcp/src/handler/server.rs |
| GitHub code search, `repo:modelcontextprotocol/rust-sdk fn discover` | Located `server/discover` implementation + dedicated test files | https://github.com/search?q=repo%3Amodelcontextprotocol%2Frust-sdk+fn+discover&type=code |
| GitHub Security Advisories, `rust-sdk` repo | All 5 GHSA advisories, vulnerable/patched ranges, CVSS, severity | https://github.com/modelcontextprotocol/rust-sdk/security/advisories |
| RustSec advisory database, `RUSTSEC-2026-0189` | Formal advisory record, "stdio... not affected" statement, patched floor | https://rustsec.org/advisories/RUSTSEC-2026-0189.html |
| MCP spec — Versioning | Revision states (Draft/Current/Final), current revision = `2026-07-28` | https://modelcontextprotocol.io/specification/versioning |
| MCP spec — 2026-07-28 Basic/Versioning and Compatibility | Modern/Legacy/Dual-era terms, `UnsupportedProtocolVersionError`, full compatibility matrix | https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning |
| MCP spec — 2025-11-25 Basic/Lifecycle | Legacy `initialize`-handshake mechanics for comparison | https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle |
| MCP spec — 2026-07-28 Security Best Practices | Confused deputy, token passthrough, SSRF, state-handle hijacking, local-server-compromise stdio guidance | https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices |
| MCP spec — 2026-07-28 Server/Tools | Tool result shapes, error-handling model (protocol vs. execution errors), formal "Security Considerations: Servers MUST... Sanitize tool outputs" | https://modelcontextprotocol.io/specification/2026-07-28/server/tools |
| grimoire repo (local, HEAD 2026-08-14) | `Cargo.toml`/`Cargo.lock`, `src/mcp/*.rs`, `src/command/mcp.rs`, `src/tui/render.rs`, `src/api/search_report.rs`, `deny.toml`, `rust-toolchain.toml` — the actual feature pin, transport choice, and (non-)sanitization ground truth | (local paths, see [Applied to the codebases](#applied-to-the-codebases)) |
| `.agents/adr/adr_multi_registry_mcp.md`, `.agents/adr/adr_mcp_percall_scope_fetch_render.md` | grimoire's own design rationale for choosing `rmcp` over hand-rolled JSON-RPC, the SSRF-scoped registry allowlist, and the accepted-but-expired CWE-209 error-chain limitation | (local paths) |
