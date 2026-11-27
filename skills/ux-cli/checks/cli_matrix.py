#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Behavioural matrix for a command-line tool. It runs the binary and never reads its source.

Every run uses an empty HOME, an empty working directory, closed stdin, NO_COLOR=1
and PAGER=cat unless a check sets otherwise. Checks (select with --only NAME,...):

  bare        UX-CLI-01, 28    bare invocation ends, prints usage, equals -h
  help        UX-CLI-02        -h and --help on every command path, no config needed
  groups      UX-CLI-03        a group with no subcommand exits with the usage code
  shape       UX-CLI-04 to 07  headline position, examples block, 60 lines, synonyms
  version     UX-CLI-08        --version is one line on stdout, exit 0, nothing on stderr
  typo        UX-CLI-09 to 11  suggestion, no install hint from a typo, nothing changes
  global      UX-CLI-12        global flags before and after the subcommand, short flags
  completion  UX-CLI-13        the generator prints only the script
  color       UX-CLI-20        no escape bytes under --color=never, CLICOLOR=0, TERM=dumb, NO_COLOR
  anim        UX-CLI-21        no bare CR or cursor motion on a terminal under TERM=dumb, --quiet
  palette     UX-CLI-22        state colour uses the 16 ANSI slots only
  net         UX-CLI-08        no connect call on --version (Linux, needs strace, has a control run)
  act         UX-ACT-12 to 17  dry runs, refusals and --force wording for inventory rows T1 and above

Exit codes: 0 clean, 1 findings, 2 usage. A check that lacks its input is listed under
"did not run", never reported as a pass. The parser reads the clap and cobra help layout
by shape (a Commands heading and indented rows), with no depth cap.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import select
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

TIMEOUT = 20
SEV = {"UX-CLI-01": "MUST", "UX-CLI-02": "MUST", "UX-CLI-08": "MUST", "UX-CLI-09": "MUST", "UX-CLI-10": "MUST",
       "UX-CLI-11": "MUST", "UX-CLI-12": "MUST", "UX-CLI-13": "MUST", "UX-CLI-20": "MUST", "UX-CLI-21": "MUST",
       "UX-CLI-22": "MUST", "UX-ACT-12": "MUST", "UX-ACT-13": "MUST", "UX-ACT-15": "MUST", "UX-ACT-17": "MUST"}
HEAD_RE = re.compile(r"^(?:(?:[A-Z][A-Za-z-]* )*Commands:|[A-Z][A-Z -]*COMMANDS)$")
ROW_RE = re.compile(r"^ {2,}([a-z][a-z0-9-]*)(?:, [a-z0-9-]+)*(?:: +| {2,}|:?$)")
SYNONYMS = [{"update", "upgrade"}, {"remove", "delete", "rm"}, {"create", "new"}, {"list", "ls"}]
CHANGE_WORDS = re.compile(rb"\b(added|updated|pushed|installed|removed|created)\b")
CURSOR_RE = re.compile(rb"\x1b\[[0-9;?]*[ABCDEFGHJKSTfhl]")
CONNECT = "import socket\ntry: socket.create_connection(('192.0.2.1', 9), 0.2)\nexcept OSError: pass"


def subs(text: str) -> list[str]:
    """Command names under a Commands heading. Prose is never read as a command."""
    out, on = [], False
    for line in text.splitlines():
        if HEAD_RE.match(line):
            on = True
            continue
        if not line.strip() or not line.startswith(" "):
            on = False
        m = ROW_RE.match(line) if on else None
        if m and m.group(1) != "help":
            out.append(m.group(1))
    return out


class R:
    def __init__(self, code, out=b"", err=b"", hung=False):
        self.code, self.out, self.err, self.hung = code, out or b"", err or b"", hung

    def text(self) -> str:
        return (self.out + self.err).decode("utf-8", "replace")


