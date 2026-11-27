---
title: "Follow-up q3: is the noindex on b-cdn.net preview hosts a Bunny default or fleet configuration?"
program: product
topic: marketing-discoverability
worker: followup-q3
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 7
---

# Is `x-robots-tag: noindex` on `*.b-cdn.net` a Bunny default?

## Answer

It is fleet configuration, not a Bunny default. A custom preview domain therefore does not lose the header silently by Bunny's doing. It loses it by omission, unless the fleet's own host list is updated, and the fleet's verifier catches that omission.

Three independent findings:

1. Three live `*.b-cdn.net` zones that the fleet does not own answer 200 with no `x-robots-tag` (measurement 1).
2. The fleet's own Bunny edge-rule generator writes a `Set Response Header` rule named `ocx:noindex` for each non-public host (`ocx-sh/website/infra/bunny/rules.mjs:402-408`). The planned rules in `infra/bunny/__snapshots__/plan-preview-ocx.json` carry `X-Robots-Tag: noindex, nofollow` with the trigger pattern `https://sh-ocx-preview-ocx.b-cdn.net/*`.
3. Bunny's documentation lists no robots or indexing property. In the [list pull zones reference](https://bunny.net/docs/reference/pullzonepublic_index) (`last-modified` 2026-11-27, fetched 2026-11-27) none of the 141 response properties matches robots, noindex or crawl; the only SEO-named one is `OptimizerPrerenderHtml` ("Determines if the SEO HTML prerender is enabled"). The custom-hostname, edge-rule-redirect, static-site-hosting and limits pages contain zero matches for robots or noindex (measurement 2).

## Measurements (2026-11-27, from this machine, read-only HEAD requests)

Measurement 1. Fleet zones against third-party zones.

```
$ for u in https://sh-ocx-preview-ocx.b-cdn.net/ https://sh-ocx-dev.b-cdn.net/ https://sh-ocx.b-cdn.net/; do echo "== $u"; curl -sI -m 15 "$u" | grep -iE '^(HTTP|x-robots|server|cdn-pullzone)'; done
== https://sh-ocx-preview-ocx.b-cdn.net/
HTTP/2 200
server: BunnyCDN-DE1-1330
cdn-pullzone: 6775825
x-robots-tag: noindex, nofollow
== https://sh-ocx-dev.b-cdn.net/
HTTP/2 200
server: BunnyCDN-DE1-1332
cdn-pullzone: 6740411
x-robots-tag: noindex, nofollow
== https://sh-ocx.b-cdn.net/
HTTP/2 200
server: BunnyCDN-DE1-1331
cdn-pullzone: 6740409
x-robots-tag: noindex, nofollow

$ for u in https://test.b-cdn.net/ https://example.b-cdn.net/ https://bunnynet-avatars.b-cdn.net/; do echo "== $u"; curl -sI -m 10 "$u" | grep -iE '^(HTTP|server|cdn-pullzone|x-robots|content-type)'; done
== https://test.b-cdn.net/
HTTP/2 200
content-type: text/html
server: BunnyCDNE-DE1-1330
cdn-pullzone: 1010
== https://example.b-cdn.net/
HTTP/2 200
content-type: text/html; charset=utf-8
server: BunnyCDN-DE1-1332
cdn-pullzone: 1292535
== https://bunnynet-avatars.b-cdn.net/
HTTP/2 200
content-type: text/html
server: BunnyCDN-DE1-1330
cdn-pullzone: 1063562
```

The three third-party zones (pull-zone ids 1010, 1292535, 1063562) serve 200 on a `b-cdn.net` host with no `x-robots-tag`. The default hostname alone adds no header on these three zones. Three zones are a sample, not a census; no claim is made about zone age. Limit: I could not see these zones' edge rules, so I cannot rule out that their owners removed a header Bunny adds. Nothing in Bunny's documentation says Bunny adds one (measurement 2).

