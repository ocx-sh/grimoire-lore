#include "mylib.hpp"

int public_api(void) { return internal_helper() + inline_helper(); }
int internal_helper(void) { return 35; }