class Ctx:
    def __init__(self, a):
        self.cmd, self.usage = shlex.split(a.bin), a.usage_code
        self.home, self.cwd = tempfile.mkdtemp(), tempfile.mkdtemp()
        if a.workdir:
            shutil.copytree(a.workdir, self.cwd, dirs_exist_ok=True)
        self.findings, self.ran, self.skipped, self.notes = [], set(), [], []
        self.cache, self.tree = {}, None

    def fail(self, rid, msg, sev=None):
        self.findings.append((rid, sev or SEV.get(rid, "SHOULD"), msg))

    def did(self, *ids):
        self.ran.update(ids)

    def skip(self, what, why):
        self.skipped.append(f"{what} ({why})")

    def env(self, **extra):
        e = {k: v for k, v in os.environ.items() if k not in ("FORCE_COLOR", "CLICOLOR_FORCE", "CLICOLOR", "CI")}
        e.update(HOME=self.home, USERPROFILE=self.home, NO_COLOR="1", PAGER="cat", TERM="xterm",
                 XDG_CONFIG_HOME=self.home + "/.config", XDG_CACHE_HOME=self.home + "/.cache",
                 XDG_DATA_HOME=self.home + "/.local")
        for k, v in extra.items():
            e.pop(k, None) if v is None else e.__setitem__(k, v)
        return e

    def run(self, args, timeout=TIMEOUT, **env) -> R:
        try:
            p = subprocess.run(self.cmd + list(args), stdin=subprocess.DEVNULL, capture_output=True,
                               env=self.env(**env), cwd=self.cwd, timeout=timeout, start_new_session=True)
            return R(p.returncode, p.stdout, p.stderr)
        except subprocess.TimeoutExpired as e:
            return R(None, e.stdout, e.stderr, True)
        except OSError as e:
            print(f"cli_matrix: cannot run {self.cmd}: {e}", file=sys.stderr)
            sys.exit(2)

    def pty(self, args, timeout, **env) -> R:
        """Run with stdin and both output streams on a pseudo-terminal (POSIX only)."""
        import pty
        m, s = pty.openpty()
        p = subprocess.Popen(self.cmd + list(args), stdin=s, stdout=s, stderr=s, env=self.env(**env),
                             cwd=self.cwd, close_fds=True, start_new_session=True)
        os.close(s)
        buf, end, hung = b"", time.monotonic() + timeout, False
        while True:
            left = end - time.monotonic()
            if left <= 0:
                hung = True
                p.kill()
                break
            if select.select([m], [], [], min(left, 0.2))[0]:
                try:
                    d = os.read(m, 65536)
                except OSError:
                    break
                if not d:
                    break
                buf += d
            elif p.poll() is not None:
                break
        p.wait()
        os.close(m)
        return R(None if hung else p.returncode, buf, b"", hung)

    def help(self, path) -> R:
        if tuple(path) not in self.cache:
            self.cache[tuple(path)] = self.run([*path, "-h"])
        return self.cache[tuple(path)]

    def snap(self) -> str:
        h = hashlib.sha256()
        for root in (self.cwd, self.home):
            for dp, dn, fn in sorted(os.walk(root)):
                dn.sort()
                for f in sorted(fn):
                    p = Path(dp, f)
                    h.update(str(p.relative_to(root)).encode() + p.read_bytes())
        return h.hexdigest()

    def paths(self) -> dict:
        """Every command path mapped to its child names. A child whose help equals its parent's is no command."""
        if self.tree is None:
            self.tree = {}
            sig = lambda r: hashlib.md5(r.out + r.err).hexdigest()

            def rec(path):
                if len(path) >= 8:  # alarm, not a cap: no real path is this deep
                    self.fail("UX-CLI-02", f"RUNAWAY help walk at '{' '.join(path)}'")
                    self.tree[path] = []
                    return
                h = self.help(path)
                kids = [c for c in subs(h.out.decode("utf-8", "replace")) if sig(self.help(path + (c,))) != sig(h)]
                self.tree[path] = kids
                for c in kids:
                    rec(path + (c,))

            rec(())
        return self.tree


def lines(b: bytes) -> list[str]:
    return [x.rstrip() for x in b.decode("utf-8", "replace").splitlines() if x.strip()]


def label(path) -> str:
    return " ".join(path) or "(root)"


def usage_ok(r: R) -> bool:
    return r.code == 0 and re.search(rb"^usage", r.out, re.I | re.M) is not None


def tsv(path):
    rows = []
    for ln in Path(path).read_text().splitlines():
        if ln.strip() and not ln.startswith("#"):
            rows.append(ln.split("\t"))
    return rows


