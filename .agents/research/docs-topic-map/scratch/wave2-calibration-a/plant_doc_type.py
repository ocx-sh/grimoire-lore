#!/usr/bin/env python3
"""Plant one deliberate violation per DOC-TYPE check (clean vs. violated
fixture pair) and confirm the check goes red on the violated copy and green
on the clean one. Fixture paths live under fixtures/dev/fakerepo/docs/... so
common.classify_path's path proxy scoping behaves the same as on a real repo.
"""
import os, importlib
import common as C
import check_doc_type as t
importlib.reload(t)

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures", "dev", "fakerepo", "docs")

def write(relpath, content):
    p = os.path.join(BASE, relpath)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(content)
    return p

CASES = []

def case(rule, relpath, clean, violated, run_fn, scope_hint=""):
    CASES.append((rule, relpath, clean, violated, run_fn, scope_hint))

case("DOC-TYPE-01", "reference/t01.md",
     "<!-- doc_type: reference -->\n# T\nDescription.\n",
     "# T\nDescription.\n",
     t.run_type01)

case("DOC-TYPE-03", "how-to/t03.md",
     "# Do the thing\n\nRun `cmd --flag` to do the thing.\n",
     "# Do the thing\n\nWe're going to build the thing. If you want a different setup, run cmd --alt instead.\n",
     t.run_type03)

case("DOC-TYPE-04", "reference/t04.md",
     "# `widget`\n\nReturns the configured widget. Accepts no arguments.\n",
     "# `widget`\n\nLet's see how our widget behaves once you call it.\n",
     t.run_type04)

case("DOC-TYPE-05", "how-to/t05.md",
     "# Configure logging\n\nSet `LOG_LEVEL=debug` to see verbose output.\n",
     "# Configure logging\n\nThis approach is better than the alternative. Set `LOG_LEVEL=debug`.\n",
     t.run_type05)

case("DOC-TYPE-06", "how-to/t06.md",
     "# Install\n\nRun the installer script for your platform.\n",
     "# Install\n\nThis is like the Homebrew Cellar, which keeps every version around.\n",
     t.run_type06)

case("DOC-TYPE-07", "how-to/t07.md",
     "# Configure the widget\n\nOne short line before the steps.\n\n## Steps\n",
     "# Configure the widget\n\n" + ("word " * 130) + "\n\n## Steps\n",
     t.run_type07)

case("DOC-TYPE-08", "troubleshoot/t08.md",
     "# Troubleshooting\n\n## Error: widget not found\n\nThis issue occurs when the widget path is wrong.\n",
     "# Troubleshooting\n\n## Widget missing\n\nCheck your install.\n",
     t.run_type08)

case("DOC-TYPE-09", "troubleshoot/t09.md",
     "# Guide\n\n## Setup\n\nDo setup.\n\n## Error: A\n\nThis issue occurs when A.\n",
     "# Guide\n\n## Error: A\n\nThis issue occurs when A.\n\n## Setup\n\nDo setup.\n",
     t.run_type09)

case("DOC-TYPE-10", "index.md",
     "# Tool\n\nA short tagline for the tool.\n\n## Section\n",
     "# Tool\n\nThis tool solves many problems for many teams across many industries and use cases. It is fast. It is reliable. It is the tool you have been waiting for.\n\n## Section\n",
     t.run_type10)

case("DOC-TYPE-11", "index.md",
     "# Tool\n\n```shell\ncurl -sSL https://example.com/install.sh | sh\n```\n\n## Section\n",
     "# Tool\n\nA capable, flexible tool for many jobs.\n\n## Section\n",
     t.run_type11)

case("DOC-TYPE-13", "index.md",
     "# Tool\n\nFor developers who ship CLIs and need a fast package manager.\n\n## Section\n",
     "# Tool\n\n| Feature | Link |\n|---|---|\n| Speed | [a](b) |\n\n## Section\n",
     t.run_type13)

case("DOC-TYPE-14", "index.md",
     "# Tool\n\nInstall the tool and start shipping.\n",
     "# Tool\n\nLorem ipsum dolor sit amet, placeholder text pending real copy.\n",
     t.run_type14)

case("DOC-TYPE-15", "index.md",
     "# Tool\n\nBuilt for teams who ship daily.\n",
     "# Tool\n\nTrusted by thousands of developers worldwide.\n",
     t.run_type15)

case("DOC-TYPE-16", "index.md",
     "# Tool\n\n1. Install\n2. Run\n\n## Section\n",
     "# Tool\n\n1. One\n2. Two\n3. Three\n4. Four\n5. Five\n\n## Section\n",
     t.run_type16)

case("DOC-TYPE-19", "reference/t19.md",
     "# API\n\n## `add`\n\nAdds a thing.\n\n## `remove`\n\nRemoves a thing.\n",
     "# API\n\n## `add`\n\nAdds a thing.\n\n##### Deep detail\n\nToo deep.\n",
     t.run_type19)

case("DOC-TYPE-20", "reference/t20.md",
     "# API\n\n" + ("This module wraps the underlying client and adds retries, timeouts and structured errors. " * 15) + "\n\n::: mymodule.Client\n",
     "# API\n\n::: mymodule.Client\n",
     t.run_type20)

def main():
    failed = 0
    for rule, relpath, clean, violated, fn, hint in CASES:
        clean_path = write(relpath, clean)
        clean_hits = fn([clean_path])
        os.remove(clean_path)
        violated_path = write(relpath, violated)
        violated_hits = fn([violated_path])
        os.remove(violated_path)
        ok_clean = len(clean_hits) == 0
        ok_violated = len(violated_hits) > 0
        status = "PASS" if (ok_clean and ok_violated) else "FAIL"
        if status == "FAIL":
            failed += 1
        print(f"{status:4} {rule:14} clean_hits={len(clean_hits)} violated_hits={len(violated_hits)}"
              f"{'' if ok_violated else '  <-- did NOT go red on the planted violation'}"
              f"{'' if ok_clean else '  <-- clean fixture ALSO fired'}")
    print(f"\n{len(CASES)-failed}/{len(CASES)} rules go red on a planted violation and stay green on a clean page")

if __name__ == "__main__":
    main()
