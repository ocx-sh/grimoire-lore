#!/usr/bin/env bash
# Corpus-wide grep -c sums for axes 2-9. Emits a flat TSV metric<TAB>count<TAB>command
set -uo pipefail
SCRATCH=/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/.agents/research/cmake-audit/scratch
FILES="$SCRATCH/all-cmake-files.txt"
OUT="$SCRATCH/corpus-counts.tsv"
: > "$OUT"

count_lines() { # regex -> total matching LINES across all files (sum of grep -c, extended regex)
  xargs command grep -cE "$1" < "$FILES" 2>/dev/null | awk -F: '{s+=$2} END{print s+0}'
}
count_files() { # regex -> number of FILES with >=1 match
  xargs command grep -lE "$1" < "$FILES" 2>/dev/null | wc -l
}
count_occ() { # regex -> total occurrences (-o) across all files
  xargs command grep -hoE "$1" < "$FILES" 2>/dev/null | wc -l
}

emit() { echo -e "$1\t$2\t$3" >> "$OUT"; }

# --- Axis 2: project declaration ---
emit "project_with_VERSION" "$(count_occ 'project\([^)]*VERSION')" "grep -hoE 'project\([^)]*VERSION' over all-cmake-files"
emit "project_with_LANGUAGES" "$(count_occ 'project\([^)]*LANGUAGES')" "grep -hoE 'project\([^)]*LANGUAGES'"
emit "project_with_DESCRIPTION" "$(count_occ 'project\([^)]*DESCRIPTION')" "grep -hoE 'project\([^)]*DESCRIPTION'"
emit "project_with_HOMEPAGE_URL" "$(count_occ 'project\([^)]*HOMEPAGE_URL')" "grep -hoE 'project\([^)]*HOMEPAGE_URL'"
emit "PROJECT_IS_TOP_LEVEL_uses" "$(count_occ 'PROJECT_IS_TOP_LEVEL')" "grep -hoE 'PROJECT_IS_TOP_LEVEL'"
emit "CMAKE_SOURCE_DIR_STREQUAL_CURRENT_guard" "$(count_occ 'CMAKE_SOURCE_DIR[[:space:]]+STREQUAL[[:space:]]+CMAKE_CURRENT_SOURCE_DIR')" "grep -hoE 'CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR'"
emit "include_CTest" "$(count_occ 'include\([[:space:]]*CTest')" "grep -hoE 'include\(CTest'"
emit "enable_testing_calls" "$(count_occ 'enable_testing[[:space:]]*\(')" "grep -hoE 'enable_testing\('"
emit "BUILD_TESTING_refs" "$(count_occ 'BUILD_TESTING')" "grep -hoE 'BUILD_TESTING'"

# --- Axis 3: language standard ---
emit "CMAKE_CXX_STANDARD_set" "$(count_occ 'set\([[:space:]]*CMAKE_CXX_STANDARD')" "grep -hoE 'set\\(CMAKE_CXX_STANDARD'"
emit "target_compile_features_cxx_std" "$(count_occ 'target_compile_features\([^)]*cxx_std_[0-9]+')" "grep -hoE 'target_compile_features\\([^)]*cxx_std_[0-9]+'"
emit "CMAKE_CXX_EXTENSIONS_OFF" "$(count_occ 'CMAKE_CXX_EXTENSIONS[[:space:]]+OFF')" "grep -hoE 'CMAKE_CXX_EXTENSIONS OFF'"
emit "CMAKE_CXX_STANDARD_REQUIRED_ON" "$(count_occ 'CMAKE_CXX_STANDARD_REQUIRED[[:space:]]+ON')" "grep -hoE 'CMAKE_CXX_STANDARD_REQUIRED ON'"
emit "CMAKE_C_STANDARD_set" "$(count_occ 'set\([[:space:]]*CMAKE_C_STANDARD')" "grep -hoE 'set\\(CMAKE_C_STANDARD'"
emit "target_compile_features_c_std" "$(count_occ 'target_compile_features\([^)]*c_std_[0-9]+')" "grep -hoE 'target_compile_features\\([^)]*c_std_[0-9]+'"

