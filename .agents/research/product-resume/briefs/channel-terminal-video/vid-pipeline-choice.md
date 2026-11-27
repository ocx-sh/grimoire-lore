# Commission: channel-terminal-video / vid-pipeline-choice

Topic question: Which recording pipeline should a software team use for product demos on each surface (docs site, README, YouTube, LinkedIn, Shorts), and which legibility, accessibility and secret-scrub gates must every recording pass?

Investigate, for each surface (Astro docs site, MkDocs site, GitHub README, YouTube, LinkedIn), which demo form fits: an asciicast v2 or v3 file with the asciinema player; a VHS tape rendered to GIF, MP4 or WebM; an agg-rendered GIF; a screen-recorded MP4; a Remotion composition.
For each form, cover the embedding method, file size, the GitHub attachment limits (the scout claims 10 MB free and 100 MB paid), reproducibility from source, and whether a test can regenerate it.
Start from VP#1, VP#2, VP#20, VP#36. Read the measurements in marketing-topic-map/channel-video-production-software.md (11 v2 casts, 8 v3 casts, cast_recorder.py, 0 VHS tapes) and product-audit/exemplar-readmes.md (demos in 0 of 18 fleet READMEs versus 16 of 40 upstream).
Fetch and cite with dates: the asciinema docs (CLI, player, asciicast v2 and v3 formats, agg); the charmbracelet/vhs README and tape command reference; GitHub Docs "Attaching files"; web.dev "Replace animated GIFs with video".
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Exemplars: the 16 upstream READMEs with demos; record each one's form and size.
Measure, do not cite:
- render one fleet cast (copied to ~/.cache/research-lang/exemplars/product/) through agg to GIF, and a VHS tape of the same session to GIF and MP4; record bytes and wall time;
- run each regeneration twice and diff the outputs for determinism;
- record every command.
Decide:
- the default demo form per surface;
- whether demos must be generated from a committed tape or script;
- the regeneration check a skill step runs.
