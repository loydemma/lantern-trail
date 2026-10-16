// Run a scene animation that reports completion via `done`, but never wait on it forever:
// if the scene stops rendering (scrolled off-screen) the step still finishes after `ms`.
// `finish` runs at most once. Call the returned function to cancel (e.g. on reset).
export function completeWithin(ms: number, run: (done: () => void) => void, finish: () => void): () => void {
  let settled = false
  const settle = () => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    finish()
  }
  const timer = setTimeout(settle, ms)
  run(settle)
  return () => {
    settled = true
    clearTimeout(timer)
  }
}
