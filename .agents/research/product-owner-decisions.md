# product program — owner decisions and deferred follow-ups (after wave 1, 2026-11-27)

Collected from the 23 wave-1 consolidations. Nothing here blocks authoring; each item names the consolidation that raised it.

## Follow-ups that need a human, a credential or an eval harness

These were raised as research questions but an unattended agent cannot answer them: they need a screen-reader tester, a logged-in browser, an API key, a live channel, a model-output eval, or a date that has not come.


### ux-verification-claims

- Is the EN 301 549 V4.1.1 citation in the Official Journal under Directive 2019/882 published yet (re-check 2026-12-31)?

### ux-a11y-authoring

- What is the computed value of --vscode-focusBorder in a rendered webview? It is needed to promote the focus-colour clause of UX-A11Y-35 to MUST.

### ux-interface-text

- With no rule loaded, do coding agents actually write emoji, a trailing '!', 'Oops', 'please' or 'Learn more' when they author a toast, an error or a link? A scored agent-output sample would decide whether UX-TEXT-16 and -17 change behaviour.

### ux-cli-interaction

- What do NVDA, JAWS and Orca speak for the ocx and grim bars and for grim tui? This needs a human tester and is carried over unchanged.

### ux-consequential-actions

- In a VS Code native modal, which item is focused first and does Enter or Esc trigger the destructive item when no item has isCloseAffordance (Extension Development Host run on forceRetry, vote, switchReplacement)? A result would let UX-ACT-07's VS Code clause become MUST.
- How often do agents add --force or --yes after a refusal without asking, counted in real transcripts? This would justify or drop UX-ACT-21's MUST and the failure-mode ranking.

### ux-ai-features

- How do NVDA, JAWS, VoiceOver and TalkBack treat per-sentence appends to a role=log region at streaming rate, and can UX-AI-19 return to MUST?

### ux-agent-facing-interfaces

- Does a class-and-verdict prefix on MCP error text change a model's next action compared with the same text without it (paired probe on the R4 conditions)?
- How often do catalog skills and recorded transcripts mix streams, parse message text or retry without a cap, and what is the false-positive rate of the UX-AGENT-25 locator greps?

### marketing-first-screen-copy

- Does a human rater agree with the two LLM raters on the category rubric behind MKT-PAGE-03's 22-of-25 figure?

### marketing-discoverability

- Once ocx.sh TLS works, does a second generated set (the 170 /catalog/ pages) confirm or move MKT-SEO-24's 0.5 threshold?

### marketing-measurement

- What does Safari 26 actually do to utm_* parameters in default regular browsing, measured with a real browser and a HAR? No primary page states it.

### channel-agent-boundary

- Can the X gates (Automated label, bio, human-account link) be read with the owner's own API key, so they move from human attestation to a command?
- Does videos.list return containsSyntheticMedia and paidProductPlacementDetails for public videos under a plain API key, and what do the two fleet Shorts carry?
- Which registry fact classes actually fail expect after two refresh cycles, and should the 30/90/180 intervals move?

### channel-linkedin

- Manual case 11: does a LinkedIn image post with a typed URL show the image, a clickable URL and no preview card? A human in a logged-in browser must answer it, and it gates CH-LI-09 visual: image.
- Manual fold protocol at 1280 px, at 360 px and in the mobile app: is the 140-grapheme lines-1-to-3 budget right, and which unit does the 3,000 limit count?

### channel-youtube

- Do the downstream artifacts that cite CH-YT-06, 12, 16, 17, 19, 20, 21 and 24 still quote text these rules now say? The Reviser contract requires this re-check after a revision, and it is outside this task's write scope.
- On a live channel, does the Feature eligibility screen list 'Add chapters' and 'Related Video on a Short', and at which tier? A read of Studio settings settles CH-YT-12 and CH-YT-20.
- Does a first chapter stamp written 0:00 render as chapters? One private test upload settles whether CH-YT-06's SHOULD house form can be relaxed or promoted.
- Do the milestone (n=18) and live/talk (n=24) cells reach n=25 with a wider window of company videos through the Data API? The answer decides whether CH-YT-17 and CH-YT-19 can return to SHOULD.

### channel-terminal-video

- Does a human legibility test on a 360 px phone and a 720 px docs column confirm the OCR-derived 6 px floor?

### channel-communities

- Is there an authenticated way to look up the Hashnode handles (for example the gql.hashnode.com API with a token), so presence can be measured rather than marked unknown?

### channel-microblog

