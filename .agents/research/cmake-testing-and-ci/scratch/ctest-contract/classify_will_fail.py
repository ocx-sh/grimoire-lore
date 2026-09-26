import re, sys, glob, os

CORPUS = "/home/mherwig/.cache/research-lang/exemplars/cmake"

MODE = sys.argv[1] if len(sys.argv) > 1 else "will_fail"

def cmake_files(corpus):
    out = []
    for root, dirs, fnames in os.walk(corpus):
        if '/.git' in root:
            continue
        for f in fnames:
            if f.endswith('.cmake') or f == 'CMakeLists.txt':
                out.append(os.path.join(root, f))
    return out

files = cmake_files(CORPUS)

if MODE == "timeout":
    # Multi-line-aware, word-boundary TIMEOUT count (excludes DISCOVERY_TIMEOUT,
    # TIMEOUT_AFTER_MATCH, CTEST_TEST_TIMEOUT, TIMEOUT_SIGNAL_NAME by construction).
    total_all = 0
    total_nokw = 0
    hit_files = set()
    for path in files:
        try:
            text = open(path, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        n = len(re.findall(r'(?<![A-Za-z0-9_])TIMEOUT(?![A-Za-z0-9_])', text))
        if n:
            total_all += n
            if 'Kitware__CMake' not in path and 'ocx-sh__find_ocx' not in path:
                total_nokw += n
                hit_files.add(path.replace(CORPUS + '/', ''))
    print("TIMEOUT token count, whole corpus:", total_all)
    print("TIMEOUT token count, non-Kitware non-ocx:", total_nokw)
    print("files:", sorted(hit_files))
    sys.exit(0)

if MODE == "subdir_guard":
    # add_subdirectory(tests?) sites and whether BUILD_TESTING/PROJECT_IS_TOP_LEVEL
    # appears in the 8 lines immediately above the call.
    total = guarded_ptl = guarded_bt = guarded_either = 0
    for path in files:
        if 'Kitware__CMake' in path:
            continue
        try:
            lines = open(path, encoding='utf-8', errors='replace').readlines()
        except Exception:
            continue
        for i, line in enumerate(lines):
            if re.search(r'add_subdirectory\(\s*tests?\b', line):
                total += 1
                ctx = ''.join(lines[max(0, i - 8):i + 1])
                has_ptl = 'PROJECT_IS_TOP_LEVEL' in ctx
                has_bt = bool(re.search(r'BUILD_TESTING', ctx))
                guarded_ptl += has_ptl
                guarded_bt += has_bt
                guarded_either += (has_ptl or has_bt)
    print("total add_subdirectory(test*) sites (non-Kitware):", total)
    print("guarded by PROJECT_IS_TOP_LEVEL:", guarded_ptl)
    print("guarded by BUILD_TESTING:", guarded_bt)
    print("guarded by either:", guarded_either)
    sys.exit(0)

results = []
for path in files:
    try:
        text = open(path, encoding='utf-8', errors='replace').read()
    except Exception:
        continue
    for m in re.finditer(r'\bWILL_FAIL\b', text):
        start = m.start()
        # skip doc-comment style backtick mentions
        line_start = text.rfind('\n', 0, start) + 1
        line_end = text.find('\n', start)
        line = text[line_start:line_end]
        if '``WILL_FAIL``' in line or line.strip().startswith('#'):
            continue
        # find enclosing set_tests_properties(...) block: search backward for the last
        # 'set_tests_properties(' before this point, and forward for matching close paren
        block_start = text.rfind('set_tests_properties(', 0, start)
        if block_start == -1:
            # could be an ARG_WILL_FAIL definition (a wrapper macro), skip classification but note
            results.append((path, start, line.strip(), 'macro-definition-or-other', None))
            continue
        # extract balanced parens from block_start
        depth = 0
        i = block_start
        j = None
        for k in range(block_start, min(len(text), block_start+4000)):
            if text[k] == '(':
                depth += 1
            elif text[k] == ')':
                depth -= 1
                if depth == 0:
                    j = k
                    break
        if j is None or j < start:
            results.append((path, start, line.strip(), 'unbounded-block', None))
            continue
        block = text[block_start:j+1]
        has_pass = bool(re.search(r'PASS_REGULAR_EXPRESSION', block))
        has_fail_re = bool(re.search(r'FAIL_REGULAR_EXPRESSION', block))
        # extract the WILL_FAIL value
        vm = re.search(r'WILL_FAIL\s+([A-Za-z0-9_${}]+)', block)
        val = vm.group(1) if vm else '?'
        severity_pinned = False
        if has_pass or has_fail_re:
            # check regex text for severity header like "CMake Error" or "Error"
            rem = re.search(r'(PASS|FAIL)_REGULAR_EXPRESSION\s+"([^"]*)"', block)
            regex_text = rem.group(2) if rem else ''
            if re.search(r'CMake Error|CMake Deprecation|CMake Warning|Error at', regex_text):
                severity_pinned = True
            kind = 'combined-with-regex' + ('-severity-pinned' if severity_pinned else '-message-only')
        else:
            kind = 'bare'
        rel = path.replace(CORPUS + '/', '')
        results.append((rel, start, line.strip(), kind, val))

kitware = [r for r in results if r[0].startswith('Kitware__CMake/')]
ocx = [r for r in results if r[0].startswith('ocx-sh__find_ocx/')]
other = [r for r in results if r not in kitware and r not in ocx]

def summarize(name, rows):
    print(f"--- {name}: {len(rows)} ---")
    from collections import Counter
    c = Counter(r[3] for r in rows)
    for k,v in c.items():
        print(f"  {k}: {v}")

summarize("ALL", results)
summarize("Kitware/CMake", kitware)
summarize("find_ocx", ocx)
summarize("Rest of corpus (non-Kitware, non-find_ocx)", other)

print()
print("=== Non-Kitware, non-ocx rows detail ===")
for r in other:
    print(r[0], r[1], '|', r[2], '|', r[3], '|', r[4])
