#include <stdio.h>
static const char *table[10] = {"a","b","c","d","e","f","g","h","i","j"};
int stat_fn(int i) { return puts(table[i % 10]); }