# --- Axis 4: target vs directory-based ---
emit "include_directories_calls" "$(count_occ '(^|[^_a-zA-Z])include_directories[[:space:]]*\(')" "grep -hoE '(^|[^_a-zA-Z])include_directories\\('"
emit "target_include_directories_calls" "$(count_occ 'target_include_directories[[:space:]]*\(')" "grep -hoE 'target_include_directories\\('"
emit "add_definitions_calls" "$(count_occ '(^|[^_a-zA-Z])add_definitions[[:space:]]*\(')" "grep -hoE '(^|[^_a-zA-Z])add_definitions\\('"
emit "target_compile_definitions_calls" "$(count_occ 'target_compile_definitions[[:space:]]*\(')" "grep -hoE 'target_compile_definitions\\('"
emit "add_compile_options_calls" "$(count_occ '(^|[^_a-zA-Z])add_compile_options[[:space:]]*\(')" "grep -hoE '(^|[^_a-zA-Z])add_compile_options\\('"
emit "target_compile_options_calls" "$(count_occ 'target_compile_options[[:space:]]*\(')" "grep -hoE 'target_compile_options\\('"
emit "link_directories_calls" "$(count_occ '(^|[^_a-zA-Z])link_directories[[:space:]]*\(')" "grep -hoE '(^|[^_a-zA-Z])link_directories\\('"
emit "link_libraries_calls" "$(count_occ '(^|[^_a-zA-Z])link_libraries[[:space:]]*\(')" "grep -hoE '(^|[^_a-zA-Z])link_libraries\\('"
emit "CMAKE_CXX_FLAGS_set_mutation" "$(count_occ 'set\([[:space:]]*CMAKE_CXX_FLAGS')" "grep -hoE 'set\\(CMAKE_CXX_FLAGS'"
emit "CMAKE_CXX_FLAGS_string_append" "$(count_occ 'string\(APPEND[[:space:]]+CMAKE_CXX_FLAGS')" "grep -hoE 'string\\(APPEND CMAKE_CXX_FLAGS'"
emit "target_link_libraries_with_keyword" "$(count_occ 'target_link_libraries\([^)]*(PUBLIC|PRIVATE|INTERFACE)')" "grep -hoE 'target_link_libraries\\([^)]*(PUBLIC|PRIVATE|INTERFACE)'"
emit "target_link_libraries_total_calls" "$(count_occ 'target_link_libraries[[:space:]]*\(')" "grep -hoE 'target_link_libraries\\('"
emit "add_library_STATIC" "$(count_occ 'add_library\([^)]*[[:space:]]STATIC')" "grep -hoE 'add_library\\([^)]*STATIC'"
emit "add_library_SHARED" "$(count_occ 'add_library\([^)]*[[:space:]]SHARED')" "grep -hoE 'add_library\\([^)]*SHARED'"
emit "add_library_MODULE" "$(count_occ 'add_library\([^)]*[[:space:]]MODULE')" "grep -hoE 'add_library\\([^)]*MODULE'"
emit "add_library_OBJECT" "$(count_occ 'add_library\([^)]*[[:space:]]OBJECT')" "grep -hoE 'add_library\\([^)]*OBJECT'"
emit "add_library_INTERFACE" "$(count_occ 'add_library\([^)]*[[:space:]]INTERFACE')" "grep -hoE 'add_library\\([^)]*INTERFACE'"
emit "add_library_ALIAS" "$(count_occ 'add_library\([^)]*[[:space:]]ALIAS')" "grep -hoE 'add_library\\([^)]*ALIAS'"
emit "add_library_total_calls" "$(count_occ '(^|[^_a-zA-Z])add_library[[:space:]]*\(')" "grep -hoE '(^|[^_a-zA-Z])add_library\\('"
emit "add_library_ALIAS_namespaced" "$(count_occ 'add_library\([A-Za-z0-9_]+::[A-Za-z0-9_]+[[:space:]]+ALIAS')" "grep -hoE 'add_library\\([A-Za-z0-9_]+::[A-Za-z0-9_]+ ALIAS'"
emit "add_executable_calls" "$(count_occ '(^|[^_a-zA-Z])add_executable[[:space:]]*\(')" "grep -hoE '(^|[^_a-zA-Z])add_executable\\('"
emit "BUILD_SHARED_LIBS_refs" "$(count_occ 'BUILD_SHARED_LIBS')" "grep -hoE 'BUILD_SHARED_LIBS'"
emit "genexpr_dollar_angle_occurrences" "$(count_occ '\$<')" "grep -hoE '\$<'"

