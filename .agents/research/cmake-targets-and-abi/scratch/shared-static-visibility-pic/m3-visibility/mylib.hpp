#pragma once
#include "mylib_export.h"

MYLIB_EXPORT int public_api(void);
int internal_helper(void);

inline int inline_helper(void) { return 7; }
