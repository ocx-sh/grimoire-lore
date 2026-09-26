#!/bin/sh
# Measures generator behaviour under Conan 2.32.0 (scratch venv).
S=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers
export CONAN_HOME=$S/conanhome
CN=$S/venv/bin/conan
cd $S/proj
printf '[requires]\npkgb/1.0\n[generators]\nCMakeConfigDeps\n' > ccd/conanfile.txt
printf '[requires]\npkgb/1.0\n[generators]\nCMakeDeps\n' > cdeps/conanfile.txt
printf '[requires]\npkgb/1.0\n[tool_requires]\ntool/1.0\n[generators]\nCMakeDeps\n' > bctx/conanfile.txt
sed 's/CMakeDeps/CMakeConfigDeps/g; /build_context_activated/d' bctx/conanfile.py > bctx/ccd.py
echo "--- CMakeConfigDeps install messages:"; $CN install ccd -of ccd/out 2>&1 | grep -i -e experiment -e warn
echo "--- CMakeConfigDeps files:"; ls ccd/out | grep -i -e find -e config
echo "--- CMakeDeps Find files:"; $CN install cdeps -of cdeps/out >/dev/null 2>&1; ls cdeps/out | grep -e '^Find'
$CN install bctx/conanfile.txt -of bctx/o1 >/dev/null 2>&1; echo "--- tool files, CMakeDeps default:"; ls bctx/o1 | grep -i tool
$CN install bctx/conanfile.py -of bctx/o2 >/dev/null 2>&1; echo "--- tool files, build_context_activated:"; ls bctx/o2 | grep -i tool
$CN install bctx/ccd.py -of bctx/o3 >/dev/null 2>&1; echo "--- tool files, CMakeConfigDeps:"; ls bctx/o3 | grep -i tool
