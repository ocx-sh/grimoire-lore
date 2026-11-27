# Commission: channel-github / gh-release-announcement

Topic question: Which repository, release and registry surfaces must every fleet repository set, to which published limits, and which GitHub and registry numbers may a team report, so GitHub works as the distribution channel it already is?

Investigate the GitHub Release as the fleet's only release announcement: .github/release.yml categories versus git-cliff and cargo-dist templates; a summary sentence first; a Migration line under every breaking entry; filtering internal scopes; the Latest flag, pre-releases, immutable releases and stable /releases/latest/download URLs; whether every published tag has a Release; who a release notifies, and whether a Discussions announcement per release is worth it (this dive is the sole owner of GH#18).
Start from GH#12 to GH#18, LP#29, LP#30, LP#31, OP#39. Read product-audit/distribution-posture.md section 1, smells 2 and 8 and pattern 6 (ocx 45 BREAKING with 0 Migration lines; 7 of 10 indexbot bodies are a compare link only; tags without Releases: catalog 16, conventions 16, indexer 29, devcontainer-features 2; grim-gui and grim-mirror publish nothing), and product-audit/config-inventory.md (release-note models contradict across ocx, grimoire and vscode).
Fetch and cite with dates: GitHub Docs "Automatically generated release notes", "About releases", "Immutable releases", "Linking to releases", and the notifications page on watching releases; git-cliff docs (templates, commit_parsers, footers); the cargo-dist announcement configuration; Keep a Changelog 1.1.0; SemVer 2.0.0.
Exemplars: release pages of at least 8 upstream CLIs from exemplar-readmes.
Re-fetch every figure in this brief. Report any audit or scout figure that fails to reproduce.
Measure, do not cite:
- per fleet repo, the last 10 releases: body length, summary line present, breaking section, Migration lines per breaking entry, internal scopes, isLatest correctness (gh release list; gh release view --json body,isLatest,isPrerelease);
- per fleet repo, tags without a Release (gh api repos/<o>/<r>/tags --paginate against gh release list, as in pattern 6), and whether each tag-only repo ships to a registry or is internal, because an internal tag-only repo may be correct;
- record every command.
Out of scope: commit-message style already in the catalog (name the rule IDs this depends on; propose no new commit rule); release-note wording and tone (marketing-copy).
Decide:
- the release-body contract (sections, order, Migration-line requirement);
- whether the lever is the generator template or the commit subjects;
- the tag-without-release check, its exemption for internal repos, and MUST or SHOULD;
- the Latest and pre-release rules;
- whether a Discussions announcement per release is required, optional or not recommended;
- the check a release skill step runs before publishing.
