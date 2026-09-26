#include "widget.h"
static int table[4] = {1, 2, 3, 4};
int widget_value(void) { return table[0] + table[3]; }
int *widget_table_ptr(void) { return table; }
