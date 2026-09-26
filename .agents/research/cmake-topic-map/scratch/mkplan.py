#!/usr/bin/env python3
"""Bake the phase-7 authoring plan (cmake-topic-map.md › Authoring notes §2, §3, §10)
into cmake-author.template.mjs.

usage: mkplan.py <date> <out.mjs>
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))

NOTES = 'cmake-topic-map.md'  # the drafters read "Authoring notes" and the contradiction lists there


def d(file, family, sources, task_hint):
    return {'file': file, 'family': family, 'sources': sources + [NOTES], 'task_hint': task_hint}


cmake_build = {
    'rule': 'cmake-build',
    'core_family': 'CMK-CORE',
    'glob_list': [
        '**/CMakeLists.txt', '**/*.cmake', '**/*.cmake.in', '**/CMakeLists.txt.in',
        '**/CMakePresets.json', '**/CMakeUserPresets.json', '**/*.pc.in',
        '**/.gersemirc', '**/.cmake-format*',
    ],
    'index_sources': [
        'cmake-versions-and-gate.md', 'cmake-module-authoring.md', 'cmake-testing-and-ci.md', NOTES,
    ],
    'depth': [
        d('versions-and-policies.md', 'CMK-VER', ['cmake-versions-and-gate.md'],
          'choosing or raising cmake_minimum_required, setting a policy, touching a CMAKE_EXPERIMENTAL_* variable, or making an old dependency configure on CMake 4 (VER-06 is a citation per (d)5; VER-03 gains the lock clause per (d)15)'),
        d('language.md', 'CMK-LANG', ['cmake-language.md'],
          'writing any function, macro, if(), loop, cache variable or option; returning a value from a function; chasing "my -D did not take" (pinned decision 7 appends the LANG-04 migration clause; (d)10 and (d)24 apply)'),
        d('module-authoring.md', 'CMK-MOD', ['cmake-module-authoring.md'],
          'writing a .cmake file other projects include: a Find module, a helper module, anything that downloads or runs a process at configure time, or ships copy-and-own (MOD-12 gains the (d)6 clause)'),
        d('targets.md', 'CMK-TGT', ['cmake-targets-and-abi.md', 'cmake-consumable-library.md'],
          'adding or changing a library or executable, linking anything, setting a flag, a language standard, visibility, PIC, shared or static, or C++20 modules (TGT-01..09 from targets-and-abi "Carried" applied to consumable-library row text, then TGT-10..20; never the consumable-library TGT copy per note 5.1; (d)1 and (d)2 apply)'),
        d('install-and-export.md', 'CMK-INST', ['cmake-consumable-library.md'],
          'making the project installable or consumable: install rules, the Config package, CPS export, pkg-config, RPATH, the package version file, CPack (CMK-INST section only, never its TGT section; (d)13 applies)'),
        d('dependencies.md', 'CMK-DEP', ['cmake-dependency-seam.md', 'cmake-skills.md'],
          'adding, pinning or replacing a dependency (find_package, FetchContent, CPM, Hunter, vendoring, CPS import) or finding out which copy was used (DEP-01..23 plus DEP-30..32 from cmake-skills.md with its amendments; (d)4, (d)5, (d)7 apply)'),
        d('toolchains-and-providers.md', 'CMK-TC', ['cmake-dependency-seam.md', 'cmake-skills.md'],
          'wiring a toolchain file, a package manager\'s toolchain, CMAKE_PROJECT_TOP_LEVEL_INCLUDES or a dependency provider; cross-compiling (TC-01..10; TC-05 takes the skills amendment text per (d)3; DEFER is never offered as a fix)'),
        d('testing.md', 'CMK-TEST', ['cmake-module-authoring.md', 'cmake-testing-and-ci.md'],
          'adding tests, gating the test tree, running CTest in CI, or testing a CMake module itself (TEST-01..05 from module-authoring, TEST-06..10 from testing-and-ci; (d)11 applies)'),
        d('presets-and-ci.md', 'CMK-CI', ['cmake-testing-and-ci.md'],
          'editing CMakePresets.json, standing up or changing a pipeline that runs CMake, or pinning the CMake a pipeline uses; cmake --presets-file (4.4) routes here ((d)8 and (d)14 apply)'),
        d('bazel-seam.md', 'CMK-BZL', ['cmake-bazel-seam.md'],
          'making the project wrappable by rules_foreign_cc, or keeping a CMake build and a Bazel build of the same code in step (BZL-02/-03/-04/-07/-08 cut to citations per note 5.3 and (d)19-21; BZL-CC-22/23/24/28 cited, never restated)'),
    ],
}

cpp_packaging = {
    'rule': 'cpp-packaging',
    'core_family': 'CMK-PKG',
    'glob_list': [
        '**/conanfile.py', '**/conanfile.txt', '**/conandata.yml', '**/conan.lock',
        '**/conanws.yml', '**/conanws.py', '**/vcpkg.json', '**/vcpkg-configuration.json',
        '**/portfile.cmake',
    ],
    'index_sources': ['cmake-package-managers.md', 'cmake-dependency-seam.md', 'cmake-bazel-seam.md', NOTES],
    'depth': [
        d('conan.md', 'CMK-CONAN', ['cmake-package-managers.md'],
          'editing a conanfile, a Conan profile or conan.lock; wiring Conan into CMake; publishing a recipe (CONAN-08 is a citation of CI-02 per (d)8; (d)9 applies; Conan profiles have no fixed name and route here)'),
        d('vcpkg.md', 'CMK-VCPKG', ['cmake-package-managers.md', 'cmake-consumable-library.md'],
          'editing vcpkg.json or vcpkg-configuration.json, a triplet or a portfile.cmake; wiring vcpkg into CMake; caching its binaries in CI (VCPKG-05 is a citation of TC-02; owner decision 8 adds one unofficial-<name> citation line)'),
    ],
}

SKILL_COMMON = (
    'Write a skill directory in the shape of {root}/skills/jvm-dependency-triage/SKILL.md and {root}/skills/bazel-adopt/ '
    '(frontmatter name equal to the directory name, a one-line third-person description with a "Use when" clause that does not open with a workflow verb, '
    'summary, keywords, license Apache-2.0, repository https://github.com/ocx-sh/grimoire-lore). SKILL.md under 500 lines; move long tables or '
    'per-mechanism detail into references/<name>.md files one level deep, each linked from SKILL.md. The skill mints no rule IDs and carries no depth '
    'that belongs in a rule (authoring notes §10). It ends with a | # | Finding | Rule | table repeating exactly the MUST rows note 3.1 lists for it, '
    'ID last, one-line text copied from the consolidation. Every command in it follows the verification-command shape and states what empty output means. '
    'Prove the commands the procedure depends on against a tiny planted project on the local CMake binaries before shipping them.'
).format(root=ROOT)

standalone = [
    {
        'kind': 'skill',
        'path': f'{ROOT}/skills/cmake-dependency-triage/SKILL.md',
        'sources': ['cmake-skills.md', 'cmake-dependency-seam.md', 'cmake-package-managers.md', 'cmake-consumable-library.md',
                    'cmake-skills/dependency-triage-procedure.md', NOTES],
        'brief': 'SKILL: cmake-dependency-triage. The procedure for "which copy, which version and which mechanism resolved this dependency, and why not the one I expected": symptom first, then the measured read order of (d)4 (cache grep for <Pkg>_DIR first, --fresh only, never -L or --graphviz as the first move), then how to read each answer across find_package modes, FetchContent redirects, providers, toolchain-injected paths, the Conan graph (conan graph info / explain) and vcpkg traces, then the rule that fixes it. ' + SKILL_COMMON,
    },
    {
        'kind': 'skill',
        'path': f'{ROOT}/skills/cmake-modernize/SKILL.md',
        'sources': ['cmake-skills.md', 'cmake-targets-and-abi.md', 'cmake-consumable-library.md', 'cmake-versions-and-gate.md',
                    'cmake-language.md', 'cmake-skills/modernize-procedure.md', NOTES],
        'brief': 'SKILL: cmake-modernize. Take a legacy tree to target-based and consumable, once per repository, in order: inventory, floor (report and ask, never raise it on its own: owner decision 9), targets, link keywords, flags and standards to targets or presets, top-level gating, install and export with a consumer round trip, as-subproject smoke, the configure gate and gersemi in CI, optional CPS and pkg-config. It lists every existing ${ARGN} parse as a finding with the flatten line of pinned decision 7 in the fix and never rewrites a public command without it. ' + SKILL_COMMON,
    },
]


def main():
    date, out = sys.argv[1:3]
    plan = {'date': date, 'rules': [cmake_build, cpp_packaging], 'standalone': standalone}
    tpl = open(os.path.join(HERE, 'cmake-author.template.mjs')).read()
    assert '__PLAN__' in tpl
    open(out, 'w').write(tpl.replace('__PLAN__', json.dumps(plan, indent=1, ensure_ascii=False), 1))
    json.dump(plan, open(os.path.join(HERE, 'author-plan.json'), 'w'), indent=1)
    n = sum(len(r['depth']) for r in plan['rules'])
    print(f'{out}: {len(plan["rules"])} rules, {n} depth files, {len(standalone)} standalone')


if __name__ == '__main__':
    main()
