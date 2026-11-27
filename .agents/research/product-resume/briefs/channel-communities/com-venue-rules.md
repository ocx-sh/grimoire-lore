# Commission: channel-communities / com-venue-rules

Topic question: On which developer communities may a software team announce its tool, and what does each venue's contract require of the post, the account and the maker?

Investigate per-venue rules for announcing a tool:
- Reddit, sitewide plus r/programming, r/rust, r/selfhosted, r/opensource and r/commandline;
- Lobsters (the scout claims a self-promotion share under 25%, a new-account gate of about 70 days, and a vibecoding tag);
- Stack Overflow (linking your own tool with disclosure, official-support tags);
- dev.to and Hashnode AI-content approval and cross-post rules.
For each venue, cover the account prerequisites a new account cannot meet on launch day. The generated-text bans (Stack Overflow and others) are owned by core-agent-action-boundary; cite them.
Start from CM#10 to CM#17, CM#19, CM#20.
Fetch and cite with dates: Reddit Rules and the Reddit Help self-promotion page; each subreddit's rules through an authorised route (the scout got HTTP 403; try https://www.reddit.com/r/<sub>/about/rules.json with a generic user agent once per subreddit, and record any block rather than bypassing it); https://lobste.rs/about; the Stack Overflow help pages on promotion; the dev.to content policy; Hashnode community guidelines.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite:
- per subreddit: the fetch status code, rule count, and the rules that name self-promotion, verbatim;
- record every command.
Out of scope: canonical URL handling for syndication (marketing SEO).
Decide:
- the venue table: allowed post type, account prerequisite, disclosure, AI rule (cited), source date;
- which venues the skill recommends for a CLI tool;
- which it marks human-only.