# --- Axis 5: sources ---
emit "file_GLOB_plain" "$(count_occ 'file\([[:space:]]*GLOB[[:space:]]')" "grep -hoE 'file\\(GLOB '"
emit "file_GLOB_RECURSE" "$(count_occ 'file\([[:space:]]*GLOB_RECURSE')" "grep -hoE 'file\\(GLOB_RECURSE'"
emit "file_GLOB_with_CONFIGURE_DEPENDS" "$(count_occ 'file\([[:space:]]*GLOB[A-Z_]*[^)]*CONFIGURE_DEPENDS')" "grep -hoE 'file\\(GLOB[A-Z_]*[^)]*CONFIGURE_DEPENDS'"
emit "target_sources_calls" "$(count_occ 'target_sources[[:space:]]*\(')" "grep -hoE 'target_sources\\('"
emit "target_sources_FILE_SET" "$(count_occ 'target_sources\([^)]*FILE_SET')" "grep -hoE 'target_sources\\([^)]*FILE_SET' (single-line only)"
emit "FILE_SET_HEADERS" "$(count_occ 'FILE_SET[[:space:]]+[A-Za-z0-9_]+[[:space:]]+TYPE[[:space:]]+HEADERS|FILE_SET[[:space:]]+HEADERS')" "grep -hoE 'FILE_SET ... HEADERS'"
emit "FILE_SET_CXX_MODULES" "$(count_occ 'CXX_MODULES')" "grep -hoE 'CXX_MODULES'"
emit "CMAKE_CXX_SCAN_FOR_MODULES" "$(count_occ 'CMAKE_CXX_SCAN_FOR_MODULES')" "grep -hoE 'CMAKE_CXX_SCAN_FOR_MODULES'"
emit "import_std_uses" "$(count_occ 'import[[:space:]]+std;|import[[:space:]]+std[[:space:]]*\$|CMAKE_CXX_MODULE_STD')" "grep -hoE 'import std / CMAKE_CXX_MODULE_STD'"
emit "CMAKE_EXPERIMENTAL_CXX_IMPORT_STD" "$(count_occ 'CMAKE_EXPERIMENTAL_CXX_IMPORT_STD')" "grep -hoE 'CMAKE_EXPERIMENTAL_CXX_IMPORT_STD'"

# --- Axis 6: options/cache ---
emit "option_calls" "$(count_occ '(^|[^_a-zA-Z])option[[:space:]]*\([[:space:]]*[A-Za-z0-9_]+')" "grep -hoE '(^|[^_a-zA-Z])option\\([[:space:]]*[A-Za-z0-9_]+'"
emit "CMAKE_DEPENDENT_OPTION_uses" "$(count_occ 'cmake_dependent_option[[:space:]]*\(')" "grep -hoE 'cmake_dependent_option\\('"
emit "set_CACHE_FORCE" "$(count_occ 'set\([^)]*CACHE[^)]*FORCE')" "grep -hoE 'set\\([^)]*CACHE[^)]*FORCE' (single-line)"
emit "unset_CACHE" "$(count_occ 'unset\([^)]*CACHE')" "grep -hoE 'unset\\([^)]*CACHE'"
emit "mark_as_advanced_calls" "$(count_occ 'mark_as_advanced[[:space:]]*\(')" "grep -hoE 'mark_as_advanced\\('"

