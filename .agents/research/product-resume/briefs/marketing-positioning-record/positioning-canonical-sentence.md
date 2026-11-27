# Commission: marketing-positioning-record / positioning-canonical-sentence

Topic question: What single positioning record must exist before copy is written, and how does an agent detect when a surface has drifted from it?

Question: Must one canonical sentence, one category noun, one object noun and one source for every enumerated list be reused verbatim across a product's surfaces, and what check catches drift?
This dive owns the drift check for every surface below. It does not own the other GitHub About fields (topics, homepage, social preview), which belong to channels.
Surfaces: README line 1 and tagline; GitHub About description; Cargo.toml, package.json or pyproject.toml description; the home page <title>, meta description and og:description; the docs-home lead sentence.
Starts from: messaging-inventory.md §1-5 and smells 1, 4, 8 (61 distinct one-liners; ocx 11; Grimoire reuses its canonical sentence in 5 places; Grimoire's object is "AI-agent config", "AI artifacts" and "AI-config packages", with 4, 5 or 8 types listed; lore.ocx.sh describes itself in 35 characters that name no contents); exemplar-landing-pages.md smell 1 and pattern 7; brand-voice-assets.md #30.
Investigate:
1. Message-house and messaging-hierarchy practice from primary practitioner sources (Fletch, Dunford, Wynter). Label them as practitioner sources.
2. How the fleet already single-sources copy: grimoire docs/src/data/landing.ts with landing_check.py, and ocx landing-content.ts with landing.test.ts (site-shape.md pattern 2).
3. How an enumerated list can be generated from one source: grimoire-rs/indexer/src/config.ts:187-190 and the vscode package.json:4 type list.
Corpus: ~/.cache/research-lang/exemplars/product/ was absent on 2026-11-27. Rebuild the landing corpus from product-audit/exemplar-landing-pages.md before measuring.
Measure, not cite:
- Exemplar agreement: for the 25 landing exemplars, does one category noun appear on README line 1, GitHub About, meta description and the hero <h1>? Script it; use `gh repo view --json description` for About.
- The same count for the 17 fleet repos, re-running the messaging-inventory.md commands.
- Per Grimoire surface: the object noun used and the number of listed types. Record the commands.
The deliverable must decide: which surfaces must match exactly and which may paraphrase while keeping the category noun; the source-of-truth file (the positioning brief or a data file it names); the rule for enumerated lists (generated from one source, or cut to a count plus a link); the minimum content of a home meta description (category noun plus what it acts on); and a drift check a rule or CI step can run, with its command.
