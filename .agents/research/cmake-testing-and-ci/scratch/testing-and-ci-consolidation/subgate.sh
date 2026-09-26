#!/usr/bin/env bash
# As-subproject smoke: a consumer with include(CTest) adds two libraries.
# libbt guards its tests on BUILD_TESTING alone; libtop on an option that
# defaults to PROJECT_IS_TOP_LEVEL. Expected on 3.31.12 and 4.4.2:
# consumer ctest -N lists consumer_t and libbt_t only; libtop standalone lists 1.
set -u
SRC=${SRC:-$(dirname "$0")/src/subgate}
S=${S:-/home/mherwig/.cache/cmake-measure-scratch/testing-and-ci-consolidation}
for v in 3.31 4.4; do
  X="ocx package exec kitware/cmake:$v --"
  $X cmake --fresh -S "$SRC/consumer" -B "$S/build-subgate-$v" >/dev/null 2>&1
  echo "$v consumer: $($X ctest --test-dir "$S/build-subgate-$v" -N | grep -e 'Test *#' | tr -s ' ' | tr '\n' ' ')"
  $X cmake --fresh -S "$SRC/libtop" -B "$S/build-subgate-top-$v" >/dev/null 2>&1
  echo "$v libtop standalone: $($X ctest --test-dir "$S/build-subgate-top-$v" -N | grep -e 'Total')"
done