# --- Axis 7: functions/macros ---
emit "function_defs" "$(count_occ '(^|[^_a-zA-Z])function[[:space:]]*\([[:space:]]*[A-Za-z0-9_]+')" "grep -hoE '(^|[^_a-zA-Z])function\\([[:space:]]*[A-Za-z0-9_]+'"
emit "macro_defs" "$(count_occ '(^|[^_a-zA-Z])macro[[:space:]]*\([[:space:]]*[A-Za-z0-9_]+')" "grep -hoE '(^|[^_a-zA-Z])macro\\([[:space:]]*[A-Za-z0-9_]+'"
emit "cmake_parse_arguments_PARSE_ARGV" "$(count_occ 'cmake_parse_arguments\([[:space:]]*PARSE_ARGV')" "grep -hoE 'cmake_parse_arguments\\(PARSE_ARGV'"
emit "cmake_parse_arguments_ARGN" "$(count_occ 'cmake_parse_arguments\([^)]*ARGN')" "grep -hoE 'cmake_parse_arguments\\([^)]*ARGN' (single-line)"
emit "PARENT_SCOPE_uses" "$(count_occ 'PARENT_SCOPE')" "grep -hoE 'PARENT_SCOPE'"
emit "set_property_GLOBAL_PROPERTY" "$(count_occ 'set_property\([[:space:]]*GLOBAL[[:space:]]+PROPERTY')" "grep -hoE 'set_property\\(GLOBAL PROPERTY'"
emit "block_calls" "$(count_occ '(^|[^_a-zA-Z])block[[:space:]]*\(')" "grep -hoE '(^|[^_a-zA-Z])block\\('"
emit "include_guard_calls" "$(count_occ 'include_guard[[:space:]]*\(')" "grep -hoE 'include_guard\\('"
emit "message_FATAL_ERROR" "$(count_occ 'message\([[:space:]]*FATAL_ERROR')" "grep -hoE 'message\\(FATAL_ERROR'"
emit "message_SEND_ERROR" "$(count_occ 'message\([[:space:]]*SEND_ERROR')" "grep -hoE 'message\\(SEND_ERROR'"
emit "message_WARNING" "$(count_occ 'message\([[:space:]]*WARNING')" "grep -hoE 'message\\(WARNING'"
emit "message_AUTHOR_WARNING" "$(count_occ 'message\([[:space:]]*AUTHOR_WARNING')" "grep -hoE 'message\\(AUTHOR_WARNING'"
emit "message_DEPRECATION" "$(count_occ 'message\([[:space:]]*DEPRECATION')" "grep -hoE 'message\\(DEPRECATION'"
emit "CMAKE_MESSAGE_CONTEXT_uses" "$(count_occ 'CMAKE_MESSAGE_CONTEXT')" "grep -hoE 'CMAKE_MESSAGE_CONTEXT'"

