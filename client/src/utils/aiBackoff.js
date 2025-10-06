export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function withBackoff(fn, { retries = 2, baseMs = 700 } = {}) {
  let attempt = 0, lastErr;
  while (attempt <= retries) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (attempt === retries) break;
      await sleep(baseMs * Math.pow(2, attempt)); // 700 → 1400 → 2800
      attempt++;
    }
  }
  throw lastErr;
}

export async function withTimeout(promise, ms = 14000) {
  let to;
  const guard = new Promise((_, rej) => { to = setTimeout(() => rej(new Error('AI request timed out')), ms); });
  try { return await Promise.race([promise, guard]); }
  finally { clearTimeout(to); }
}
