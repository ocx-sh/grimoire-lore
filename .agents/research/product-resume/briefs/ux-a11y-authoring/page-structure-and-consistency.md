# Commission: ux-a11y-authoring / page-structure-and-consistency

Topic question: Which accessibility properties must an agent build into interface code and page templates by default, and which ARIA and custom widgets must it refuse to write?

Investigate the page-level accessibility of the fleet's rendered pages, docs and app alike, which `rules/docs-quality.md:184` declares governed nowhere, and the consistency duties across the sub-sites served under one domain.
Primary sources to fetch:
- WCAG 2.2 Understanding for 1.3.1, 2.4.1 Bypass Blocks, 2.4.2, 2.4.6, 3.1.1, 3.2.3 Consistent Navigation, 3.2.4 Consistent Identification and 3.2.6 Consistent Help (https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html);
- the WCAG 2.2 definition of "set of web pages" (https://www.w3.org/TR/WCAG22/);
- the APG landmark regions practice (https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/);
- the Starlight override docs and the MkDocs Material template-override docs (locate them on starlight.astro.build and squidfunk.github.io/mkdocs-material).
Measure, do not cite:
- on the built output of ocx.sh, `/docs/`, `/install/`, grimoire.rs and the indexer catalog, record per page template: landmarks, `h1` count, heading-level skips, skip link, `lang`, and the order of navigation, help and footer items;
- diff that order across the three CommandBar, SiteHeader and SiteFooter copies (`product-audit/site-shape.md` section 3 and smell 5), and across sites on different theme specifiers (smell 4);
- render the 8 `planned: true` entries in `nav.json` (smell 10), and record whether each is a link, where it points and what its accessible name says.
Start from M038, M055 (page half) and M260 to M262, and scout rows FC26, PR55, AX5, AX29 and PR30.
The deliverable must decide:
- the landmark, heading, skip-link and `lang` minimum for every page template;
- whether the ocx.sh sub-sites form one "set of web pages", and so what 3.2.3, 3.2.4 and 3.2.6 require of their chrome;
- how a navigation entry for a page that does not exist may render;
- the ownership split as one line each for ux-quality (templates, chrome, rendered page) and docs-quality (Markdown content);
- which checks run on `.astro` and `.html` sources and which only on built pages.
Out of scope: extracting the duplicated chrome and the theme-version currency check (both routed: M261, M263) and widget keyboard contracts (native-widgets-and-keyboard).
