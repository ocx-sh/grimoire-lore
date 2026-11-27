#!/usr/bin/env python3
"""Fixture CLI for cli_matrix.py --self-test. FAKECLI_BAD lists the defects to switch on.

Defects: repl, badversion, notip, installhint, installinline, globalafter, group2, escerr, anim,
badpalette, dryrunwrites, dryrunpasses, forcemisuse.
"""

import difflib
import os
import sys
import time
from pathlib import Path

BAD = set(filter(None, os.environ.get("FAKECLI_BAD", "").split(",")))
NAMES = ["run", "clean", "publish", "config", "completion"]
ROOT = """Fixture CLI

Usage: fakecli [OPTIONS] <COMMAND>

Commands:
  run         Run a job
  clean       Remove cached files
  publish     Publish a version
  config      Read and write settings
  completion  Print a shell completion script
  help        Print this message

Options:
      --format <FORMAT>  Output format
      --color <WHEN>     When to colour output
      --offline          Work without the network
  -h, --help             Print help
  -V, --version          Print version

Examples:
  fakecli run job.toml
  fakecli clean --dry-run
"""
FORCE = (
    "Delete files and skip the trust prompt"
    if "forcemisuse" in BAD
    else "Delete files other projects use"
)
HELP = {
    (): ROOT,
    (
        "run",
    ): "Run a job\n\nUsage: fakecli run [OPTIONS] <FILE> [-- <ARGS>...]\n\nOptions:\n  -h, --help  Print help\n",
    (
        "clean",
    ): f"Remove cached files\n\nUsage: fakecli clean [OPTIONS]\n\nOptions:\n      --force    {FORCE}\n      --dry-run  Print the plan and write nothing\n  -h, --help     Print help\n",
    (
        "publish",
    ): "Publish a version\n\nUsage: fakecli publish [OPTIONS] <VERSION>\n\nOptions:\n      --force    Move an existing tag\n      --dry-run  Print the plan and write nothing\n  -h, --help     Print help\n\nConsequence: moves the tag for everyone who pulls this version.\n",
    (
        "completion",
    ): "Print a shell completion script\n\nUsage: fakecli completion <SHELL>\n\nOptions:\n  -h, --help  Print help\n",
    (
        "config",
    ): "Read and write settings\n\nUsage: fakecli config <COMMAND>\n\nCommands:\n  get  Print a key\n  set  Set a key\n\nOptions:\n  -h, --help  Print help\n",
    (
        "config",
        "get",
    ): "Print a key\n\nUsage: fakecli config get <KEY>\n\nOptions:\n  -h, --help  Print help\n",
    (
        "config",
        "set",
    ): "Set a key\n\nUsage: fakecli config set <KEY> <VALUE>\n\nOptions:\n  -h, --help  Print help\n",
}


def fail(msg, code=64, extra=""):
    sys.stderr.write(f"error: {msg}\n{extra}")
    sys.exit(code)


def typo(word, names):
    hint = f"; install it with fakecli add pkg/{word}" if "installinline" in BAD else ""
    sys.stderr.write(f"error: unknown subcommand '{word}'{hint}\n")
    near = difflib.get_close_matches(word, names, n=3, cutoff=0.6)
    if near and "notip" not in BAD:
        sys.stderr.write(f"\n  tip: a similar subcommand exists: '{near[0]}'\n")
    if "installhint" in BAD:
        sys.stderr.write(f"install it with fakecli add pkg/{word}\n")
    sys.exit(64)


def colour(stream, flags):
    pick = flags.get("--color")
    if pick in ("never", "always"):
        return pick == "always"
    if os.environ.get("NO_COLOR"):
        return False
    if os.environ.get("CLICOLOR_FORCE", "0") not in ("", "0"):
        return True
    if os.environ.get("CLICOLOR") == "0" or os.environ.get("TERM") == "dumb":
        return False
    return stream.isatty()


def run_job(flags, file):
    on = colour(sys.stderr, flags)
    red = "\x1b[38;5;203m" if "badpalette" in BAD else "\x1b[31m"
    lead = "\x1b[1m" if "escerr" in BAD else ""
    sys.stderr.write(
        f"{lead}{red if on else ''}warning{chr(27) + '[0m' if on or lead else ''}: slow disk\n"
    )
    quiet = "--quiet" in flags
    moving = sys.stderr.isatty() and not quiet and not os.environ.get("FAKECLI_NO_ANIM")
    if moving and (os.environ.get("TERM") != "dumb" or "anim" in BAD):
        for i in range(3):
            sys.stderr.write(f"\r{'|/-'[i]} working")
            sys.stderr.flush()
            time.sleep(0.01)
        sys.stderr.write("\r\x1b[2K")
    elif not quiet:
        sys.stderr.write("start run\ndone run\n")
    print(f"ran {file}")


def main(argv):
    flags, words, i = {}, [], 0
    while i < len(argv):
        a = argv[i]
        i += 1
        if a in ("-h", "--help", "-V", "--version", "--offline", "--quiet", "--force", "--dry-run"):
            flags[a] = True
        elif a in ("--format", "--color"):
            flags[a] = argv[i] if i < len(argv) else ""
            i += 1
        elif a.startswith(("--color=", "--format=")):
            flags[a.split("=")[0]] = a.split("=", 1)[1]
        else:
            words.append(a)
        if "globalafter" in BAD and words and a.startswith(("--format", "--offline", "--color")):
            fail(f"unexpected argument '{a}' found")
    if ("-V" in flags or "--version" in flags) and not words:
        if "badversion" in BAD:
            fail("unexpected argument '--version' found")
        print("fakecli 1.0.0")
        return
    path = ()
    if words and words[0] in NAMES:
        path = (words[0],)
        if words[0] == "config" and len(words) > 1 and words[1] in ("get", "set"):
            path = ("config", words[1])
    if "-h" in flags or "--help" in flags:
        print(HELP[path] if path or not words else ROOT, end="")
        return
    if not words or words[0] == "help":
        if "repl" in BAD:
            while sys.stdin.readline():
                pass
        print(ROOT, end="")
        return
    if not path:
        typo(words[0], NAMES)
    if path == ("config",):
        if len(words) > 1:
            typo(words[1], ["get", "set"])
        sys.stderr.write(HELP[path])
        sys.exit(2 if "group2" in BAD else 64)
    if path[0] == "config":
        print(f"{words[2:]}")
    elif path == ("run",):
        run_job(flags, words[1] if len(words) > 1 else "")
    elif path == ("completion",):
        if len(words) < 2 or words[1] not in ("bash", "zsh", "fish"):
            fail("unknown shell")
        print("# fakecli completion script")
    elif path == ("clean",):
        if "--dry-run" in flags:
            if "dryrunwrites" in BAD:
                Path("cache.bak").write_text("x")
            print("would remove cache/a.txt")
            return
        if "--force" not in flags:
            fail(
                "cache holds 2 files",
                73,
                "Try: fakecli clean --dry-run\nOverride: --force deletes the files\n",
            )
        print("removed cache/a.txt")
    elif path == ("publish",):
        refusal = (
            65,
            "Try: fakecli publish v2\nOverride: --force moves the tag for everyone who pulls v1\n",
        )
        if "--dry-run" in flags and "dryrunpasses" in BAD:
            print("would publish v1")
            return
        if "--force" not in flags:
            fail("v1 exists with a different digest", *refusal)
        print("published v1")


main(sys.argv[1:])
