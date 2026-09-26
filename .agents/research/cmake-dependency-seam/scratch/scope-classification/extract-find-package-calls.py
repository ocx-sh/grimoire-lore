#!/usr/bin/env python3
# Shared extractor: walks the exemplar corpus, finds calls to a fixed set of
# CMake functions (paren-balanced, case-insensitive), emits one TSV row per
# call: repo \t relpath \t line \t func \t args_oneline
# Reused by several deps-<axis>.sh scripts instead of re-walking the corpus
# once per axis (llvm-project alone has 2498 CMakeLists.txt).
import os, re, sys

CORPUS = "/home/mherwig/.cache/research-lang/exemplars/cmake"
FUNCS = [
    "find_package",
    "find_package", "FetchContent_Declare", "FetchContent_MakeAvailable",
    "FetchContent_Populate", "FetchContent_GetProperties", "ExternalProject_Add",
    "CPMAddPackage", "CPMFindPackage", "CPMUsePackageLock", "hunter_add_package",
    "cmake_language", "HunterGate", "vcpkg_from_github", "vcpkg_cmake_configure",
    "vcpkg_cmake_install", "vcpkg_cmake_config_fixup", "vcpkg_fixup_pkgconfig",
    "vcpkg_copy_pdbs",
]
FUNC_RE = re.compile(r'\b(' + '|'.join(re.escape(f) for f in FUNCS) + r')\s*\(', re.IGNORECASE)

def strip_comment(line):
    # crude: drop from an unquoted # to end of line
    out, inq = [], False
    for ch in line:
        if ch == '"':
            inq = not inq
        if ch == '#' and not inq:
            break
        out.append(ch)
    return ''.join(out)

def find_calls(text):
    calls = []
    for m in FUNC_RE.finditer(text):
        start = m.end() - 1  # index of '('
        depth = 0
        i = start
        n = len(text)
        while i < n:
            c = text[i]
            if c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0:
                    break
            i += 1
        args = text[start+1:i]
        line_no = text.count('\n', 0, m.start()) + 1
        oneline = ' '.join(args.split())
        calls.append((line_no, m.group(1), oneline))
    return calls

def iter_files():
    for repo in sorted(os.listdir(CORPUS)):
        rd = os.path.join(CORPUS, repo)
        if not os.path.isdir(os.path.join(rd, '.git')):
            continue
        for root, dirs, files in os.walk(rd):
            if '/.git' in root or root.endswith('/.git'):
                dirs[:] = []
                continue
            for f in files:
                if f == 'CMakeLists.txt' or f.endswith('.cmake') or f == 'portfile.cmake':
                    yield repo, os.path.join(root, f)

def main():
    out = sys.stdout
    for repo, path in iter_files():
        try:
            with open(path, 'r', errors='replace') as fh:
                raw = fh.read()
        except OSError:
            continue
        # strip comments line by line but keep newlines for line numbering
        lines = raw.split('\n')
        cleaned = '\n'.join(strip_comment(l) for l in lines)
        rel = os.path.relpath(path, os.path.join(CORPUS, repo))
        for line_no, func, args in find_calls(cleaned):
            out.write(f"{repo}\t{rel}\t{line_no}\t{func}\t{args}\n")

if __name__ == '__main__':
    main()
