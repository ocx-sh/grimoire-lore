# Fixture registry: every row is valid on 2026-11-27

| id | platform | fact | value | url | source_date | verified | refresh_days | provenance | expect |
|---|---|---|---|---|---|---|---|---|---|
| LI-F01 | linkedin | post text limit | 3,000 characters | https://www.linkedin.com/help/linkedin/answer/a528176 | relative:2 months ago@2026-11-27 | 2026-11-27 | 180 | platform | 3,?000 characters |
| OK-F01 | example | post text limit | 3,000 characters | https://example.com/ok/limits | 2026-10-30 | 2026-11-27 | 90 | platform | 3,?000 characters |
| OK-F02 | example | page that refuses scripts | none | https://example.com/blocked | none | 2026-11-20 | expires:2027-01-15 | platform | anything |
