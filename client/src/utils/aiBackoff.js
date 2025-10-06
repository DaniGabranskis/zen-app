// utils/aiBackoff.js
// Purpose: Provide exponential backoff and request timeout utilities.
// Why: Network/AI can be flaky; we retry and cap total wait.
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function withBackoff(fn, { retries = 2, baseMs = 700 } = {}) {
  // retries=2 → attempt 1 (0ms), 2 (700ms), 3 (1400ms) between calls
  let attempt = 0, lastErr;
  while (attempt <= retries) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (attempt === retries) break;             // stop after final attempt
      await sleep(baseMs * Math.pow(2, attempt)); // exponential wait
      attempt;
    }
  }
  throw lastErr; // bubble error to caller after all attempts
}

export async function withTimeout(promise, ms = 14000) {
  // ms=14s → defensive cap on API waiting time
  let to;
  const guard = new Promise((_, rej) => { to = setTimeout(() => rej(new Error('AI request timed out')), ms); });
  try { return await Promise.race([promise, guard]); }
  finally { clearTimeout(to); } // cleanup timer to avoid leaks
}
