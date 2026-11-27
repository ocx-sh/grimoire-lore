# Fixture registry: every row plants one defect, checked on 2026-11-27

| id | platform | fact | value | url | source_date | verified | refresh_days | provenance | expect |
|---|---|---|---|---|---|---|---|---|---|
| FA-F01 | example | five columns only | x | https://example.com/a |
| FA-F02 | example | many defects | x | http://example.com/b | 2 years ago | 2 years ago | 45 | official |  |
| FA-F03 | example | bad regex | x | https://example.com/c | none | 2026-11-27 | 90 | platform | (unclosed |
| FA-F04 | example | overdue | x | https://example.com/d | none | 2025-01-01 | 90 | platform | text |
| FA-F04 | example | duplicate id | x | https://example.com/d | none | 2026-11-27 | 90 | platform | text |
| FA-F05 | example | expired deadline | x | https://example.com/e | none | 2026-11-27 | expires:2026-01-01 | platform | text |
| FA-F06 | example | archive url | x | https://web.archive.org/web/2026/https://example.com/f | none | 2026-11-27 | 90 | platform | text |
| FA-F07 | example | host not on the list | x | https://unlisted.example.org/g | none | 2026-11-27 | 90 | platform | text |
