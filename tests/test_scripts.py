#!/usr/bin/env python3
"""Tests for `check-artifacts.py`, the gate on what this catalog publishes.

The script validates the artifacts, never the language they describe: name
parity, context budgets, link resolution, description hygiene, glob liveness,
and rule-ID integrity. It does not ship — it lives under `.claude/` and runs
before publishing.

It already carries a `--self-test`. These tests cover what a self-test cannot:
that each detector fires on the specific defect that reached production here,
and stays silent on the near-miss that looks like it.

Stdlib only, so nothing needs installing:

    ocx run task -- task test
    python3 -m unittest discover -s tests -v
"""

from __future__ import annotations

import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS_PY = ROOT / ".claude" / "skills" / "research-lang" / "scripts" / "check-artifacts.py"


def load(path: Path, name: str):
    """Import a hyphenated script as a module.

    The module must be in `sys.modules` before execution: `@dataclass`
    resolves its own `__module__` through that table and raises if it is
    absent.
    """
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


artifacts = load(ARTIFACTS_PY, "artifacts_checker")


class SelfTest(unittest.TestCase):
    def test_self_test_passes(self):
        result = subprocess.run(
            [sys.executable, str(ARTIFACTS_PY), "--self-test"],
            capture_output=True,
            text=True,
            cwd=ROOT,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)


class RgPathOperands(unittest.TestCase):
    """`rg` with no path operand reads stdin, which for an agent is empty.

    This shipped in 297 verification cells: exit 1, no output, indistinguishable
    from a clean tree. A human testing in a terminal sees a recursive search and
    concludes the command works, because a TTY changes rg's behaviour. The
    parser behind the detector is worth pinning directly.
    """

    def operands(self, span: str):
        return artifacts.rg_path_operands(span)

    def test_bare_pattern_has_no_path(self):
        self.assertEqual(self.operands("rg -n 'foo'"), [])

    def test_explicit_dot_is_a_path(self):
        self.assertEqual(self.operands("rg -n 'foo' ."), ["."])

    def test_flag_values_are_not_paths(self):
        self.assertEqual(self.operands("rg -n --type rust --glob '!external/**' 'foo'"), [])

    def test_with_e_every_bare_token_is_a_path(self):
        self.assertEqual(self.operands("rg -n -e 'a' -e 'b' src/"), ["src/"])

    def test_e_form_without_path_is_caught(self):
        self.assertEqual(self.operands("rg -n -e 'a' -e 'b'"), [])

    def test_non_rg_span_is_not_parsed(self):
        self.assertIsNone(self.operands("cargo deny check bans"))


class CellDetectors(unittest.TestCase):
    """Each detector against the defect that produced it."""

    def findings_for(self, cell_body: str) -> list[str]:
        findings: list[artifacts.Finding] = []
        line = f"| X-01 | rule text | {cell_body} | MUST |"
        artifacts.check_runnable_spans(Path("t.md"), line, 1, findings)
        return [f.message for f in findings]

    def test_escaped_pipe_in_a_table_cell(self):
        # A table cell cannot hold a bare `|`, so `\|` is what gets written —
        # and the regex engine reads it as a literal, not alternation.
        messages = self.findings_for(r"`rg -n 'a\|b' .`")
        self.assertTrue(any("pipe" in m for m in messages), messages)

    def test_unsubstituted_template_in_a_pattern(self):
        messages = self.findings_for(r"`rg -n --type rust '\.<method>\(' .`")
        self.assertTrue(any("template" in m for m in messages), messages)

    def test_generic_argument_is_not_a_template(self):
        messages = self.findings_for(r"`rg -n --type rust 'Vec<u8>' .`")
        self.assertFalse(any("template" in m for m in messages), messages)

    def test_command_substitution(self):
        messages = self.findings_for("`rg -n 'x' $(git ls-files '*.rs')`")
        self.assertTrue(any("substitution" in m for m in messages), messages)

    def test_shell_glob_in_a_bare_path_operand(self):
        messages = self.findings_for("`rg -n 'x' crates/*/Cargo.toml`")
        self.assertTrue(any("shell glob" in m for m in messages), messages)

    def test_missing_path_operand(self):
        messages = self.findings_for("`rg -n --type rust 'x'`")
        self.assertTrue(any("no path operand" in m for m in messages), messages)

    def test_bad_type_flag(self):
        messages = self.findings_for("`rg -tn rust 'x' .`")
        self.assertTrue(any("--type" in m for m in messages), messages)

    def test_a_correct_cell_is_silent(self):
        self.assertEqual(self.findings_for("`rg -n --type rust -e 'a' -e 'b' .`"), [])


class RuleIdIntegrity(unittest.TestCase):
    def test_cited_but_undefined_id_is_reported(self):
        artifacts.CITED.clear()
        findings: list[artifacts.Finding] = []
        seen: dict = {}
        body = (
            "| ID | Rule | Verification | Severity |\n|---|---|---|---|\n"
            "| X-01 | see X-99 | `true` | MUST |\n"
        )
        artifacts.check_rule_tables(Path("t.md"), body, findings, seen)
        artifacts.check_citations(seen, findings)
        self.assertTrue(any("X-99" in f.message for f in findings))

    def test_unknown_family_is_left_alone(self):
        """A reference to another package's IDs is not this package's problem."""
        artifacts.CITED.clear()
        findings: list[artifacts.Finding] = []
        seen: dict = {}
        body = (
            "| ID | Rule | Verification | Severity |\n|---|---|---|---|\n"
            "| X-01 | see ZZZ-42 | `true` | MUST |\n"
        )
        artifacts.check_rule_tables(Path("t.md"), body, findings, seen)
        artifacts.check_citations(seen, findings)
        self.assertFalse(any("ZZZ-42" in f.message for f in findings))

    def test_empty_verification_cell_is_reported(self):
        findings: list[artifacts.Finding] = []
        body = "| ID | Rule | Verification | Severity |\n|---|---|---|---|\n| X-01 | do it |  | MUST |\n"
        artifacts.check_rule_tables(Path("t.md"), body, findings, {})
        self.assertTrue(any("empty verification" in f.message for f in findings))


class Descriptions(unittest.TestCase):
    def findings_for(self, description: object) -> list[str]:
        findings: list[artifacts.Finding] = []
        artifacts.check_description(Path("SKILL.md"), description, findings)
        return [f.message for f in findings]

    def test_workflow_verb_opening(self):
        messages = self.findings_for("Runs the widget checker. Use when checking widgets.")
        self.assertTrue(any("workflow verb" in m for m in messages), messages)

    def test_missing_trigger_clause(self):
        messages = self.findings_for("A checker for widget manifests.")
        self.assertTrue(any("Use when" in m for m in messages), messages)

    def test_a_good_description_is_silent(self):
        self.assertEqual(
            self.findings_for(
                "Checks widget manifests for drift. Use when reviewing a widget "
                "manifest or when the user mentions widget drift."
            ),
            [],
        )


class DeadGlobs(unittest.TestCase):
    """A rule scoped to a glob that matches nothing never loads, and says so
    to no one — the hazard that made `rust-cli-contract` miss 17 of the 20
    files it governed."""

    def test_glob_matching_nothing_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "real.rs").write_text("fn main() {}\n")
            findings: list[artifacts.Finding] = []
            artifacts.check_globs(Path("r.md"), ["**/*.rs", "**/*.nope"], root, findings)
        messages = [f.message for f in findings]
        self.assertEqual(len(messages), 1, messages)
        self.assertIn("*.nope", messages[0])


if __name__ == "__main__":
    unittest.main()
