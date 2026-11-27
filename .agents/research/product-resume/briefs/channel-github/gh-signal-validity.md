# Commission: channel-github / gh-signal-validity

Topic question: Which repository, release and registry surfaces must every fleet repository set, to which published limits, and which GitHub and registry numbers may a team report, so GitHub works as the distribution channel it already is?

Investigate which GitHub and package-registry numbers a team may report as distribution or launch results, and how to keep them honest. This dive is the sole owner of the GitHub traffic API and the archive-job decision.
GitHub: stars (no unstar events in the API), the traffic window and the archive job it forces, referrers, fake-star exposure, permitted versus banned star calls to action, Trending decay, and the OSS Insight shutdown the scout dates 2026-12-04.
Registries: crates.io, PyPI (pypistats and the BigQuery dataset), npm downloads API, Homebrew analytics, VS Code Marketplace installs; what each counts, including CI and mirror traffic. Product Hunt and HN native counters as read-only results.
Start from GH#22 to GH#25, GH#34, GH#35, GH#40, LP#5, LP#34, LP#36, AE#25. Read product-audit/distribution-posture.md section 3 (no site analytics by decision; npm 5,353 and 1,127 downloads in 30 days).
Fetch and cite with dates: GitHub Docs "Viewing traffic to a repository" and the REST traffic endpoints; GitHub Acceptable Use Policies (inauthentic activity); the fake-stars study the scout cites (open the paper itself, not coverage); the OSS Insight notice; npm registry download-counts doc; pypistats API docs and the PyPI BigQuery docs; the crates.io API downloads endpoint; Homebrew analytics docs; Product Hunt maker dashboard help.
Re-fetch every dated figure in this brief; report any scout figure that fails to reproduce.
Measure, do not cite:
- stargazer timestamps for ocx and grimoire (gh api -H 'Accept: application/vnd.github.star+json' repos/<o>/<r>/stargazers --paginate) against release dates;
- the traffic API once per repo, recording the window it actually returns;
- 90 days of downloads per fleet package from each registry API;
- record every command.
Out of scope: site analytics, UTM parameters, attribution models (marketing analytics).
Decide:
- which signals a channel skill may report, each with its required caveat;
- whether a traffic-archive workflow is MUST or SHOULD, and its schedule;
- the wording rule for a star call to action;
- the launch-goal field launch-plan carries: one goal, one counter from this list, a baseline window.
