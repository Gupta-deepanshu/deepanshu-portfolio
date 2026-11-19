/**
 * Run `fn` when the browser is idle (or after `timeout` ms at the latest). Used to
 * free WebGL contexts: dispose + forceContextLoss flush the GPU synchronously and
 * cost ~80 ms, which shows up as a dropped frame if it happens mid-scroll (the
 * budget releases a canvas exactly while you scroll away from it).
 */
export function whenIdle(fn: () => void, timeout = 2000) {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout });
  else window.setTimeout(fn, 200);
}
