extern int stat_fn(int i);
int shared_fn(void) { return stat_fn(3); }
