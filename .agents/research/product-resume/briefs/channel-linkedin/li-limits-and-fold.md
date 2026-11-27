# Commission: channel-linkedin / li-limits-and-fold

Topic question: What must a person-led LinkedIn post about a developer tool contain, in which format and with which link placement and disclosure, so that LinkedIn distributes it and it breaks none of LinkedIn's rules?

Investigate the hard limits per LinkedIn post format (text, link post and its preview card, image, document, poll, video file) and the "see more" fold on desktop and mobile; plus image alt text and document-PDF accessibility. Video caption delivery belongs to vid-accessibility; format choice by goal belongs to li-format-and-reach-evidence.
Start from LO#1, LO#2, LO#21, LO#22, LO#23, LO#30, LO#31, LC#6, LC#7, LC#27, LC#28, and the limits half only of LO#3 and LC#5.
Fetch and cite with dates: LinkedIn Help a528176, a518909, a527229, a564109, a527270, a7174587, a519856, a521928 (verify each ID resolves to the claimed topic); Post Inspector documentation; the Images API (alt text field) and Documents API references.
Standards: WCAG 2.2 Understanding pages for SC 1.1.1 and 1.4.5; the PDF Association's PDF/UA (ISO 14289) overview.
Re-fetch every limit in this brief and the scout rows; flag any scout figure that fails to reproduce.
Terms first. Before any measurement, read the User Agreement section 8.2 and Help a1341387; quote the clauses on automated access and scraping with their effective date. Reading LinkedIn Help and Legal pages is in scope. Automated rendering or fetching of member content (posts, embeds, profiles) is out of scope unless those texts explicitly permit it; record the verdict.
The fold, without scraping:
- collect every dated fold measurement third parties have published (at least three independent ones, each with URL, date and method) and any LinkedIn statement;
- derive a conservative fold budget as their minimum, labelled "derived, third-party";
- write a 10-post manual measurement protocol a human can run in a logged-in browser at 1280 px and 360 px, marked pending human run.
Measure, do not cite: build 20 fixture drafts, run a length, fold-budget and attachment-dimension check (python3 -I) over them, and report code-unit versus grapheme differences on emoji-heavy hooks; record every command.
Decide:
- the dated limits table for the skill's facts file;
- the fold budget, its evidence grade, and what lines 1 to 3 must carry;
- the MUST checks per attachment type (alt text present, document title set, PDF tagged or the text repeated in the post).
