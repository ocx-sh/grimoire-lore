# typescript-quality

Standards for writing and reviewing TypeScript: the gate, sixteen
merge-blocking non-negotiables, and twelve depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/typescript-quality
```

Loads on `**/*.ts`, `**/*.tsx`, `**/*.mts` and `**/*.cts`. The index is 142
lines and always present; a depth file is read only when the work calls for
it.

## It starts by assuming your lint is inert

Roughly fifty rules — the whole `no-unsafe-*` family,
`no-floating-promises`, `no-misused-promises`,
`switch-exhaustiveness-check` — need type information and are off by
default. A config without `parserOptions.projectService`, or a Biome rule
key written outside its group, never warns that those rules are dead. It
just never fires them, and inert is indistinguishable from clean.

So the first instruction in this set is not a rule about code. It is: prove
the gate can go red, then trust the rest. Everything downstream is
unenforceable until that is wired, and a green run on an unwired config is
the most expensive kind of false evidence.

## Written against four shapes, not one

Most TypeScript guidance assumes a server, or assumes a browser, and then
gives advice that is wrong in the other. This set was derived by measuring
four targets whose failure modes barely overlap:

| Shape | What makes it different |
|---|---|
| A Node CLI that ships a `bin` | Its contract is exit codes and stream discipline. `process.exit()` truncates a pending write; stdout carrying one message *about* the run breaks every consumer that parses it |
| A published typed package | Node resolves the specifiers, so `moduleResolution` and `exports` key order decide whether a downstream `--strict` consumer sees types or `any`. The declaration is not the artifact |
| A browser SPA | DOM sinks, CSP, a bundle budget, and a generated RPC client that types a payload nothing validated |
| An editor or Electron extension host | Runs inside a shared process it does not control: activation order, disposal, the webview boundary, workspace trust, and a host API that must be doubled rather than imported |

A rule that binds only one shape says so. The tsconfig strictness floor is
stated per shape for the same reason — the right `module`/`moduleResolution`
pairing depends entirely on which program reads the specifiers last.

## What is in it

The index carries the gate, sixteen non-negotiables, and three cross-cutting
rules it owns outright. Over 180 further rules live in twelve depth files:
gate wiring, types and narrowing, async and deadlines, errors and untrusted
payloads, the CLI exit-code and stream contract, resources and child
processes, modules and resolution, security, testing, observability, browser
SPAs, and the extension host.

Every rule carries an ID, a rationale, a runnable verification, and a
severity. Nothing routes through a topic index — you read the file for the
work you are about to do, and those files do not point at each other.

## Every verification was watched go red

The rule this set is strictest about is the one it applies to itself: a
check that cannot fail certifies an unchecked change as a checked one, and
reads exactly like a passing one forever. Every verification here was run
against a deliberately broken copy before it shipped.

The corollary is a second rule most rule sets lack: half these checks are
*inverted* — a missing `projectService`, an absent `typecheck` script, four
rules gone after a Biome migration are each the finding, not the pass. Every
verification states which way empty output reads.

## Pinned decisions

The exit-code table, the `any` exception list and the bundle budget encode an
agreed decision rather than a derivable fact. They are marked pinned: an
adopter may override one, once, in their own config or code module — never
per call site. Overriding a pinned default is a decision; ignoring it is a
violation.

## What it does not cover

No architecture, no folder layout, no framework opinion, no style that a
formatter already settles. It names traps, not maps: the shape of a
particular codebase is discoverable by reading it, so it is not in here. It
also does not cover the files a compiler never checks — those are the
sibling's.

## Sibling

`typescript-packaging` covers `package.json`, `tsconfig*.json` and the lint
config itself, on globs this set deliberately does not touch, so the two
never load together. Bundled as `typescript-essentials`.