Measurement 2. Bunny documentation, raw fetch and grep. Run 2026-11-27T13:16Z in `~/.cache/research-lang/exemplars/product/wave2/q3/`. Bunny pages carry no author date; the `last-modified` response header is the only date and is shown.

```
$ for p in cdn/custom-hostname reference/pullzonepublic_index storage/static-site-hosting/index.md cdn/edge-rules/redirect-hostname cdn/limits; do f=$(echo $p | tr '/' '_'); curl -sL -m 30 -D $f.hdr -o $f.body "https://bunny.net/docs/$p"; grep -iE '^(HTTP|last-modified)' $f.hdr | tail -2; done
cdn/custom-hostname:               HTTP/2 200, last-modified: Fri, 27 Nov 2026 12:14:40 GMT (165986 bytes)
reference/pullzonepublic_index:    HTTP/2 308 then 200, last-modified: Fri, 27 Nov 2026 13:16:36 GMT (802003 bytes)
storage/static-site-hosting/index.md: HTTP/2 200, last-modified: Fri, 27 Nov 2026 13:10:23 GMT (9813 bytes)
cdn/edge-rules/redirect-hostname:  HTTP/2 200, last-modified: Fri, 27 Nov 2026 12:15:00 GMT
cdn/limits:                        HTTP/2 200, last-modified: Fri, 27 Nov 2026 12:14:40 GMT

$ grep -ciE 'robots|noindex' *.body
storage_static-site-hosting_index.md.body:0
cdn_custom-hostname.body:0
reference_pullzonepublic_index.body:0
cdn_edge-rules_redirect-hostname.body:0
cdn_limits.body:0
```

The `last-modified` values equal the fetch time, so they reflect server regeneration, not content age. They are not documentation dates. Property scan of the list-pull-zones page (141 distinct response properties):

```
$ python3 -I -c "... re.findall(r'\"([A-Z][A-Za-z0-9]+)\":\{\"type\"', page) ..., filter robot|index|seo|crawl|header|prerender"
141 properties
['AddCanonicalHeader', 'AddHostHeader', 'EnableAccessControlOriginHeader', 'OptimizerPrerenderHtml', 'OrderIndex']

$ grep -oiE '.{0,80}\bSEO\b.{0,80}' reference_pullzonepublic_index.body | head -5
]:!py-0 ...<p class="whitespace-pre-line">Determines if the SEO HTML prerender is enabled</p>...
n"},"OptimizerPrerenderHtml":{"type":"boolean","description":"Determines if the SEO HTML prerender is enabled","uniqueKey":"items.[INDEX].OptimizerPrerenderHtml",...
```

`AddCanonicalHeader` is the nearest property (a canonical `Link` header, not noindex). No robots property exists in the vendor reference.