# --- Axis 8: install/export ---
emit "install_TARGETS_EXPORT" "$(count_occ 'install\([^)]*TARGETS[^)]*EXPORT')" "grep -hoE 'install\\([^)]*TARGETS[^)]*EXPORT' (single-line)"
emit "install_EXPORT_calls" "$(count_occ 'install\([[:space:]]*EXPORT')" "grep -hoE 'install\\(EXPORT'"
emit "install_FILES_calls" "$(count_occ 'install\([[:space:]]*FILES')" "grep -hoE 'install\\(FILES'"
emit "install_DIRECTORY_calls" "$(count_occ 'install\([[:space:]]*DIRECTORY')" "grep -hoE 'install\\(DIRECTORY'"
emit "export_EXPORT_or_TARGETS" "$(count_occ '(^|[^_a-zA-Z])export\([[:space:]]*(EXPORT|TARGETS)')" "grep -hoE 'export\\((EXPORT|TARGETS)'"
emit "include_GNUInstallDirs" "$(count_occ 'include\([[:space:]]*GNUInstallDirs')" "grep -hoE 'include\\(GNUInstallDirs'"
emit "include_CMakePackageConfigHelpers" "$(count_occ 'include\([[:space:]]*CMakePackageConfigHelpers')" "grep -hoE 'include\\(CMakePackageConfigHelpers'"
emit "configure_package_config_file_calls" "$(count_occ 'configure_package_config_file[[:space:]]*\(')" "grep -hoE 'configure_package_config_file\\('"
emit "write_basic_package_version_file_calls" "$(count_occ 'write_basic_package_version_file[[:space:]]*\(')" "grep -hoE 'write_basic_package_version_file\\('"
emit "install_PACKAGE_INFO_CPS" "$(count_occ 'install\([[:space:]]*PACKAGE_INFO')" "grep -hoE 'install\\(PACKAGE_INFO'"
emit "install_EXPORT_with_NAMESPACE" "$(count_occ 'NAMESPACE[[:space:]]+[A-Za-z0-9_]+::')" "grep -hoE 'NAMESPACE [A-Za-z0-9_]+::'"
emit "CMAKE_INSTALL_RPATH_refs" "$(count_occ 'CMAKE_INSTALL_RPATH')" "grep -hoE 'CMAKE_INSTALL_RPATH'"
emit "CMAKE_BUILD_RPATH_refs" "$(count_occ 'CMAKE_BUILD_RPATH')" "grep -hoE 'CMAKE_BUILD_RPATH'"
emit "INSTALL_RPATH_USE_LINK_PATH_refs" "$(count_occ 'INSTALL_RPATH_USE_LINK_PATH')" "grep -hoE 'INSTALL_RPATH_USE_LINK_PATH'"
emit "CMAKE_MACOSX_RPATH_refs" "$(count_occ 'CMAKE_MACOSX_RPATH')" "grep -hoE 'CMAKE_MACOSX_RPATH'"
emit "CMAKE_POSITION_INDEPENDENT_CODE_refs" "$(count_occ 'CMAKE_POSITION_INDEPENDENT_CODE')" "grep -hoE 'CMAKE_POSITION_INDEPENDENT_CODE'"
emit "GenerateExportHeader_includes" "$(count_occ 'include\([[:space:]]*GenerateExportHeader')" "grep -hoE 'include\\(GenerateExportHeader'"
emit "generate_export_header_calls" "$(count_occ 'generate_export_header[[:space:]]*\(')" "grep -hoE 'generate_export_header\\('"
emit "CMAKE_CXX_VISIBILITY_PRESET_refs" "$(count_occ 'CMAKE_CXX_VISIBILITY_PRESET')" "grep -hoE 'CMAKE_CXX_VISIBILITY_PRESET'"
emit "VISIBILITY_INLINES_HIDDEN_refs" "$(count_occ 'VISIBILITY_INLINES_HIDDEN')" "grep -hoE 'VISIBILITY_INLINES_HIDDEN'"
emit "WINDOWS_EXPORT_ALL_SYMBOLS_refs" "$(count_occ 'WINDOWS_EXPORT_ALL_SYMBOLS')" "grep -hoE 'WINDOWS_EXPORT_ALL_SYMBOLS'"
emit "CMAKE_MSVC_RUNTIME_LIBRARY_refs" "$(count_occ 'CMAKE_MSVC_RUNTIME_LIBRARY')" "grep -hoE 'CMAKE_MSVC_RUNTIME_LIBRARY'"
emit "CheckIPOSupported_includes" "$(count_occ 'CheckIPOSupported')" "grep -hoE 'CheckIPOSupported'"
emit "INTERPROCEDURAL_OPTIMIZATION_refs" "$(count_occ 'INTERPROCEDURAL_OPTIMIZATION')" "grep -hoE 'INTERPROCEDURAL_OPTIMIZATION'"
emit "CMAKE_LINK_LIBRARIES_ONLY_TARGETS_refs" "$(count_occ 'CMAKE_LINK_LIBRARIES_ONLY_TARGETS')" "grep -hoE 'CMAKE_LINK_LIBRARIES_ONLY_TARGETS'"
emit "CMAKE_COMPILE_WARNING_AS_ERROR_refs" "$(count_occ 'CMAKE_COMPILE_WARNING_AS_ERROR')" "grep -hoE 'CMAKE_COMPILE_WARNING_AS_ERROR'"
emit "Werror_literal_refs" "$(count_occ '\-Werror([^=]|$)')" "grep -hoE '\-Werror([^=]|\$)'"
emit "CMAKE_EXPORT_COMPILE_COMMANDS_refs" "$(count_occ 'CMAKE_EXPORT_COMPILE_COMMANDS')" "grep -hoE 'CMAKE_EXPORT_COMPILE_COMMANDS'"
emit "COMPILER_LAUNCHER_refs" "$(count_occ 'CMAKE_[A-Z]+_COMPILER_LAUNCHER')" "grep -hoE 'CMAKE_[A-Z]+_COMPILER_LAUNCHER'"
emit "CMAKE_UNITY_BUILD_refs" "$(count_occ 'CMAKE_UNITY_BUILD')" "grep -hoE 'CMAKE_UNITY_BUILD'"
emit "target_precompile_headers_calls" "$(count_occ 'target_precompile_headers[[:space:]]*\(')" "grep -hoE 'target_precompile_headers\\('"