def c_bare(c, a):
    c.did("UX-CLI-01", "UX-CLI-28")
    r = c.run([], timeout=10)
    if r.hung:
        c.fail("UX-CLI-01", "bare invocation did not end in 10 s")
    elif b"usage" not in (r.out + r.err).lower():
        c.fail("UX-CLI-01", "bare invocation prints no usage text")
    if os.name == "posix":
        if c.pty([], 5).hung:
            c.fail("UX-CLI-01", "bare invocation on a terminal did not end in 5 s (prompt, REPL or stdin read)")
    else:
        c.skip("UX-CLI-01 terminal run", "needs a POSIX pty")
    if r.code != 0 or lines(r.out) != lines(c.help(()).out):
        c.fail("UX-CLI-28", f"bare invocation (exit {r.code}) is not the -h text on stdout with exit 0")


def c_help(c, a):
    c.did("UX-CLI-02")
    for path in c.paths():
        for extra in (["-h"], ["--help"]):
            r = c.help(path) if extra == ["-h"] else c.run([*path, *extra])
            if not usage_ok(r):
                c.fail("UX-CLI-02", f"'{label(path)} {extra[0]}' exits {r.code} or shows no Usage line on stdout")
        flags = re.findall(r"^ +(?:-[A-Za-z], )?(--[a-z][a-z0-9-]*)  ", c.run([*path, "--help"]).out.decode("utf-8", "replace"), re.M)
        flag = next((f for f in flags if f not in ("--help", "--version")), None)
        if flag and not usage_ok(c.run([*path, flag, "-h"])):
            c.fail("UX-CLI-02", f"'{label(path)} {flag} -h' does not show help")
    for name in filter(None, (a.forwarding or "").split(",")):
        if not re.search(r"^Usage:.*(--|\.\.\.)", c.help((name,)).out.decode("utf-8", "replace"), re.M):
            c.fail("UX-CLI-02", f"'{name}' forwards arguments but its usage line shows neither -- nor ...")


def c_groups(c, a):
    c.did("UX-CLI-03")
    for path, kids in c.paths().items():
        if path and kids:
            r = c.run(list(path))
            if r.code != c.usage or b"usage" not in r.err.lower():
                c.fail("UX-CLI-03", f"group '{label(path)}' exits {r.code} with usage on stderr {b'usage' in r.err.lower()}; want {c.usage} and usage on stderr")


def c_shape(c, a):
    c.did("UX-CLI-05", "UX-CLI-06", "UX-CLI-07")
    text = c.help(()).out.decode("utf-8", "replace")
    if len(text.splitlines()) > 60:
        c.fail("UX-CLI-06", f"root -h is {len(text.splitlines())} lines (house limit 60)")
    m = re.search(r"^(?:EXAMPLES|Examples):?\s*$", text, re.M)
    n = 0
    for ln in text[m.end():].splitlines() if m else []:
        if ln and not ln[0].isspace():
            break
        n += bool(ln.strip())
    if not 2 <= n <= 5:
        c.fail("UX-CLI-05", f"root -h carries {n} example lines (house range 2 to 5)")
    for path, kids in c.paths().items():
        for syn in SYNONYMS:
            if len(syn & set(kids)) > 1:
                c.fail("UX-CLI-07", f"'{label(path)}' lists {sorted(syn & set(kids))} as separate commands")
    top = c.paths()[()]
    for path, kids in c.paths().items():
        for k in kids if len(path) == 1 else []:
            if k in top:
                c.notes.append(f"REVIEW UX-CLI-07: '{k}' and '{label(path)} {k}' share a name; read both descriptions")
    if a.headline:
        c.did("UX-CLI-04")
        if a.headline not in top:
            c.fail("UX-CLI-04", f"headline command '{a.headline}' is not in the root command list")
        elif top.index(a.headline) >= 5 and not re.search(
                rf"^(?:Common|Main|Basic|Core)[^\n]*\n(?:[^\n]+\n)*?\s+{re.escape(a.headline)}\b", text, re.I | re.M):
            c.fail("UX-CLI-04", f"'{a.headline}' is row {top.index(a.headline) + 1}, outside the first 5 and under no Common heading")
    else:
        c.skip("UX-CLI-04", "no --headline")


