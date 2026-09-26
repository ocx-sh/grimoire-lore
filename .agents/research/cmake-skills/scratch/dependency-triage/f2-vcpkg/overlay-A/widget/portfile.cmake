set(VCPKG_BUILD_TYPE release)
file(WRITE "${CURRENT_PACKAGES_DIR}/share/widget/widgetConfig.cmake" "message(STATUS \"widget: resolved copy = A\")\nadd_library(widget INTERFACE IMPORTED)\nadd_library(widget::widget ALIAS widget)\n")
vcpkg_install_copyright(FILE_LIST "${CMAKE_CURRENT_LIST_DIR}/vcpkg.json")
set(VCPKG_POLICY_EMPTY_INCLUDE_FOLDER enabled)
