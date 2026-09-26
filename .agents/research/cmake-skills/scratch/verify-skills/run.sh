#!/bin/sh
# Verify wave 3 for cmake-skills.md (2026-09-26). Run from the worktree root:
#   sh <this dir>/run.sh <this dir> <build root on disk, never /tmp>
# Prints one line per measurement: tag, exit code, first diagnostic.
S=$1; B=$2; mkdir -p "$B/logs"
run() { v=$1; tag=$2; shift 2
  ocx package exec "kitware/cmake:$v" -- cmake --fresh "$@" > "$B/logs/$tag.log" 2>&1; rc=$?
  printf '%-22s rc=%s  %s\n' "$tag" "$rc" "$(grep -m1 -e 'CMake Error' -e 'CMake Deprecation' -e 'not used' "$B/logs/$tag.log" | cut -c1-60)"; }
D37=$S/dep37; D37R=$S/dep37r; D34=$S/dep34
# CMK-DEP-30: 3.x remedies and bypasses under the gate
run 3.31 base          -S "$S/app" -B "$B/a1" -Werror=dev -DDEP="$D37"
run 3.31 wnoerrdep-a   -S "$S/app" -B "$B/a2" -Werror=dev -Wno-error=deprecated -DDEP="$D37"
run 3.31 wnoerrdep-b   -S "$S/app" -B "$B/a3" -Wno-error=deprecated -Werror=dev -DDEP="$D37"
run 3.31 warndepoff    -S "$S/app" -B "$B/a4" -Werror=dev -DCMAKE_WARN_DEPRECATED=OFF -DDEP="$D37"
run 3.31 own-warndepoff -S "$S/app" -B "$B/a5" -Werror=dev -DCMAKE_WARN_DEPRECATED=OFF -DOWN=ON
run 3.31 wnodev-a      -S "$S/app" -B "$B/a6" -Werror=dev -Wno-dev -DDEP="$D37"
run 3.31 wnodev-b      -S "$S/app" -B "$B/a7" -Wno-dev -Werror=dev -DDEP="$D37"
run 3.31 wnodep-a      -S "$S/app" -B "$B/a8" -Werror=dev -Wno-deprecated -DDEP="$D37"
run 3.31 wnodep-b      -S "$S/app" -B "$B/a9" -Wno-deprecated -Werror=dev -DDEP="$D37"
run 3.31 wnodep-own    -S "$S/app" -B "$B/a10" -Werror=dev -Wno-deprecated -DOWN=ON
run 3.31 range         -S "$S/app" -B "$B/a11" -Werror=dev -DDEP="$D37R"
run 3.31 pvm-ignored   -S "$S/app" -B "$B/a12" -Werror=dev -DCMAKE_POLICY_VERSION_MINIMUM=3.10
run 4.3 base43         -S "$S/app" -B "$B/a13" -Werror=dev -DDEP="$D37"
run 4.3 range43        -S "$S/app" -B "$B/a14" -Werror=dev -DDEP="$D37R"
run 4.3 wnodep43       -S "$S/app" -B "$B/a15" -Werror=dev -Wno-deprecated -DDEP="$D37"
run 4.4 base44         -S "$S/app" -B "$B/a16" -Werror=author -DDEP="$D37"
run 4.4 range44        -S "$S/app" -B "$B/a17" -Werror=author -DDEP="$D37R"
run 4.4 wnodep44-a     -S "$S/app" -B "$B/a18" -Werror=author -Wno-deprecated -DDEP="$D37"
run 4.4 wnodep44-b     -S "$S/app" -B "$B/a19" -Wno-deprecated -Werror=author -DDEP="$D37"
run 4.4 wnoerrdep44    -S "$S/app" -B "$B/a20" -Werror=author -Wno-error=deprecated -DDEP="$D37"
run 4.4 warndepoff44   -S "$S/app" -B "$B/a21" -Werror=author -DCMAKE_WARN_DEPRECATED=OFF -DDEP="$D37"
run 4.4 dep34          -S "$S/app" -B "$B/a22" -Werror=author -DDEP="$D34"
run 4.4 pvm35          -S "$S/app5" -B "$B/a23" -Werror=author -DDEP="$D34" -DPVM=3.5
run 4.4 pvm310         -S "$S/app5" -B "$B/a24" -Werror=author -DDEP="$D37" -DPVM=3.10
# Preset warnings.deprecated=false (presets hold absolute paths: regenerate them)
mkdir -p "$B/apppre"; cp "$S/app/CMakeLists.txt" "$B/apppre/"
printf '{"version": 3, "configurePresets": [{"name": "nodep", "binaryDir": "%s/pre", "cacheVariables": {"DEP": "%s"}, "warnings": {"deprecated": false}}]}\n' "$B" "$D37" > "$B/apppre/CMakePresets.json"
(cd "$B/apppre" && ocx package exec kitware/cmake:3.31 -- cmake --fresh --preset nodep -Werror=dev > "$B/logs/preset331.log" 2>&1; echo "preset-nodep-3.31     rc=$?")
(cd "$B/apppre" && ocx package exec kitware/cmake:4.4 -- cmake --fresh --preset nodep -Werror=author > "$B/logs/preset44.log" 2>&1; echo "preset-nodep-4.4      rc=$?")
# CMK-DEP-31 (M-O): SOURCE_DIR patches in place; the override skips the patch
mkdir -p "$B/mo/dep" "$B/mo/pristine" "$B/mo/a" "$B/mo/b"
cp "$D37/CMakeLists.txt" "$B/mo/dep/"; cp "$D37/CMakeLists.txt" "$B/mo/pristine/"
(cd "$B/mo/dep" && git init -q && git add . && git -c user.email=x@x -c user.name=x commit -qm init)
sed -e "s|@PRISTINE@|$B/mo/pristine|" "$S/mo/a.CMakeLists.txt.in" > "$B/mo/a/CMakeLists.txt"
sed -e "s|@DEP@|$B/mo/dep|" "$S/mo/b.CMakeLists.txt.in" > "$B/mo/b/CMakeLists.txt"
for v in 3.31 4.3 4.4; do G=-Werror=dev; [ "$v" = 4.4 ] && G=-Werror=author
  run "$v" "mo-srcdir-$v" -S "$B/mo/a" -B "$B/mo-a-$v" "$G"
  run "$v" "mo-git-$v" -S "$B/mo/b" -B "$B/mo-b-$v" "$G"
  run "$v" "mo-override-$v" -S "$B/mo/b" -B "$B/mo-o-$v" "$G" -DFETCHCONTENT_SOURCE_DIR_OLD37="$B/mo/pristine"
