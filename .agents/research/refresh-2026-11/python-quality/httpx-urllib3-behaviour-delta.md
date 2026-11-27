---
title: httpx, httpcore and urllib3 behaviour delta, 2026-08-23 to 2026-11-27
pair: python-quality
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 14
---

# httpx, httpcore and urllib3 behaviour delta

## Verdict

No claim at risk changed. httpx 1.0 did NOT ship a final release in the window. The newest stable httpx is 0.29.0 (2026-11-26); it changes only the minimum Python version and exposes `FunctionAuth`. In parallel, a ground-up rewrite is being published on PyPI as pre-releases `1.0.dev4` (2026-08-19), `1.0.dev5` (2026-08-21) and `1.0.dev6` (2026-08-31). pip does not install these by default, but the rewrite drops nearly every API the pair names, so it is a standing risk for the day 1.0 goes final (see "The 1.0 rewrite"). httpcore has had no release in the window (newest is 1.0.9, 2025-04-24). urllib3 shipped 2.8.0 (2026-09-15) inside the window; it changes none of the stated defaults. Neither library has fixed the URL-credential logging issue.

## Claim by claim

| Claim | Verdict | Evidence |
|---|---|---|
| http.md Scope: implicit default timeout 5 s on connect, read, write and pool | unchanged | 0.29.0 `_config.py:246`: `DEFAULT_TIMEOUT_CONFIG = Timeout(timeout=5.0)`. [Timeouts docs](https://www.python-httpx.org/advanced/timeouts/) still say "raise a `TimeoutException` after 5 seconds of network inactivity". |
| `timeout=None` disables all four axes | unchanged | Same docs page: client-level `timeout=None` is "Disable all timeouts by default". |
| PY-HTTP-02: httpx strips `Authorization` across a cross-origin redirect | unchanged | 0.29.0 `_client.py:554-556`: `headers.pop("Authorization", None)` when the redirect is not same-origin, except a direct http-to-https upgrade. urllib3 side: `Retry.DEFAULT_REMOVE_HEADERS_ON_REDIRECT` is still `Cookie`, `Authorization`, `Proxy-Authorization` in 2.8.0. |
| PY-HTTP-04: `follow_redirects=False` default | unchanged | 0.29.0 `_api.py:53`: `follow_redirects: bool = False`. Default redirect cap `DEFAULT_MAX_REDIRECTS = 20`. |
| PY-HTTP-04: `raise_for_status()` fires only at 400 and above | unchanged | 0.29.0 `_models.py:805`: guard is `if self.is_success: return self`, and 3xx are not success, so a bare 3xx without redirect-following raises `HTTPStatusError` in 0.29.0 as before; the pair's wording (a bare 3xx is handled explicitly) was not reopened by this window. Exceptions docs: `HTTPStatusError` "for a 4xx or 5xx response". Keep the existing pair wording; if it says 3xx never raises, re-check it against `_models.py` (that is a pre-window question, not a window change). |
| Exception taxonomy | unchanged | [Exceptions docs](https://www.python-httpx.org/exceptions/) and 0.29.0 `_exceptions.py`: `HTTPError` has children `RequestError` and `HTTPStatusError`; `RequestError` has `TransportError` (holding `TimeoutException`, `NetworkError`, `ProtocolError`, `ProxyError`, `UnsupportedProtocol`), `DecodingError`, `TooManyRedirects`. `TransportError` is still the single net for the transport group. |
| PY-HTTP-05: incremental inflate, `iter_bytes(chunk)` with `client.stream(...)` | unchanged | 0.29.0 `_models.py:884`: `iter_bytes(self, chunk_size: int | None = None)`, "handle gzip, deflate, brotli, and zstd". urllib3 2.7.0 and 2.6.x fixed decompression-bomb bypasses in its own streaming API, which strengthens, not weakens, the cap rule. |
| `response.links` parses `Link` headers | unchanged | 0.29.0 `_models.py:842`: `def links(self) -> dict[str | None, dict[str, str]]`. |
| PY-OBS-06: httpx logs `https://user:pass@host` at request level | still true, not fixed | 0.29.0 `_client.py:1025` and `:1740`: `logger.info('HTTP Request: %s %s "%s %d %s"', request.method, request.url, ...)` logs the full URL. [encode/httpx#2765](https://github.com/encode/httpx/discussions/2765) is still open and unanswered; PR #3513 was closed without merging; as of 2026-09-24 the maintainer's only reply was "!". Note it is a GitHub Discussion, not an issue, which the pair's citation URL already reflects. |
| PY-OBS-06: `urllib3.connectionpool` logs presigned URLs with auth parameters | still true, not fixed | urllib3 2.8.0 `connectionpool.py:550`: `log.debug('%s://%s:%s "%s %s %s" %s %s', scheme, host, port, method, url, ...)` where `url` is the request path including the query string. The 2.8.0 changelog has no logging or redaction entry. |

## Release facts

- httpx stable: 0.28.1 (2024-12-06), then 0.29.0 (2026-11-26). The [CHANGELOG](https://raw.githubusercontent.com/encode/httpx/master/CHANGELOG.md) 0.29.0 entry reads "Minimum supported Python version is now 3.10" and "Expose `FunctionAuth` from the public API. (#3699)". PyPI upload time 2026-11-26T15:58:35 confirms the year. Nothing about timeouts, redirects, exceptions, logging or `raise_for_status`.
- httpx pre-releases on PyPI: 1.0.dev1 (2025-07-02), dev2 (2025-08-04), dev3 (2025-09-15), dev4 (2026-08-19), dev5 (2026-08-21), dev6 (2026-08-31). Dev4 to dev6 fall around the window start; dev5 and dev6 are inside it. GitHub release-tag pages for them return 404 and the CHANGELOG has no entry, so there are no release notes; the evidence below is the dev6 wheel itself.
- httpcore: [CHANGELOG](https://raw.githubusercontent.com/encode/httpcore/master/CHANGELOG.md) lists 1.0.9 (2025-04-24) newest, plus an Unreleased line "Fix `max_keepalive_connections` not being properly handled. (#1000)". No timeout, redirect, exception or logging change in the window. httpcore is not named in the pair's claims beyond logger names (`getLogger("httpcore")`), which are unchanged.
- urllib3 [CHANGES](https://raw.githubusercontent.com/urllib3/urllib3/main/CHANGES.rst): 2.6.0 (2025-12-05), 2.6.1 (2025-12-08), 2.6.2 (2025-12-11), 2.6.3 (2026-01-07), 2.7.0 (2026-05-07, requires Python 3.10+), 2.8.0 (2026-09-15, the only release in the window). 2.8.0: TLS configuration for HTTPS proxies could be ignored or overridden (GHSA-8988-9cw3-xx77); unbounded chunk-size line buffering (GHSA-vxq7-64xx-v4gw); chunked Deflate infinite loop (GHSA-gh4c-6fx4-qh6g); 303 redirect handling for chunked or file-like bodies; a misleading `FullPoolError` instead of `ValueError` for an invalid timeout on `block=True` pools. None alters a default the pair states. PyPI shows 2.8.0 as current as of 2026-11-27.

## The 1.0 rewrite (dev6) and the names the pair's greps match

The dev6 wheel (`httpx-1.0.dev6`, Requires-Python >=3.10, dependencies only `truststore` and `typing-extensions`, no `httpcore`, no `h11`, no `anyio`) is a new codebase: modules `_client.py`, `_connection.py`, `_pool.py`, `_network.py`, `_parsers.py`, `_response.py` and so on. Exports in `__all__` are `Client`, `Connection`, `ConnectionPool`, `Request`, `Response`, `Headers`, `URL`, `QueryParams`, `StatusCode`, `Server`, `timeout`, `ProtocolError`, `quote`, `unquote`, `urlencode`, `urldecode` and content helpers (`JSON`, `HTML`, `Text`, `Binary`, `Form`, `File`, `Files`, `MultiPart`).

Searching the dev6 source finds zero occurrences of `HTTPError`, `raise_for_status`, `iter_bytes`, `links`, `follow_redirects` or `AsyncClient`. Consequences if this became 1.0 final unchanged (it has not; treat as a watch item, not a rule change):

| Pair-named API | 1.0.dev6 state | Replacement spelling |
|---|---|---|
| `httpx.AsyncClient` | absent (no async client in the export list) | none; sync `httpx.Client` only |
| `httpx.HTTPError`, `RequestError`, `TransportError`, `TimeoutException`, `NetworkError`, `ProxyError`, `HTTPStatusError` | absent; only `ProtocolError` is exported | none found; timeouts are a `with httpx.timeout(seconds):` context manager in `_network.py` |
| `httpx.Timeout`, `timeout=` kwarg, 5 s default | absent as a kwarg; replaced by the `timeout(duration)` context manager, no implicit default seen | `with httpx.timeout(5.0): ...` |
| `follow_redirects=` | absent; `Client` wraps the transport in `RedirectMiddleware` (`self.via`) | none found |
| `response.raise_for_status()` | absent; `StatusCode` exposes `is_2xx_success`, `is_4xx_client_error`, `is_5xx_server_error` | explicit status branch |
| `response.iter_bytes(chunk)`, `response.links`, `client.stream(...)` as in 0.x | `iter_bytes` and `links` absent; `Response` is a context manager whose `ResponseStream.read(size)` reads incrementally | `with client.stream(...) as r: r.read(n)` shape not verified; read the dev6 `_client.py` before relying on it |
| `httpx.Client(timeout=, limits=, transport=)` | constructor is `Client(url, headers, transport)` | n/a |

This table is evidence about a pre-release, not a normative statement about 1.0 final; its shape could change before release, and the PyPI project page and GitHub release pages carry no 1.0 final announcement as of 2026-11-27.

## Normative guidance candidates

1. Pin `httpx>=0.28,<1` (or `<0.30`) in every bot dependency spec. Rationale: pre-releases are not selected by default, but a future 1.0 final would remove `Timeout`, `follow_redirects`, `raise_for_status`, `HTTPError` and `AsyncClient` wholesale, and every verification grep in http.md would then match nothing and pass silently. Verification: `grep -n 'httpx' pyproject.toml` shows an upper bound; a reviewer rejects a bare `httpx` or `httpx>=0.28` with no cap.
2. Add one sentence to the http.md Scope and Contested notes: as of 2026-11-27 the stable line is 0.29.0 (Python 3.10+ only) and the `1.0.devN` pre-releases are an incompatible rewrite; the rules describe the 0.x API. Rationale: an agent that sees "1.0" in a package index must not assume a drop-in upgrade. Verification: reading heuristic, the http.md header names the covered version range.
3. Keep PY-OBS-06 as written; refresh the evidence line to "still unfixed as of 2026-11-27 (httpx 0.29.0 `_client.py:1025`, urllib3 2.8.0 `connectionpool.py:550`)". Rationale: both leaks are live in the newest releases. Verification: existing grep for `getLogger("httpx` / `"httpcore` / `"urllib3` in observability.md line 118.

## AI-agent angle

- An agent told "use httpx 1.0" or resolving `--pre` will install `1.0.dev6` and then write `httpx.Client(timeout=10, follow_redirects=True)` and `raise_for_status()`, which fail with `TypeError` and `AttributeError`. Smallest check: `python -c "import httpx; print(httpx.__version__)"` must print a 0.x version.
- An agent may assume 0.29.0 is a behaviour release. It is not; only Python 3.9 is dropped. Check: `requires-python` of the adopting package must be 3.10 or newer before bumping.

## Contested / evolving

- The 1.0 rewrite is the open question: the maintainer is publishing a different, smaller, sync-oriented design under the same name, and the stable 0.x line keeps shipping. Trend as of 2026-11-27: both lines are alive; no 1.0 final date is stated in any source read.
- Credential redaction in httpx request logging: trend is unresolved, PRs limited to collaborators, maintainer unresponsive.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/encode/httpx/master/CHANGELOG.md | httpx changelog (primary) | newest 2026-11-26 | 0.29.0 entry, no 1.0 |
| https://github.com/encode/httpx/releases | httpx releases (primary) | through 0.29.0 | confirms no 1.0 final |
| https://pypi.org/pypi/httpx/json | PyPI release metadata (primary) | 2026-11-27 | dev4 to dev6 and 0.29.0 upload dates |
| httpx-0.29.0 wheel from PyPI (inspected source) | code (primary) | 2026-11-26 | defaults, exceptions, logging line numbers |
| httpx-1.0.dev6 wheel from PyPI (inspected source) | code (primary) | 2026-08-31 | rewrite API surface |
| https://www.python-httpx.org/advanced/timeouts/ | httpx timeout docs (primary) | current | 5 s default, `timeout=None` |
| https://www.python-httpx.org/exceptions/ | httpx exception docs (primary) | current | hierarchy |
| https://github.com/encode/httpx/discussions/2765 | credential-logging discussion (primary) | last comment 2026-09-24 | still open |
| https://raw.githubusercontent.com/encode/httpcore/master/CHANGELOG.md | httpcore changelog (primary) | newest 2025-04-24 | no window release |
| https://pypi.org/pypi/httpcore/json | PyPI metadata (primary) | 2026-11-27 | confirms 1.0.9 newest |
| https://raw.githubusercontent.com/urllib3/urllib3/main/CHANGES.rst | urllib3 changelog (primary) | 2.8.0 2026-09-15 | security and behaviour lines |
| https://pypi.org/pypi/urllib3/json | PyPI metadata (primary) | 2026-11-27 | 2.8.0 current |
| urllib3-2.8.0 wheel from PyPI (inspected source) | code (primary) | 2026-09-15 | log line, redirect header set |
| https://github.com/encode/httpx/releases/tag/1.0.dev6 (404) | attempted dev release notes | n/a | not retrievable; no notes exist at that URL |

Could not determine: dev4 to dev6 release notes and any announced 1.0 final timeline (no page exists); the urllib3 GitHub security-advisory pages were not opened individually, only the changelog lines that cite them.
