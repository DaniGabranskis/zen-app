// Unified logger: JSON line + human-readable line.
export function logEvent(type, payload = {}, human = '') {
  try {
    const ts = new Date().toISOString();
    const packet = { ts, type, ...payload };
    console.log(`[EVT] ${JSON.stringify(packet)}`);         // JSON
    if (human) console.log(`[EVT::${type}] ${human}`);       // Human line
  } catch (e) {
    console.log('[EVT_ERROR]', e?.message || e);
  }
}
