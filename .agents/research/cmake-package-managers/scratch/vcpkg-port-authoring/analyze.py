import os, re, json, sys

OUT = "/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad"
SAMPLE = os.path.join(OUT, "sample_ports")

ports = sorted(os.listdir(SAMPLE))

deprecated = ["vcpkg_configure_cmake", "vcpkg_build_cmake", "vcpkg_install_cmake",
              "vcpkg_fixup_cmake_targets", "vcpkg_extract_source_archive_ex", "vcpkg_apply_patches"]
current = ["vcpkg_cmake_configure", "vcpkg_cmake_install", "vcpkg_cmake_config_fixup"]

rows = []
for p in ports:
    d = os.path.join(SAMPLE, p)
    pf_path = os.path.join(d, "portfile.cmake")
    if not os.path.isfile(pf_path):
        rows.append({"port": p, "no_portfile": True})
        continue
    pf = open(pf_path, encoding="utf-8", errors="replace").read()
    vj_path = os.path.join(d, "vcpkg.json")
    vj = open(vj_path, encoding="utf-8", errors="replace").read() if os.path.isfile(vj_path) else ""

    row = {"port": p}
    # vcpkg_from_github + SHA512
    m = re.search(r"vcpkg_from_github\s*\((.*?)\)\s*\n", pf, re.S)
    has_from_github = "vcpkg_from_github" in pf
    row["from_github"] = has_from_github
    sha_m = re.search(r"SHA512\s+([0-9a-fA-F]+)", pf)
    if sha_m:
        sha = sha_m.group(1)
        row["sha512_lower"] = sha == sha.lower()
    else:
        row["sha512_lower"] = None

    row["cur_helpers"] = [h for h in current if h in pf]
    row["dep_helpers"] = [h for h in deprecated if h in pf]

    row["options_dashD"] = bool(re.search(r"OPTIONS[\s\S]{0,400}?-D", pf))
    row["opt_msvc_runtime"] = "CMAKE_MSVC_RUNTIME_LIBRARY" in pf
    row["opt_pic"] = "CMAKE_POSITION_INDEPENDENT_CODE" in pf

    row["check_linkage"] = "vcpkg_check_linkage" in pf

    # unofficial-<port> config: look for a "unofficial-" string in portfile, or a template file
    row["unofficial_ref"] = "unofficial-" in pf
    row["unofficial_file"] = any("unofficial-" in fn for fn in os.listdir(d))

    row["usage_file"] = os.path.isfile(os.path.join(d, "usage"))

    row["policy_version_min"] = "CMAKE_POLICY_VERSION_MINIMUM" in pf
    row["policy_default_cmp"] = bool(re.search(r"CMAKE_POLICY_DEFAULT_CMP\d+", pf))

    row["copyright_helper"] = "vcpkg_install_copyright" in pf
    row["copyright_manual"] = bool(re.search(r"file\(INSTALL[\s\S]{0,200}?[Cc][Oo][Pp][Yy][Rr][Ii][Gg][Hh][Tt]|[Ll][Ii][Cc][Ee][Nn][Ss][Ee]", pf))

    pv_m = re.search(r'"port-version"\s*:\s*(\d+)', vj)
    row["port_version"] = int(pv_m.group(1)) if pv_m else 0

    rows.append(row)

for r in rows:
    print(json.dumps(r))