def c_version(c, a):
    c.did("UX-CLI-08")
    for flag, sev in (("--version", "MUST"), ("-V", "SHOULD")):
        r = c.run([flag])
        out = lines(r.out)
        bad = r.code != 0 or len(out) != 1 or not re.match(r"^[A-Za-z][A-Za-z0-9._ -]* v?\d+\.\d+\.\d+", out[0] if out else "") or r.err
        if bad:
            c.fail("UX-CLI-08", f"'{flag}' must print one '<name> <semver>' line on stdout, exit 0, nothing on stderr (got exit {r.code}, {len(out)} lines, {len(r.err)} stderr bytes)", sev)


def c_net(c, a):
    if not shutil.which("strace"):
        return c.skip("net (UX-CLI-08)", "strace not found; Linux only. macOS and Windows: record the result or 'not run'")

    def connects(argv):
        fd, tmp = tempfile.mkstemp()
        os.close(fd)
        try:
            subprocess.run(["strace", "-f", "-qq", "-e", "trace=connect", "-o", tmp, *argv], stdin=subprocess.DEVNULL,
                           capture_output=True, env=c.env(), cwd=c.cwd, timeout=TIMEOUT)
            return len(re.findall(r"AF_INET6?", Path(tmp).read_text(errors="replace")))
        finally:
            os.unlink(tmp)

    if connects([sys.executable, "-I", "-c", CONNECT]) < 1:
        return c.skip("net (UX-CLI-08)", "the control run saw no connect call, so a 0 would prove nothing")
    c.did("UX-CLI-08 network")
    for args in ([], ["--version"], ["-V"]):
        if connects(c.cmd + args):
            c.fail("UX-CLI-08", f"'{' '.join(args) or 'bare invocation'}' makes a network connect call")


def typo_for(name, siblings):
    t = name[:-1]
    return name + name[-1] if len(t) < 2 or t in siblings else t


def c_typo(c, a):
    c.did("UX-CLI-09", "UX-CLI-10", "UX-CLI-11")
    for path, kids in c.paths().items():
        for k in kids:
            t, before = typo_for(k, kids), c.snap()
            r = c.run([*path, t])
            text = r.text()
            if r.code != c.usage or not re.search(r"similar|did you mean", text, re.I):
                c.fail("UX-CLI-09", f"'{label(path)} {t}' exits {r.code} and {'does' if re.search('similar|did you mean', text, re.I) else 'does not'} suggest a name; want exit {c.usage} and a suggestion")
            for ln in text.splitlines():
                if t in ln and re.search(r"\b(add|install|get|pull)\b", ln) and not re.search(r"unrecogni|unknown|no such|not found|invalid|similar|did you mean", ln, re.I):
                    c.fail("UX-CLI-10", f"'{label(path)} {t}' prints an install hint built from the typo: {ln.strip()}")
            if c.snap() != before:
                c.fail("UX-CLI-11", f"'{label(path)} {t}' changed files in HOME or the working directory")


def pairs(c, path):
    return re.findall(r"^ +-([A-Za-z]), --([a-z][a-z0-9-]*)", c.run([*path, "--help"]).out.decode("utf-8", "replace"), re.M)


def c_global(c, a):
    c.did("UX-CLI-12")
    root = dict(pairs(c, ()))
    for path in c.paths():
        for s, long in pairs(c, path) if path else []:
            if s in root and root[s] != long:
                c.fail("UX-CLI-12", f"-{s} is --{root[s]} at the root and --{long} in '{label(path)}'")
    if not a.flag_values:
        return c.skip("UX-CLI-12 position", "no --flag-values file")
    for flag, *val in tsv(a.flag_values):
        val = [v for v in val if v]
        for s in c.paths()[()]:
            for where, argv in (("before", [flag, *val, s, "--help"]), ("after", [s, flag, *val, "--help"])):
                r = c.run(argv)
                if r.code != 0:
                    c.fail("UX-CLI-12", f"flag {flag} {where} '{s}' exits {r.code}: {' '.join(argv)}")