Default hostname after a custom one is added: the [custom-hostname page](https://bunny.net/docs/cdn/custom-hostname) says "Use a custom hostname to serve CDN content from your own domain instead of the default bunny.net URL." (extracted from the page source). The [redirect-hostname edge-rule page](https://bunny.net/docs/cdn/edge-rules/redirect-hostname) lists "SEO purposes (avoiding duplicate content)" as a reason and gives the trigger pattern `*://yourzone.b-cdn.net/*`. Both are consistent with `b-cdn.net` staying reachable after a custom hostname is added, and with Bunny not hiding it or noindexing it itself: Bunny documents a redirect edge rule as the owner's remedy for duplicate content. This is an inference from documentation, not a test.

Measurement 3. Fleet configuration, `/home/mherwig/dev/ocx-sh/website` at commit `a9dd6af515bb6244063c8ddab0ce5508b6d7e5a2` (2026-11-16), read 2026-11-27:

```
$ sed -n 402,408p infra/bunny/rules.mjs
      : [
          header(
            'noindex',
            hosts.filter((h) => h !== PUBLIC_HOST),
            'X-Robots-Tag',
            'noindex, nofollow',
          ),
$ sed -n 7p infra/bunny/zones.mjs
export const PUBLIC_HOST = 'ocx.sh';
$ sed -n 182,184p infra/bunny/rules.mjs
function onHosts(hosts, suffixes) {
  return hosts.flatMap((h) => suffixes.map((s) => `https://${h}${s}`));
}
$ sed -n 6,24p infra/bunny/__snapshots__/plan-preview-ocx.json
  "rules": [
    {
      "ActionType": 5,
      "ActionParameter1": "X-Robots-Tag",
      "ActionParameter2": "noindex, nofollow",
      ...
      "Description": "ocx:noindex",
      "Triggers": [ { ... "PatternMatches": [ "https://sh-ocx-preview-ocx.b-cdn.net/*" ] } ]
$ sed -n 120,136p infra/bunny/verify.mjs   (relevant lines)
 * @param {boolean} noindex whether the host must answer `noindex`: every host but `ocx.sh`
  const indexed = !/noindex/i.test([headers['x-robots-tag'] ?? ''].flat().join(','));
  if (noindex && indexed) out.push('X-Robots-Tag has no noindex');
  if (!noindex && !indexed) out.push('X-Robots-Tag has noindex on the public host');
$ sed -n 177,180p HANDOVER.md
- Two pull zones over the same storage: `sh-ocx-dev` (`sh-ocx-dev.b-cdn.net`,
  `noindex`, edge-rule staging) and `sh-ocx` (prod, adds `ocx.sh` and the
  rehearsal host `next.ocx.sh`, `noindex`).
$ sed -n '177p;209p' infra/cutover/README.md
Verify: green. ... `X-Robots-Tag: noindex` is present, as on a `b-cdn.net` host, so the rehearsal stays out of search engines. ...
Verify: green. Probe P-N1 holds here: nginx sends `Host: ocx.sh`, so Bunny serves the `ocx.sh` rules with no `X-Robots-Tag`. ...
$ sed -n 85,88p scripts/previews/sites.mjs
 * Where the preview is served: the pull zone's own host, until `<slug>.preview.ocx.sh` exists.
 * The one place that changes then.
 */
export const previewUrl = (site) => `https://${previewZone(site)}.b-cdn.net/`;
$ sed -n 25p examples/previews/astro.config.mjs
      head: [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' } }],
```

Reading: the rule is a `Set Response Header` (ActionType 5) with `X-Robots-Tag: noindex, nofollow`, triggered by URL pattern per host, built over every host in the zone plan except `ocx.sh`. A host not in the plan matches no trigger. `verify.mjs` flags `X-Robots-Tag has no noindex` on any non-public host it probes. `HANDOVER.md:191` (50 edge rules per pull zone budget) was read in the first pass and is not needed for this answer.

## What this means for a custom preview domain

- The header does not travel with the zone as a Bunny property. It travels with the host list in the fleet's rule generator. A new `<slug>.preview.ocx.sh` host gets `noindex` only if it is added to the preview zone's `hosts` in the plan that `rules.mjs` renders.
- If the host is omitted from `hosts`, the rule's trigger pattern (`https://sh-ocx-preview-<slug>.b-cdn.net/*`) does not match the new host, and the preview answers without the header. `b-cdn.net` stays noindex, the custom host does not.
- Adding the custom host also does not remove the `b-cdn.net` host. The custom-hostname page does not say whether the default hostname stays reachable; the redirect-hostname page implies it does (measurement 2). Untested.
- Not measured: whether `verify.mjs` is run against a custom preview host in CI. That needs the fleet to have such a host, and none exists yet. `preview.ocx.sh` has no preview host today (`scripts/previews/sites.mjs:85`).
- Bunny-side risk of silent loss: none found. Fleet-side risk: one omitted host in `rules.mjs`.

## Effect on the ruleset

- **MKT-SEO-14 (retired): confirm retirement.** Its basis (a competent model already marks previews noindex) stands, and this answer adds a fleet fact: the noindex is deliberate edge configuration with a verifier, so a violation would be loud, not silent. The retired-rule fleet row needs one wording change: replace "Bunny zones at `https://sh-ocx-preview-<site>.b-cdn.net/` ... `x-robots-tag: noindex, nofollow`" implying a platform property with "set by the fleet's edge rule `ocx:noindex`, not a Bunny default (followup-q3)". Verification (confirms the wording is true): `curl -sI https://sh-ocx-preview-ocx.b-cdn.net/ | grep -i '^x-robots-tag:.*noindex'` prints a line, and `grep -c '"Description": "ocx:noindex"' infra/bunny/__snapshots__/plan-preview-ocx.json` in `ocx-sh/website` prints 1 or more. Both pass on 2026-11-27; the first requires the zone to be live.
- **MKT-SEO-17 (live check on public name): change by adding a clause, SHOULD stays MUST as is.** New last sentence: "On a preview or rehearsal host, the same sample must also answer `x-robots-tag: noindex` in the response headers; the check on a host that is not the public host fails when the header is absent." Verification: `curl -sI https://$PREVIEW_H/ | grep -i '^x-robots-tag:.*noindex'` prints a line (exit 0). Reason: the header is configuration, so a hostname change can drop it, and a crawler that sees a preview under a new name without it may index duplicate content. Applies only to hosts the fleet marks as non-public, so the host list must come from the zone plan, not from the command line.
- **NEW rule MKT-SEO-26 (proposed). When adding or renaming a hostname on a CDN zone that serves previews, add the host to the plan that sets `X-Robots-Tag: noindex` before routing traffic to it.** Severity: MUST for a fleet repository that has a preview zone; not applicable elsewhere. Rationale: on Bunny, the header is not a zone property or a `b-cdn.net` default; it is an edge rule matched per host URL. Verification: `curl -sI https://<new-host>/ | grep -i '^x-robots-tag:.*noindex'` prints a line, run before the host is announced; and for a plan file, `grep -c 'X-Robots-Tag' infra/bunny/__snapshots__/plan-preview-*.json` is at least 1 for each preview plan, and the plan's trigger patterns contain the new host. Limit: the fleet-specific paths apply to the ocx.sh website repository only; the `curl` check is general.

No rule is promoted or demoted.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| Fleet zones answer `x-robots-tag: noindex, nofollow`; three third-party `b-cdn.net` zones answer none | measurement 1, curl from this machine | 2026-11-27 |
| Bunny pull zone API lists no robots or noindex property | [Bunny API, list pull zones](https://bunny.net/docs/reference/pullzonepublic_index), vendor documentation | `last-modified` 2026-11-27 (regeneration time); fetched 2026-11-27 |
| Bunny custom-hostname, redirect-hostname, limits and static-site pages contain no robots or noindex text | [custom hostname](https://bunny.net/docs/cdn/custom-hostname), [redirect hostname](https://bunny.net/docs/cdn/edge-rules/redirect-hostname), vendor documentation | no content date; `last-modified` 2026-11-27, fetched 2026-11-27 |
| The fleet sets noindex by edge rule `ocx:noindex` per host | `ocx-sh/website/infra/bunny/rules.mjs:402-408`, `infra/bunny/__snapshots__/plan-preview-ocx.json` | commit a9dd6af (2026-11-16), read 2026-11-27 |

## What could not be determined

- Whether Bunny keeps serving the default `b-cdn.net` hostname after a custom hostname is added to the zone. Documentation only implies it (redirect-hostname page). Needs a Bunny account with a zone to test, which this task forbids, or Bunny support.
- Whether the three third-party zones removed a Bunny-supplied header through their own edge rules. Needs their owners or Bunny support. No Bunny document found says a header is added.
- Whether the owner's CI runs `infra/bunny/verify.mjs` against the future `<slug>.preview.ocx.sh` hosts. Those hosts do not exist yet.
- Bunny documentation pages carry no date, so no claim here has a documentation date; the measurements are dated instead.
