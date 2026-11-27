# Commission: channel-communities / com-own-community-home

Topic question: On which developer communities may a software team announce its tool, and what does each venue's contract require of the post, the account and the maker?

Investigate where a small project should host its own community: Discord, Discourse or GitHub Discussions; search visibility of messages; history loss on free chat plans; the process that moves answered chat questions into docs; SUPPORT routing and community-health files; code-of-conduct enforcement and moderation before launch traffic.
Per-release Discussions announcements belong to gh-release-announcement; this dive decides only whether Discussions is the community home.
Start from CM#21 to CM#27, GH#19, GH#38. Read product-audit/distribution-posture.md (Discord with 5 members whose webhook posts CI failures; Discussions on 1 of 17 repos; Discord linked from no Grimoire repo).
Fetch and cite with dates: Discord Community Guidelines and the server discovery requirements; the Discourse hosting docs; GitHub Docs on Discussions and categories; GitHub Docs "Creating a default community health file" and "Adding support resources to your project"; the Contributor Covenant 2.1 enforcement guidelines; the Slack free-plan history limits.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Exemplars: five OSS CLI projects of similar size; record each one's community home and SUPPORT routing.
Measure, do not cite:
- for all 17 fleet repos: Discussions on or off, SUPPORT file, CODE_OF_CONDUCT with a reporting contact, and issue-template contact links (gh api repos/<o>/<r>/community/profile; gh api repos/<o>/<r> -q .has_discussions);
- record every command.
Decide:
- the default community home for a small fleet;
- the minimum setup before any launch;
- whether the Discord webhook should carry user-facing release news, and what it should stop posting.
