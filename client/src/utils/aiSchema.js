// utils/aiSchema.js
// Purpose: Validate/normalize AI JSON; keep fields safe and bounded.
// Why: Model may return extra fields or long strings—normalize before UI.
export function normalizeAiResult(raw) {
  const safe = { insight: '', tips: [], encouragement: '' };
  if (!raw || typeof raw !== 'object') return safe;

  if (typeof raw.insight === 'string') {
    safe.insight = raw.insight.trim().slice(0, 600); // cap length to protect UI
  }
  if (Array.isArray(raw.tips)) {
    safe.tips = raw.tips
      .filter(t => typeof t === 'string' && t.trim())
      .slice(0, 5)                      // keep at most 5 tips
      .map(t => t.trim().slice(0, 140)); // 140 chars per tip for readability
  }
  if (typeof raw.encouragement === 'string') {
    safe.encouragement = raw.encouragement.trim().slice(0, 200);
  }
  return safe;
}