- Does the Threads publishing API accept a 500-unit post under the emoji-byte model and reject 501, and how does it count CJK and combining marks? (This would restore CH-MB-06 to MUST.)

## Owner decisions


### ux-verification-claims

- Ship checks/ui-matrix.mjs (with the ancestor pass) and wcag22-ids.txt in the UX review skill, and land the docs-quality.md:184-186 cross-reference, before this ruleset is published. These are preconditions.
- Whether the 5 open-state components that UX-VERIFY-05 flagged in ocx-sh/website (EcosystemMenu, SiteHeader, Breadcrumbs, starlight Header, PageFrame) need open-state scans, or are scanned under other spec names.

### ux-a11y-authoring

- Accept the house-policy MUST for hex-free colours in the VS Code webview (UX-A11Y-35, Verdict 4c), or demote it to SHOULD to keep the strict WCAG-level severity convention.
- Approve adding /* focus-ok: */ markers at ocx-sh theme overlay.css:96 and grimoire-rs/vscode sidebar.css:355 (both shared or fleet code), so that focus_outline.py exits 0.
- When the rule is published, approve shipping the six Appendix scripts in the reference skill's checks/ directory. They add a puppeteer-core and Chromium dependency for adopters.

### ux-interface-states

- Whether the extension records why the sidebar is a webview view rather than a native tree view (UX-STATE-33). Today neither extension.ts:481 nor CLAUDE.md gives a reason.
- Whether the registry form gets a 'There is a problem' summary with links to its fields, to close the partial status of UX-STATE-24.
- Whether the 1000 ms show-delay is adopted as the house convention. It is guidance, not a measurement (UX-STATE-10).

### ux-interface-text

- Which cases, if any, may use 'please' or an apology in product strings (UX-TEXT-17 SHOULD part, Verdict 6)?
- Is translation on the roadmap? It moves both UX-TEXT-24 and UX-TEXT-26 to MUST.
- Does grimoire.path.executable (package.json:310, 3 sentences, no link) count as long under the UX-TEXT-22 calibration, or is it accepted as written?

### ux-cli-interaction

