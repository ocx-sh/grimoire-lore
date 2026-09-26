#!/bin/sh
# Lockfile behaviour under Conan 2.32.0: implicit pickup, strictness, --lockfile-partial.
S=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers
export CONAN_HOME=$S/conanhome
CN=$S/venv/bin/conan
cd $S/proj/lockapp
printf '[requires]\ntool/[>=1.0 <1.1]\n' > conanfile.txt
$CN lock create . --lockfile-out=conan.lock >/dev/null 2>&1
echo "--- lock contents:"; grep -o 'tool/1\.[01]' conan.lock
printf '[requires]\ntool/[>=1.0 <2]\n' > conanfile.txt
echo "--- widened range, no --lockfile flag (implicit pickup?):"; $CN install . 2>&1 | grep -e 'tool/1\.[01]#' | head -1
echo "--- widened range, --lockfile= disables:"; $CN install . --lockfile= 2>&1 | grep -e 'tool/1\.[01]#' | head -1
printf '[requires]\ntool/[>=1.0 <2]\npkgb/1.0\n' > conanfile.txt
echo "--- new requirement not in lock:"; $CN install . 2>&1 | grep -i -e error -e 'not in lockfile' | head -2; echo "exit (strict)"
echo "--- same with --lockfile-partial:"; $CN install . --lockfile=conan.lock --lockfile-partial >/dev/null 2>&1; echo "exit $?"
