# Commission: channel-github / gh-repo-card

Topic question: Which repository, release and registry surfaces must every fleet repository set, to which published limits, and which GitHub and registry numbers may a team report, so GitHub works as the distribution channel it already is?

Investigate the repository card a visitor and a search engine see: About description, topics, homepage URL, social preview image, and the organisation profile README.
Start from GH#1, GH#2, GH#3, GH#20, GH#21 in marketing-topic-map/channel-github-as-channel.md. Read product-audit/distribution-posture.md section 4 (topics on 3 of 17 clones; no description on rules_ocx, www-setup, devcontainer-features; no org profile README in either org) and product-audit/exemplar-readmes.md (custom social image 0 of 18 fleet versus 17 of 40 upstream; topics median 0 versus 8.5).
Fetch and cite with dates: GitHub Docs "Classifying your repository with topics", "Customizing your repository's social media preview", "Managing your profile README", "Customizing your organization's profile"; the REST reference for GET and PUT /repos/{owner}/{repo}/topics and PATCH /repos/{owner}/{repo}; the GraphQL Repository fields openGraphImageUrl and usesCustomOpenGraphImage.
Re-fetch every limit and dated figure in this brief and in the scout rows. Report any scout or audit figure that fails to reproduce; do not carry it forward.
Measure, do not cite:
- for all 17 fleet repos: description length, topic count, topic validity against the published pattern, homepage set, custom social preview set (gh api repos/<o>/<r>, gh api repos/<o>/<r>/topics, gh api graphql);
- for the 40 upstream repos in exemplar-readmes: download each custom social image, record pixel size and bytes;
- record every command next to its result.
Out of scope: README prose and positioning (marketing); og tags on product sites (marketing); which channels exist (core-facts-and-channel-inventory owns the channel list; this dive only says where the org README places it).
Decide:
- the required repository-card fields and their limits, as a checkable list with source dates;
- whether a missing social preview is MUST or SHOULD, and its pixel spec;
- the exact gh api assertions a skill step runs, with pass conditions;
- the minimum content of an organisation profile README.
