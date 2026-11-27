Publish now takes --version; the --tag flag is removed.

### Added

- Add --quiet

### Changed

- **BREAKING:** Windows archives are named for the gnullvm target
  - **Migration:** Download the `-gnullvm` archive; the `-msvc` names are no longer published.

### Deprecated

- Deprecate the --mirror flag
  - **Migration:** Use `mytool index sync` instead; --mirror is removed in 0.9 or after 2027-03-01. See [the upgrade guide](https://example.com/docs/upgrading.md#mirror).

### Removed

- **BREAKING:** Remove the --tag flag
  - **Migration:** Use `mytool publish --version`; --tag is rejected.

### Fixed

- Fix the exit code of a failed publish ([#41](https://github.com/example/mytool/pull/41))
