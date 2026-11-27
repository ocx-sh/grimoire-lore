# Commission: channel-github / gh-registry-listings

Topic question: Which repository, release and registry surfaces must every fleet repository set, to which published limits, and which GitHub and registry numbers may a team report, so GitHub works as the distribution channel it already is?

Investigate every package-registry listing that reuses repository metadata or the README: crates.io (description, keywords, categories), PyPI (summary, Description-Content-Type, project URLs), npm (description, keywords, repository, homepage), the VS Code Marketplace manifest (icon, categories, galleryBanner, repository), Homebrew desc guidelines and homebrew-core acceptance thresholds, and the Docker Hub description.
Also cover whether registry README copy goes stale after a README-only edit, and how each registry renders a README (relative links, images, size truncation). rules/docs-quality.md has no registry rule, so the rendering rule lands here.
Start from GH#4 to GH#11, GH#31, GH#32, GH#33, GH#36, GH#37 in marketing-topic-map/channel-github-as-channel.md, and product-audit/distribution-posture.md section 4 (npm, PyPI and VS Code packages; crates.io names grim and grimoire held by other projects).
Fetch and cite with dates: the Cargo reference "The manifest format" and the crates.io category slugs list; the Python Packaging User Guide core metadata specification; npm package.json docs; VS Code "Extension Manifest" and "Publishing Extensions"; Homebrew "Formula Cookbook" and "Acceptable Formulae"; GitHub Docs "About READMEs".
Exemplars: five well-listed upstream packages per registry.
Re-fetch every limit in this brief and the scout rows; report any scout figure that fails to reproduce.
Measure, do not cite:
- for each fleet package manifest (read only): filled versus empty discovery fields, lengths against limits (cargo metadata --no-deps --format-version 1; jq over package.json; tomllib over pyproject.toml);
- render one fleet README on each registry's live page and list broken links and images;
- record every command.
Out of scope: README copy and keyword strategy for SEO (marketing).
Decide:
- the per-registry required-field table with limits and source dates;
- whether READMEs reused by a registry must use absolute URLs, as MUST or SHOULD;
- the manifest lint a skill step runs.
