# Commission: channel-agent-boundary / core-agent-action-boundary

Topic question: On every public channel, what may an agent do by itself, which platform-native labels must it set and where, and how does a channel skill keep its platform facts and the organisation's channel list from going stale?

Investigate one matrix: one row per platform, one column per action. Actions: draft, schedule, post, reply, submit a listing, upload through an API, pay.
Platforms: LinkedIn, YouTube, X, Bluesky, Mastodon (instance terms), Threads, Hacker News, Reddit, Lobsters, Stack Overflow, dev.to, Product Hunt, BetaList, Discord.
Each cell: allowed, forbidden or conditional, with the clause quoted verbatim and its date. Add credential custody: where publishing tokens may live.
This dive is the sole owner of the venue bans on generated or AI-edited text (HN, Stack Overflow, and any other venue found). com-hn-contract and com-venue-rules cite this dive.
Start from LO#13, LO#14, LC#16, LC#17, LC#18, MB#1, MB#2, MB#3, MB#27, MB#38, YS#16, YS#17, LP#17, LP#37, LP#40, CM#3, CM#15, CM#18.
Fetch and cite with dates: LinkedIn User Agreement section 8.2 and Help a1341387; YouTube API Services Developer Policies and Terms of Service (automated access clause); X Developer Policy and automation rules; Bluesky community guidelines and the atproto automation docs; the server rules of the two largest Mastodon instances; the Threads API terms; HN guidelines and FAQ; Reddit Rules and the Responsible Builder Policy; Stack Overflow "gen-ai-policy"; the Product Hunt terms and Discord developer terms.
Re-fetch every clause; the scout rows are leads, not quotations. Report any scout claim that fails to reproduce.
Measure, do not cite: record each page's fetch date and its own last-modified or "Last updated" statement, verbatim; run gitleaks detect --no-git over a copy of the 17 fleet clones under ~/.cache/research-lang/exemplars/product/ for publishing-token patterns (LinkedIn, X, YouTube OAuth, Discord webhook) and report counts, not values; record every command.
Out of scope: legal disclosure standards (marketing).
Decide:
- the exact MUST list for the channel-publishing rule (expected shape: the agent drafts and a human posts; name each platform exception);
- the list of venues where the agent produces a fact sheet only, never paste-ready text;
- the secret-scan check that a repository holds no publishing credentials, including Discord webhook URLs.
