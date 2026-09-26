S=$1
echo "== methods.py 95-120"; sed -n 95,120p $S/conan/internal/methods.py
echo "== methods.py 155-170"; sed -n 155,170p $S/conan/internal/methods.py
echo "== compute_pid 100-115"; sed -n 100,115p $S/conan/internal/graph/compute_pid.py
echo "== generators.py 35-42"; sed -n 35,42p $S/conan/internal/api/install/generators.py
echo "== cpp_info 90-100"; sed -n 90,100p $S/conan/internal/model/cpp_info.py
echo "== info.py header_only/clear"; grep -n -e 'def clear' -e header_only $S/conan/internal/model/info.py
echo "== conans/__init__ size"; wc -c $S/conans/__init__.py
echo "== presets 300-315"; sed -n 300,315p $S/conan/tools/cmake/presets.py
echo "== get() sha"; grep -n -e 'def get(' -e 'sha256' $S/conan/tools/files/files.py | head -20
echo "== blocks watch"; grep -n -e variable_watch -e 'has been modified' $S/conan/tools/cmake/toolchain/blocks.py
