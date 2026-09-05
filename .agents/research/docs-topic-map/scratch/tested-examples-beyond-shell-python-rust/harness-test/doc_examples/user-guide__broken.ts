// doc: user-guide/broken
// title: Deliberately broken example
const n: number = 42
if (n !== 42) {
  throw new Error("should not happen")
}
console.log("fixed:", n)