# --- Axis 9: testing/packaging ---
emit "add_test_calls" "$(count_occ '(^|[^_a-zA-Z])add_test[[:space:]]*\(')" "grep -hoE '(^|[^_a-zA-Z])add_test\\('"
emit "gtest_discover_tests_calls" "$(count_occ 'gtest_discover_tests[[:space:]]*\(')" "grep -hoE 'gtest_discover_tests\\('"
emit "catch_discover_tests_calls" "$(count_occ 'catch_discover_tests[[:space:]]*\(')" "grep -hoE 'catch_discover_tests\\('"
emit "doctest_discover_tests_calls" "$(count_occ 'doctest_discover_tests[[:space:]]*\(')" "grep -hoE 'doctest_discover_tests\\('"
emit "ctest_prop_TIMEOUT" "$(count_occ 'PROPERTIES[^)]*TIMEOUT|set_tests_properties[^)]*TIMEOUT')" "grep -hoE 'TIMEOUT property (approx, single-line)'"
emit "ctest_prop_LABELS" "$(count_occ 'LABELS[[:space:]]+[\"A-Za-z]')" "grep -hoE 'LABELS'"
emit "ctest_prop_WILL_FAIL" "$(count_occ 'WILL_FAIL')" "grep -hoE 'WILL_FAIL'"
emit "ctest_prop_ENVIRONMENT" "$(count_occ 'ENVIRONMENT[[:space:]]')" "grep -hoE 'ENVIRONMENT '"
emit "ctest_prop_WORKING_DIRECTORY" "$(count_occ 'WORKING_DIRECTORY')" "grep -hoE 'WORKING_DIRECTORY'"
emit "ctest_prop_FIXTURES" "$(count_occ 'FIXTURES_(SETUP|CLEANUP|REQUIRED)')" "grep -hoE 'FIXTURES_(SETUP|CLEANUP|REQUIRED)'"
emit "CPack_include" "$(count_occ 'include\([[:space:]]*CPack')" "grep -hoE 'include\\(CPack'"
emit "CPACK_variables" "$(count_occ 'CPACK_[A-Z_]+')" "grep -hoE 'CPACK_[A-Z_]+'"
emit "cmake_workflow_refs" "$(count_occ 'cmake --workflow|\"workflowPresets\"')" "grep -hoE 'cmake --workflow'"

echo "Wrote $OUT ($(wc -l < "$OUT") metrics)"