done
# F1/F2 (CMK-DEP-17, -32): override tell, stale _DIR, -L blindness, configure-log events
for p in A B; do ocx package exec kitware/cmake:4.4 -- cmake --fresh -S "$S/pkgsrc" -B "$B/pkg$p" -DCMAKE_INSTALL_PREFIX="$B/inst$p" > /dev/null
  ocx package exec kitware/cmake:4.4 -- cmake --install "$B/pkg$p" > /dev/null; done
for v in 3.31 4.4; do
  run "$v" "f1-$v" -S "$S/f1" -B "$B/f1-$v" -DFETCHED="$S/fetched" -DCMAKE_PREFIX_PATH="$B/instA" --debug-find-pkg=dep
  NAME=dep; grep -rn --include='CMakeCache.txt' -e "^${NAME}_DIR" "$B/f1-$v"
  run "$v" "f2a-$v" -S "$S/f2" -B "$B/f2-$v" -Ddep_ROOT="$B/instA"
  ocx package exec "kitware/cmake:$v" -- cmake -S "$S/f2" -B "$B/f2-$v" -Ddep_ROOT="$B/instB" --debug-find-pkg=dep > "$B/logs/f2b-$v.log" 2>&1
  echo "f2 reuse $v: $(grep 'dep_DIR=' "$B/logs/f2b-$v.log")  debug names instB: $(grep -c instB "$B/logs/f2b-$v.log")"
  echo "cmake -L lists dep_ROOT: $(ocx package exec "kitware/cmake:$v" -- cmake -L -N -B "$B/f2-$v" 2>/dev/null | grep -c dep_ROOT)"
  echo "find_package-v1 events: $(grep -rc --include='CMakeConfigureLog.yaml' -e 'kind: "find_package-v1"' "$B/f2-$v")"
done
# CPS preference on >=4.3
for v in 4.3 4.4; do
  ocx package exec "kitware/cmake:$v" -- cmake --fresh -S "$S/pkgsrc" -B "$B/pkgC-$v" -DCPS=ON -DCMAKE_INSTALL_PREFIX="$B/instC-$v" > /dev/null
  ocx package exec "kitware/cmake:$v" -- cmake --install "$B/pkgC-$v" > /dev/null
  ocx package exec "kitware/cmake:$v" -- cmake --fresh -S "$S/f2" -B "$B/f2C-$v" -DCMAKE_PREFIX_PATH="$B/instC-$v" | grep 'dep_DIR='
done
# T2: --trace-source=CMakeLists.txt misses a declare in a module file
run 4.4 trace-mod -S "$S/f1mod" -B "$B/f1mod" -DFETCHED="$S/fetched" --trace-expand --trace-source=CMakeLists.txt
echo "declare lines traced: $(grep -c FetchContent_Declare "$B/logs/trace-mod.log")"
# Step 7 smoke, clean and leaking library
for v in 3.31 4.4; do for L in lib-clean lib-leak; do echo "smoke $v $L"; sh "$S/smoke.sh" "$v" "$S/$L" "$B/smoke-$v-$L"; done; done
ocx package exec kitware/cmake:4.4 -- cmake --build . --target help --directory "$B/smoke-4.4-lib-leak/asub-build" 2>&1 | head -1
