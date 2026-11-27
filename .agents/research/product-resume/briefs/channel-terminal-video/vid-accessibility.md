# Commission: channel-terminal-video / vid-accessibility

Topic question: Which recording pipeline should a software team use for product demos on each surface (docs site, README, YouTube, LinkedIn, Shorts), and which legibility, accessibility and secret-scrub gates must every recording pass?

Investigate the accessibility gate for every published recording. This dive is the sole owner of caption delivery on every platform, LinkedIn included.
- captions for narrated video (WCAG 1.2.2);
- audio description versus a media alternative for silent screencasts (1.2.3 and 1.2.5), including whether a text asciicast with a transcript satisfies it;
- descriptive transcripts;
- flashing (2.3.1) from fast-scrolling output and auto-zoom;
- pause, stop and hide for auto-playing demos (2.2.2);
- audio control (1.4.2);
- caption delivery per platform: YouTube caption upload, the LinkedIn caption file the scout describes as a single English SRT, burned-in versus file.
Start from VP#11, VP#12, VP#15 to VP#19, VP#31, SF#14, SF#15, SF#16, AE#19, YS#18, YP#30, LC#28 (caption half), LO#22 (video half).
Fetch and cite with dates: the W3C WCAG 2.2 Understanding pages for 1.2.2, 1.2.3, 1.2.5, 2.2.2, 2.3.1 and 1.4.2, using each page's own update date; W3C WAI "Making Audio and Video Media Accessible"; the LinkedIn Videos API caption fields and the LinkedIn video help page; YouTube caption upload help; the asciinema player accessibility notes.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Legal deadlines (for example ADA Title II and the EAA) are marketing law: name them in one line, do not research them.
Measure, do not cite:
- run the fleet's existing cast player pages through axe-core (npx @axe-core/cli <url>);
- detect flashes in one rendered demo with a frame-difference script against the 2.3.1 three-flashes threshold;
- record every command.
Decide:
- the MUST and SHOULD artifacts per recording type: caption file, transcript, pause control, no autoplay with sound;
- the caption-delivery table per platform;
- the checks a skill step runs.
