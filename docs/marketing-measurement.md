# marketing-measurement

Rules for measuring a site, docs, README or campaign without breaking consent
law or misreporting a number. The default is no client-side measurement, no
tags, and no number without its definition.

```sh
grim add ghcr.io/ocx-sh/lore/marketing-measurement
```

Reach for it when someone proposes adding analytics such as Plausible, Umami,
GoatCounter, Fathom, PostHog, Google Analytics or Cloudflare Web Analytics.
Also use it for a tracking pixel, UTM parameters, a metrics dashboard or
report, a growth number on a page, or an A/B test.

## An agent asked to "see what works" adds a script

It adds a script, tags every link and quotes a count as users. This skill stops
each step. A decision record from the owner comes before any analytics script,
pixel, SDK or beacon.

A consent exemption holds only when every condition holds. The privacy statement
must match the built output and the live page. UTM tags use one closed format
and are never put on a link to a host the project owns.

Every reported number carries five fields beside it. No count is reported as
people. Each count uses its own vendor's wording. An A/B test needs a
pre-registered sample size, and an AI-citation report is per engine with
counts and intervals.

## Research, not legal advice

The numbers behind each rule are dated rows in `references/facts.md`. This is
research, and the agent never decides a legal question. It writes "the vendor
states", never "consent-free" or "cookieless" as its own conclusion.

21 rows in the depth files hold the rationale and verification. 17 of them are
MUST. Three scripts check what a site loads against the decision record, what a
report may claim, and campaign tags. Each carries `--self-test`.

## What it does not cover

GitHub stars, clones and download counts belong to `github-presence`. Head tags
and `robots.txt` belong to `marketing-quality`.

## Siblings

`docs-instrument` and the `docs-quality-reference` observability rows defer to
this skill before a page-analytics script is added. `marketing-quality` routes here for MKT-MEAS. Bundled as
`product-essentials`.
