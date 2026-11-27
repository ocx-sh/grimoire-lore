fn report(n: usize) -> String {
    let word = if n == 1 { "file" } else { "files" };
    format!("{} {} removed ({} file(s) total)", n, word, n)
}
