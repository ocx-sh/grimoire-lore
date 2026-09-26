#include "api.hpp"
int internal_helper(int x) { return x + 1; }
int api_fn(int x) { return internal_helper(header_inline(x)); }
