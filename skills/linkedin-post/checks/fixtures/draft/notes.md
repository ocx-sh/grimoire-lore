# mytool 0.9.0

- Fix: the resolver no longer re-downloads packages whose digest is already cached on disk.
- Change: the cache key excludes the build timestamp.
- Deprecate: the legacy flag for offline installs will be removed in the next minor release.
