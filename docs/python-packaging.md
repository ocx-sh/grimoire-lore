# python-packaging

The Python manifest and distribution surface: the version floor that must
actually run, dependency declaration, lockfiles, what lands in the wheel,
and publishing credentials.

```sh
grim add ghcr.io/ocx-sh/lore/python-packaging
```

Loads on `**/pyproject.toml` and `**/uv.lock` — the two Python filenames a
build system genuinely guarantees, which is what makes a narrow glob safe
here. It does not glob `.github/workflows/`: a workflow filename says
nothing about its language.

## The theme: metadata nothing executes

A `pyproject.toml` is mostly claims, and almost nothing checks them. Every
rule in this file was written because a claim was found false in a real
repository:

- Two test harnesses declared `requires-python = ">=3.10"` and **failed
  collection on 3.10** — 4 and 6 errors respectively. Their real floors
  were 3.12 and 3.11. Nothing had ever run them there, because no CI
  matrix and no `.python-version` pinned the declared floor.
- A package advertised support for a Python version its CI never ran.
- A `py.typed` present in the source tree is not the same as one inside
  the built wheel, and only the wheel decides whether a downstream
  `--strict` consumer sees your package as typed or as `Any`.

## Tools lie when invoked naively

Two rules exist because the obvious invocation gives the wrong answer:

- `deptry .` reported 67 and 34 dependency problems on two clean packages.
  Correctly configured — its default `--exclude` drops `tests`, and
  `[project.optional-dependencies]` is not dev-classified without a flag —
  the real answer was **zero on both**. The configuration is part of the
  rule, not a detail.
- A type checker run without being pointed at the project's virtualenv
  over-reports missing imports by the hundred.

A number produced by a naive invocation is not evidence, in either
direction.

## What it does not do

It does not require PyPI. Most of these rules govern `requires-python`,
lockfiles and wheel contents, which matter whether a package is published
or installed from a git URL. The Trusted Publishing rule applies when and
if you publish.

## Sibling

`python-quality` covers the Python itself and loads on `**/*.py`. Its
`ci-gate.md` depth file is where gate adoption lives — the ordered
sequence for turning a lint on over a tree that has none. The two rules
are bundled as `python-essentials`.