- Headline command for ocx (exec, package exec or init) and for grim (add or init).
- Whether to honour FORCE_COLOR at all, and whether FORCE_COLOR=0 should force nothing (rule's choice) or follow force-color.org and force colour.
- Rows of decorative-colour.allow, starting with ocx about 38;5;203.
- Name and default of the animation opt-out (UX-CLI-29).
- Whether the UX-CLI-19 first-run gate may block a release (it only reports by default).
- Deprecations: update/upgrade, the -g meaning that changes below the root (10 paths), and ocx package exit 2 to 64.
- Whether grim tui gets a linear mode.

### ux-consequential-actions

- Repeat-run exit codes for existing commands (ocx init/remove, grim init, ocx direnv init, grim config registry add/rm): keep the pinned nonzero codes or move to exit 0 with 'unchanged'/'already absent' (UX-ACT-16 is SHOULD for them until decided).
- Adopt the three house conventions introduced for checkability: the 'Consequence:' help line (UX-ACT-02), the 'Try:'/'Override:' refusal lines (UX-ACT-12), and docs/agent-trifecta.csv (UX-ACT-25). Each changes fleet help or error text and has no external source.
- If the VS Code Enter-on-open check shows Enter runs the destructive item: reorder items, add an isCloseAffordance cancel item, or accept it.
- Carried over: the tiers for ocx clean --force, grim release --force and vote; removing the switchReplacement T0 modal and the grimInfo modal; the @ocx-sh/theme ConfirmDialog API change; the grim_render write root; whether grim release --force needs --confirm; and --allow-writes in shared sessions.

### ux-ai-features

- Publishing gate: ship ux-ai-reference only in the same change that adds a DOC-PLAIN-08 exemption for data-ai-disclosure components and <!-- ai-disclosure --> blocks in docs-quality; this revision could not write docs-quality.
- Should grim_fetch and other grim MCP tools wrap publisher text in a third-party data boundary (UX-AI-13, now SHOULD)?
- Ship ux-ai-reference inside ux-essentials or as an opt-in skill, given that 13 of 21 active rules are dormant for the fleet?
- Does the fleet intend to ship a human-facing LLM feature (docs Ask AI, VS Code chat participant)?

### ux-agent-facing-interfaces

- Owner decision 3: reword the Rust (cli-contract.md:37) and Go (cli-contract.md:27) exit-69 rows so connection refused or reset is 75, or keep them and reverse UX-AGENT-10's clause; UX-AGENT-10 stays SHOULD until then
- Owner decision 4: revise Rust CLI-04 to make `retryable` required and add `schema_version` to the error envelope; until then UX-AGENT-09(c) and UX-AGENT-04's error-document clause are SHOULD
- Owner decision 1: keep the two envelope spellings (grim CLI-04, ocx SW-CLI-29) and add the missing fields, or converge on one
- Owner decision 2: give `conflict` its own exit code 83 or keep 65 with a distinct slug
- Owner decision 5: add `--json` as an alias in grim
- Owner decision 6: whether a release-time tool-selection eval is wanted, and at what budget

### marketing-claims-evidence

- Give agents their own GitHub identity (a bot account or a GitHub App), or accept that every MKT-CLAIM-16 sign-off class stays blocked. The shared owner login cannot approve its own pull requests.
- Whether to tune the MKT-CLAIM-05 refresh_by defaults through a [defaults] table in claims.toml.
- Add LICENSE files to grimoire-lore, arcana, index and e2e-index.
- Keep, define or retire 'The Simple Package Manager', and replace or record 'fast' and 'instantly'.
- Confirm, change or record the SECURITY.md '48 hours / 7 days' promise.
- Lint roll-out mode (block from the first commit, or a ratchet) and where the lint lives.
- security.txt on ocx.sh and grimoire.rs, and who owns its Expires renewal.
- Whether either landing page carries a proof section.
- The privacy.html:174 'non-commercial open-source' wording.

### marketing-positioning-record

- Addresses to put in the CI variable POSITIONING_OWNERS
- Any forbidden_allow exemption (e.g. grimoire catalog/README.md:3, docs introduction.md:3 and concepts.md:3)
- Whether each repo is a family component (sets parent)
- ocx category noun and direction (consumer vs publisher)
- Grimoire hero: lockfile h1 vs category in h1
- Grimoire family object noun (AI-agent config proposed)
- Whether grimoire-lore gets its own record
- Accept MKT-CLAIM field requests competitor_version and competitor_strength and the MKT-CLAIM-05 comparison default
- Docs-home lead verbatim sentence vs nouns, to align with MKT-PAGE

### marketing-first-screen-copy

- Approve the doc_surface enum (pitch, home) and CR-1..CR-4 in docs-quality. Until then, parts of MKT-PAGE-01, -02 and -11 stay blocked.
- Decide whether to raise MKT-PAGE-06 (maturity line below 1.0) to MUST as fleet policy, against the upstream norm of silence and without a primary source.
- Choose the category noun per product. ocx: 'package manager', 'binary distribution platform' or the job wording. Grimoire: 'package manager' or 'lockfile'.
- Decide whether a repository with a public README but no release and no package (conventions, grim-gui, grim-mirror) is a pitch surface.

### marketing-discoverability

- Catalog author: keep the names of the two allow-list files the revised gates introduce (structured-data-reviews.txt, back-button-allow.txt), and ship live17.sh and shingle.py under skills/<set>-reference/checks/.
- Docs-quality owner: align the DOC-AGENT-04 wording ('Publish llms.txt', with no consumer condition) with MKT-SEO-19's consumer trigger, or leave both as they are.

### marketing-release-announcements

- Should ocx (AGENTS.md:33) move to the footer model, and does the 'no warning schedule' line at AGENTS.md:21 also exclude Migration footers in release notes?
- Set the compatibility-policy windows (MKT-REL-08), and decide whether grimoire's 'frozen contracts' README line or its removal practice changes.
- Should the release task use annotated tags and a SUMMARY input (MKT-REL-14)?

### marketing-measurement

- Accept 'server-side or nothing' as the fleet stance, or name a tool, jurisdictions and consent route, and create the decision record (.agents/decisions/measurement.md) that MKT-MEAS-01, -02 and -03 now check against.
- Which external script hosts, if any, go on the MKT-MEAS-03 allowlist. The default is empty.
- Whether the Cloudflare-injected email-decode script on grimoire.rs (V4) is accepted and named, or turned off at the CDN.
- Whether HDYHAU is ever required on a form (MKT-MEAS-12).

### marketing-voice-ai-authorship

- Adopt .agents/voice.toml for ocx and Grimoire and choose the pitch register
- Approve or decline removing existing em dashes at grimoire index.astro:38,46,79 and grimoire README
- Scope the three fleet docs-style 'no marketing open' lines (fleet config edit)
- Name an editorial-responsibility contact or keep the no-Impressum stance and never publish agent-drafted in-scope text
- For solo-owner repos, accept that MKT-VOICE-08 and -15 have no mechanical check, or add a second reviewer account
- DOC-PLAIN-22 trailer ban vs harness commit-attribution lines: which wins per change type (docs-quality's rule)

### channel-github

- Create and test the traffic-archive secret for the flagships (CH-GH-25 owner step), and choose where the archive lives
- Whether skills adopt the literal APPROVAL-GATE marker that the CH-GH-04 lint keys on
- On 2026-12-05, confirm retirement of CH-GH-28 into failure mode 4

### channel-agent-boundary

- Who keeps facts/hosts.txt, which decides which hosts may carry platform or authority provenance?
- Who re-reads the MANUAL LinkedIn registry rows on their due dates? And does an agent fetch that a human starts in an interactive session count as a manual re-read under LinkedIn UA 8.2?
- Should the Discord CI notifier become an automation: bot row (with runs_from and attested gates), or move to a separate developer channel?
- What are the AI-use and paid-placement answers for the two @ocx-sh Shorts, and is Dino Edition realistic under YT-F03 to YT-F06?
- Is the 20-word value cap on fact sheets acceptable as a starting value?
- What spend caps apply before any metered API (X per-post pricing) is used?

### channel-linkedin

- Should the AI-disclosure line be on by default in the author's name (CH-LI-16 MUST as a program default), given that LinkedIn only recommends it?
- Create a LinkedIn company Page, given that no evidence compares Page and person on clicks?
- Add an owned redirect or cookieless analytics so clicks can be counted, or keep impressions and GitHub referrers as the only metrics?
- May colleagues be asked to share launches at all?

### channel-youtube

- Set the Shorts pilot pass bar, the pass_median_engaged_views and pass_actions fields, before any pilot starts. The revised file no longer proposes a number.
- Accept the CONSIDER demotion of CH-YT-19. The skeptic did not raise it; it was applied because the n=24 cell fails the file's own CH-YT-28 bar.
- Decide whether the private ocx-sh/marketing repository holds an upload manifest or a pilot record. Its contents decide the CH-YT-01 and CH-YT-21 fleet rows, and they cannot be observed from public clones.

### channel-terminal-video

- Does DOC-EX-13 also cover a CI drift check that regenerates into a scratch directory? If yes, CH-VID-24 is retired for that repository.
- Should CH-VID-12 go back to MUST for player embeds, where the cast theme is page text under SC 1.4.3?
- Should the fleet's 180-column grimoire casts be re-recorded, and at which measured column width?
- Should the 8 px target in CH-VID-08 become MUST?
- Each upload or publication (asciinema upload, vhs publish, YouTube, LinkedIn, Shorts), per upload.
- Where do the terminal-demo flatten, scan, contrast and transcript scripts live: a terminal-demo-reference skill, or the grimoire recorder exported as a tool?
- Where does the source of the @ocx-sh Shorts live, and should they be re-rendered under CH-VID-10?
- Should both site families use one asciinema-player version, and who owns its update?

### channel-communities

- Who writes makers.txt, and which names it lists. CH-COM-05(b), 14 and 15 now depend on it.
- Which personal HN, Lobsters and dev.to accounts the makers will use. These were not looked up, to avoid sending personal names to outside services.

### channel-launch

- Set hn_duty_hours, the Show HN comment-duty length, for the grim 1.0 launch (CH-LAUNCH-06).
- Choose the canonical-record surface: a new owned news page, or the GitHub Release page with a summary line (CH-LAUNCH-09).
- Decide the grimoire.rs install-page order: grim's own installer first, or ocx first by design (CH-LAUNCH-03).
- Decide whether PH is in scope at all, given that one PH day likely needs both people (CH-LAUNCH-06).
- Decide whether grim-gui launches only after its first release (CH-LAUNCH-01).
- Decide the launch-week item threshold N, if not 5 (CH-LAUNCH-10).
- Give a verdict on each unverified venue (selfh.st, AlternativeTo, Console.dev, Terminal Trove) on plan day (CH-LAUNCH-04).

### channel-microblog

- Whether the X account will have Premium, and if so whether posts may exceed 280 (CH-MB-02).
- Whether to keep the project defaults: a 3-post thread cap, the two-items thread test (CH-MB-09), and the 0.8 similarity threshold (CH-MB-16).
- Whether ocx and Grimoire share accounts (CH-MB-16, CH-MB-19).
