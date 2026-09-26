# conan-recipe-authoring scratch

Reproducible sample: `bash fetch_sample.sh` (edit CORPUS/SCR paths at the top)
fetches the 40 conanfile.py files listed in `sample40.txt` (recipe names) /
`sample_paths.txt` (recipe/version-dir paths) from
conan-io/conan-center-index@07389b8fa0 via `git show`, into `sample/`.
`bash tabulate.sh` prints the per-recipe boolean table used in the findings.

Sample selection: `git ls-tree HEAD:recipes` sorted, every 49th entry
(N = floor(1950/40) that yields exactly 40 rows), spread `7bitconf` .. `xxsds-sdsl-lite`.
