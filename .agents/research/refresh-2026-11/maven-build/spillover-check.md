---
title: maven-build spillover check from java-quality
target: maven-build
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml
  - https://search.maven.org/solrsearch/select?q=g:org.apache.maven.plugins+AND+a:maven-surefire-plugin&core=gav&rows=3&wt=json
  - https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json
  - https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml
  - https://github.com/uber/NullAway/releases
  - https://repo.maven.apache.org/maven2/com/uber/nullaway/nullaway/maven-metadata.xml
---

Evidence in the origin pair: .agents/research/refresh-2026-11/java-quality/junit-surefire-gradle-test-coverage.md (lines 19 and 66) and .agents/research/refresh-2026-11/java-quality/errorprone-nullaway-jspecify.md.

## Item 1: MVN-BUILD-05 URL path and newest Surefire GA

Item: the verification URL uses `org/apache/maven/surefire/maven-surefire-plugin`; the real path is `org/apache/maven/plugins`, newest GA is 3.6.1.

Verdict: target already correct.

Source: Central maven-metadata.xml, https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml, primary. States `latest` and `release` 3.6.1, `lastUpdated` 20261026024848 (2026-10-26).

Affected text (skills/maven-build-reference/lifecycle-and-plugins.md, MVN-BUILD-05): "`curl -s https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml` before writing the version". The same file's version table says "`3.6.1` GA (`lastUpdated 20261026024848`)". rules/maven-build.md row 8 (MVN-BUILD-05) names no URL or version.

Smallest change: none.

## Item 2: MVN-PUB-02 verification uses the lagging Solr index

Item: the verification queries search.maven.org/solrsearch, which lagged Central by two Surefire GA releases; prefer maven-metadata.xml.

Verdict: confirmed by primary source (live query on 2026-11-27, not a document). The Surefire Solr query returned newest `3.6.0-M1` (71 docs) while Central's maven-metadata.xml lists 3.6.0 and 3.6.1. The same Solr index for `maven-core` (gav core, 5 rows) returned only 3.9.16 down to 3.9.12, with no 3.10.x, while maven-metadata.xml (lastUpdated 20261122115857) lists 3.10.0 to 3.10.2 and `4.0.0-rc-7`. Solr lag therefore also affects this rule's own subject.

Source: https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml (primary, date 2026-11-22 lastUpdated) against https://search.maven.org/solrsearch (queried 2026-11-27).

Affected text (skills/maven-build-reference/lifecycle-and-plugins.md is not affected; skills/maven-build-reference/publishing.md, MVN-PUB-02 verification column): "`curl -s \"https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json\"`. A version matching `4.0.0` with no suffix is the only signal that retires this rule." Same file, why column: "Central's index gives `maven-core` 3.9.16 and 3.10.2 as the stable lines". Also skills/maven-build-reference/dependencies.md line 129 carries the same Solr curl.

Smallest change: in publishing.md replace the curl with `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml | grep '<version>4.0.0'` (a plain `4.0.0` entry retires the rule), and reword "Central's index gives" to "Central's maven-metadata.xml lists". The first sentence of the verification column should add that the Solr index lags Central. dependencies.md line 129 should get the same swap, or a note that Solr can lag, if the owner of that file's pair agrees. The shape the rule already uses in MVN-BUILD-08 is the model.

## Item 3: NullAway 0.14.2 treats Maven plugin parameters as externally initialized

Item: NullAway 0.14.2 release note.

Verdict: confirmed by primary source. The GitHub release page for 0.14.2 has one entry, "Treat Maven plugin parameters as externally initialized" (#1848). The page shows "25 Sep"; Central serves nullaway-0.14.2.pom with Last-Modified 2026-09-25. Other 0.14.x releases do not mention it.

Source: https://github.com/uber/NullAway/releases (primary, release notes).

Affected text: the target says nothing on the point. A grep of rules/maven-build.md and every file under skills/maven-build-reference/ finds no "NullAway" and no mention of `@Parameter` or Mojo field nullness. The only Mojo mention (MVN-BUILD-19, "Apache's `ToolchainMojo` has three parameters") is about toolchains.

Smallest change: none required for truth. Optional, outside the delta scope: one sentence in lifecycle-and-plugins.md near the annotation-processor rows noting that NullAway 0.14.2+ treats `@Parameter` fields in Maven plugins as externally initialized.