def c_completion(c, a):
    c.did("UX-CLI-13")
    top = c.paths()[()]
    words = shlex.split(a.completion_cmd) if a.completion_cmd else [n for n in top if "complet" in n][:1]
    if not words:
        return c.fail("UX-CLI-13", "no command whose name contains 'complet' is listed in the root help")
    r = c.run([*words, "bash"])
    if r.code != 0 or not r.out.strip() or r.err:
        c.fail("UX-CLI-13", f"'{' '.join(words)} bash' must print the script on stdout, exit 0, nothing on stderr (exit {r.code}, {len(r.err)} stderr bytes)")
    if c.run([*words, "nosuchshell"]).code != c.usage:
        c.fail("UX-CLI-13", f"an unknown shell must exit {c.usage}")


def c_color(c, a):
    if not a.log_cmd:
        return c.skip("color (UX-CLI-20)", "no --log-cmd naming a command that logs a warning")
    c.did("UX-CLI-20")
    base = shlex.split(a.log_cmd)
    for name, argv, env in (("--color=never", ["--color=never", *base], {"NO_COLOR": None}),
                            ("CLICOLOR=0", base, {"NO_COLOR": None, "CLICOLOR": "0"}),
                            ("TERM=dumb", base, {"NO_COLOR": None, "TERM": "dumb"}),
                            ("NO_COLOR=1", base, {})):
        r = c.run(argv, **env)
        if (r.out + r.err).count(b"\x1b"):
            c.fail("UX-CLI-20", f"escape bytes in the output of '{a.log_cmd}' under {name}")


def c_anim(c, a):
    if not a.anim_cmd:
        return c.skip("anim (UX-CLI-21)", "no --anim-cmd naming a command that shows progress")
    if os.name != "posix":
        return c.skip("anim (UX-CLI-21)", "needs a POSIX pty")
    c.did("UX-CLI-21")
    base = shlex.split(a.anim_cmd)
    cases = [("TERM=dumb", base, {"TERM": "dumb"}), ("--quiet", [*base, "--quiet"], {})]
    if a.anim_optout:
        cases.append((a.anim_optout, base, {a.anim_optout: "1"}))
    for name, argv, env in cases:
        out = c.pty(argv, 10, **env).out
        n = len(re.findall(rb"\r(?!\n)", out)) + len(CURSOR_RE.findall(out))
        if n:
            c.fail("UX-CLI-21", f"{n} bare carriage returns or cursor sequences from '{a.anim_cmd}' under {name}")


def c_palette(c, a):
    c.did("UX-CLI-22")
    allow = {(r[0], int(r[1])) for r in tsv(a.decorative_allow)} if a.decorative_allow else set()
    runs = [(label(p), [*p, "--help"], {"CLICOLOR_FORCE": "1", "NO_COLOR": None}) for p in c.paths()]
    for argv in tsv(a.probe) if a.probe else []:
        words = shlex.split(argv[0])
        runs.append((" ".join(words), [*words, "--color=always"], {"NO_COLOR": None}))
    for name, argv, env in runs:
        data = c.run(argv, **env)
        data = data.out + data.err
        if re.search(rb"\x1b\[[0-9;]*[34]8;2;", data):
            c.fail("UX-CLI-22", f"truecolor in the output of '{name}'")
        for idx in {int(x) for x in re.findall(rb"\x1b\[[0-9;]*[34]8;5;(\d+)", data)}:
            if idx > 15 and (name, idx) not in allow:
                c.fail("UX-CLI-22", f"colour index {idx} in the output of '{name}' is outside the 16 ANSI slots and not on the allow file")


