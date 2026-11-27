# Commission: channel-agent-boundary / core-facts-and-channel-inventory

Topic question: On every public channel, what may an agent do by itself, which platform-native labels must it set and where, and how does a channel skill keep its platform facts and the organisation's channel list from going stale?

Investigate two dated registries every channel skill depends on.
(a) Platform facts: how fast channel facts change, so each skill's facts file gets a refresh cadence grounded in data rather than a guess.
(b) The channel inventory: one file per organisation listing every account (platform, handle, URL, owner role, last checked), and the inbound-link check that every listed channel is linked from at least one owned surface and that no surface links a handle missing from the file.
Start from the dated-fact tables in all 13 channel scouts and LO#6, LC#34, LA#35, YS#31, YP#35, VP#37, SF#32, MB#9, MB#34, CM#32, CM#33, LP#33, GH#40, AE#38. For (b) read product-audit/distribution-posture.md smell 4 and pattern 8 (YouTube channel linked from 0 of 17 repos and no site; Discord invite in 4 OCX places, 0 Grimoire) and the "Fleet evidence" grep in product-audit/exemplar-youtube-channels.md.
Primary sources: the Wayback CDX server API documentation (internetarchive/wayback, wayback-cdx-server); the github/docs repository history, which gives exact edits for GitHub Docs pages; two volatile-fact datasets with public edit history as exemplars of fact versioning: endoflife-date/endoflife.date and mdn/browser-compat-data; this catalog's own convention ("measured <date>" in rules/swift-quality.md, "unverified:" markers in rules/docs-quality.md, and the refresh commits on branch refresh/2026-11, read with git log only).
Re-fetch every dated figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite:
- sample at least 40 facts across platforms; for GitHub Docs facts count edits from gh api 'repos/github/docs/commits?path=<file>'; for the rest query https://web.archive.org/cdx/search/cdx?url=<page>&output=json&from=2024&collapse=digest and diff the fact across captures;
- state the limit: CDX records captures, not edits, so several edits between captures count once and a reverted edit is invisible; report CDX counts as lower bounds with the median capture interval per page;
- count sampled help pages with an absolute date versus only a relative age;
- re-run the posture audit's link grep for every known account across the 17 clones and the built site HTML;
- record every command and the sample list.
Out of scope: decay of the team's own posts (marketing SEO).
Decide:
- the facts-file schema (fact, value, URL, verified date, refresh days, provenance label) and whether facts live per skill or in one shared reference;
- the refresh cadence per platform and the staleness check that fails CI;
- the channel inventory schema and location, and the inbound-link check with its pass condition.
