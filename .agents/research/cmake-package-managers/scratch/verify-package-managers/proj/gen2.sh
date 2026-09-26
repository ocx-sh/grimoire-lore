#!/bin/sh
S=/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers
export CONAN_HOME=$S/conanhome
CN=$S/venv/bin/conan
cd $S/proj
$CN create pkgc >/dev/null 2>&1
printf '[requires]\npkgc/1.0\n[generators]\nCMakeDeps\nCMakeConfigDeps\n' > findmod/conanfile.txt
printf '[requires]\npkgc/1.0\n[generators]\nCMakeDeps\n' > findmod/a.txt
printf '[requires]\npkgc/1.0\n[generators]\nCMakeConfigDeps\n' > findmod/b.txt
$CN install findmod/a.txt -of findmod/oa >/dev/null 2>&1; echo "--- CMakeDeps, find_mode both:"; ls findmod/oa | grep -i gamma
$CN install findmod/b.txt -of findmod/ob >/dev/null 2>&1; echo "--- CMakeConfigDeps, find_mode both:"; ls findmod/ob | grep -i gamma
for d in fresh hand; do $CN install presets/$d >/dev/null 2>&1; echo "--- $d CMakeUserPresets.json:"; cat presets/$d/CMakeUserPresets.json; echo; ls presets/$d/build/Release/generators 2>/dev/null | grep -i presets; done