def c_act(c, a):
    if not a.inventory:
        return c.skip("act (UX-ACT-12 to 17)", "no --inventory file")
    c.did("UX-ACT-13", "UX-ACT-15", "UX-ACT-17")
    for row in tsv(a.inventory):
        args, tier, refuse = (row + ["", ""])[:3]
        argv = shlex.split(args)
        if tier not in ("T1", "T2", "T3"):
            continue
        h = c.run([*argv, "--help"]).out.decode("utf-8", "replace")
        if "--dry-run" not in h:
            c.fail("UX-ACT-13", f"'{args}' is {tier} and its help lists no --dry-run")
        else:
            before = c.snap()
            r1, r2 = c.run([*argv, "--dry-run"], timeout=5), c.run([*argv, "--dry-run"], timeout=5)
            if r1.hung or c.snap() != before:
                c.fail("UX-ACT-13", f"'{args} --dry-run' {'hung' if r1.hung else 'wrote files'}")
            if (r1.code, r1.out) != (r2.code, r2.out):
                c.fail("UX-ACT-13", f"two '{args} --dry-run' runs differ in exit code or stdout")
            if r1.code == 0 and not r1.out.strip():
                c.fail("UX-ACT-15", f"'{args} --dry-run' exits 0 with empty stdout")
            if r1.code and CHANGE_WORDS.search(r1.out + r1.err):
                c.fail("UX-ACT-15", f"'{args} --dry-run' exits {r1.code} and still prints a change word")
            if r1.code == 0 and not re.search(rb"^would |nothing to do", r1.out, re.M):
                c.notes.append(f"NOTE UX-ACT-13 (SHOULD): '{args} --dry-run' prints no 'would <verb> <target>' line")
        if tier in ("T2", "T3") and not re.search(r"^ *Consequence: .{10,}", h, re.M):
            c.fail("UX-ACT-13", f"'{args}' is {tier} and its help has no 'Consequence:' line", "SHOULD")
        for m in re.finditer(r"^.*--force.*(?:\n {6,}.*)?", h, re.M):
            if re.search(r"consent|trust|hook|prompt", m.group(0), re.I):
                c.fail("UX-ACT-17", f"'{args}' --force help mentions consent, trust, hooks or prompts: {m.group(0).strip()[:80]}")
        if refuse:
            c.did("UX-ACT-12")
            ra, before = shlex.split(refuse), c.snap()
            r = c.run(ra, timeout=5)
            err = r.err.decode("utf-8", "replace").splitlines()
            tl = [i for i, x in enumerate(err) if x.startswith("Try: ")]
            ol = [i for i, x in enumerate(err) if x.startswith("Override: ")]
            if r.hung or not r.code:
                c.fail("UX-ACT-12", f"'{refuse}' {'hung' if r.hung else 'exited 0'} instead of refusing")
            elif len(tl) != 1 or len(ol) != 1 or tl[0] > ol[0] or re.search(r"--(force|yes)\b|\s-[fy]\b", err[tl[0]]):
                c.fail("UX-ACT-12", f"'{refuse}' refusal needs one 'Try: ' line (safe step, no override flag) before one 'Override: ' line")
            if c.snap() != before:
                c.fail("UX-ACT-12", f"'{refuse}' changed files while refusing")
            d = c.run([*ra, "--dry-run"], timeout=5)
            if d.code != r.code:
                c.fail("UX-ACT-13", f"'{refuse} --dry-run' exits {d.code} where the real run exits {r.code}")


CHECKS = {"bare": c_bare, "help": c_help, "groups": c_groups, "shape": c_shape, "version": c_version, "net": c_net,
          "typo": c_typo, "global": c_global, "completion": c_completion, "color": c_color, "anim": c_anim,
          "palette": c_palette, "act": c_act}


def parser():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--bin", help="the command under test, quoted when it has arguments")
    p.add_argument("--usage-code", type=int, default=64, help="the CLI's usage exit code (default 64)")
    p.add_argument("--only", help="comma-separated check names")
    p.add_argument("--headline", help="the headline command (UX-CLI-04)")
    p.add_argument("--forwarding", help="comma-separated commands that forward trailing arguments")
    p.add_argument("--flag-values", help="TSV: flag, tab, one value it accepts (UX-CLI-12)")
    p.add_argument("--completion-cmd", help="words of the completion command, when it is not top level")
    p.add_argument("--log-cmd", help="a command that logs a warning on stderr (UX-CLI-20)")
    p.add_argument("--anim-cmd", help="a command that shows progress on a terminal (UX-CLI-21)")
    p.add_argument("--anim-optout", help="the animation opt-out environment variable (UX-CLI-29)")
    p.add_argument("--probe", help="file of extra commands, one per line, run with --color=always (UX-CLI-22)")
    p.add_argument("--decorative-allow", help="TSV: command path, tab, colour index approved by the owner")
    p.add_argument("--inventory", help="TSV: args, tab, tier [, tab, args that hit a refusal] (UX-ACT-12 to 17)")
    p.add_argument("--workdir", help="a directory copied to the working directory, to supply fixture state")
    p.add_argument("--must-only", action="store_true", help="exit 1 only on MUST findings")
    p.add_argument("--self-test", action="store_true")
    return p


