#!/usr/bin/env python3
"""Smallest runnable check for landing_check.py's core distinction: an
external citation link must not count as a reachable action, and an internal
one must. Run: python3 test_landing_check.py"""
import landing_check as lc

CAVEAT_ONLY = """# Widget

Widgets follow the [Widget Protocol][wp], an open standard.

`widget-cli` implements the protocol.

!!! warning "Not implemented yet"
    Nothing works yet.

## Highlights

- stuff
[wp]: https://widget-protocol.example
"""

CAVEAT_WITH_NEXT_STEP = """# Widget

Widgets follow the [Widget Protocol][wp], an open standard.

See [Getting Started][gs] for the current state.

## Highlights
[wp]: https://widget-protocol.example
[gs]: ./getting-started.md
"""


def run():
    import tempfile, os
    for name, text, expect_reachable in [
        ("caveat_only", CAVEAT_ONLY, False),
        ("caveat_with_next_step", CAVEAT_WITH_NEXT_STEP, True),
    ]:
        fd, path = tempfile.mkstemp(suffix=".md")
        os.write(fd, text.encode())
        os.close(fd)
        try:
            result = lc.check(path)
            got = result["DOC-TYPE-11_reachable_action"]
            assert got == expect_reachable, (
                f"{name}: expected reachable={expect_reachable}, got {got}"
            )
        finally:
            os.remove(path)
    print("ok: external-only citation link does not satisfy DOC-TYPE-11; "
          "an internal next-step link does.")


if __name__ == "__main__":
    run()