def analyse(argv) -> Ctx:
    a = parser().parse_args(argv)
    if not a.bin:
        parser().error("--bin is required")
    c = Ctx(a)
    only = set(filter(None, (a.only or "").split(",")))
    for name in only - set(CHECKS):
        parser().error(f"unknown check {name}")
    for name, fn in CHECKS.items():
        if (not only and name != "net") or name in only:
            fn(c, a)
    return c


def self_test() -> int:
    here = Path(__file__).parent / "fixtures" / "cli"
    base = ["--bin", shlex.join([sys.executable, "-I", str(here / "fakecli.py")])]
    full = [*base, "--headline", "run", "--forwarding", "run", "--flag-values", str(here / "flag-values.tsv"),
            "--log-cmd", "run job.toml", "--anim-cmd", "run job.toml", "--anim-optout", "FAKECLI_NO_ANIM",
            "--probe", str(here / "probes.txt"), "--decorative-allow", str(here / "decorative.allow"),
            "--inventory", str(here / "inventory.tsv")]
    bad = 0

    def expect(ok, what):
        nonlocal bad
        if not ok:
            bad += 1
            print(f"self-test FAIL: {what}")

    expect(subs("Usage: x\n\nUse its flag to run\n  gh pr view  words") == [], "prose must not read as a command")
    expect(subs("Available Commands:\n  add  A\n  rm, remove  B\n  help  C\n\nOptions:\n  foo  D") == ["add", "rm"], "layout parser")
    expect(subs("CORE COMMANDS\n  auth:  Login\n\nFLAGS\n  x") == ["auth"], "all-caps heading")
    os.environ["FAKECLI_BAD"] = ""
    good = analyse(full)
    expect(not good.findings, f"clean fixture reported {good.findings}")
    expect({"UX-CLI-09", "UX-CLI-21", "UX-CLI-22", "UX-ACT-12"} <= good.ran, f"clean fixture skipped checks: {sorted(good.ran)}")
    plans = [("repl", "bare", "UX-CLI-01"), ("badversion", "version", "UX-CLI-08"), ("group2", "groups", "UX-CLI-03"),
             ("notip", "typo", "UX-CLI-09"), ("installhint", "typo", "UX-CLI-10"), ("globalafter", "global", "UX-CLI-12"),
             ("escerr", "color", "UX-CLI-20"), ("anim", "anim", "UX-CLI-21"), ("badpalette", "palette", "UX-CLI-22"),
             ("dryrunwrites", "act", "UX-ACT-13"), ("dryrunpasses", "act", "UX-ACT-13"), ("forcemisuse", "act", "UX-ACT-17")]
    for defect, group, rid in plans:
        os.environ["FAKECLI_BAD"] = defect
        found = {f[0] for f in analyse([*full, "--only", group]).findings}
        expect(rid in found, f"{defect} must raise {rid}, got {sorted(found)}")
    os.environ["FAKECLI_BAD"] = "badpalette"
    with tempfile.NamedTemporaryFile("w", suffix=".allow") as f:
        f.write("run job.toml\t203\n")
        f.flush()
        allowed = analyse([*full, "--only", "palette", "--decorative-allow", f.name])
        expect(not allowed.findings, f"an allow-listed index must pass, got {allowed.findings}")
    os.environ.pop("FAKECLI_BAD")
    print("self-test " + ("FAILED" if bad else "ok"))
    return 1 if bad else 0


def main(argv) -> int:
    if "--self-test" in argv:
        return self_test()
    a = parser().parse_args(argv)
    c = analyse(argv)
    for rid, sev, msg in c.findings:
        print(f"{sev} {rid}: {msg}")
    for n in c.notes:
        print(n)
    print("ran: " + (", ".join(sorted(c.ran)) or "nothing"))
    if c.skipped:
        print("did not run: " + "; ".join(c.skipped))
    return 1 if any(s == "MUST" or not a.must_only for _, s, _ in c.findings) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
