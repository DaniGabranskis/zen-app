export function normalizeAiResult(raw) {
  const safe = { insight: '', tips: [], encouragement: '' };
  if (!raw || typeof raw !== 'object') return safe;

  if (typeof raw.insight === 'string') safe.insight = raw.insight.trim().slice(0, 600);
  if (Array.isArray(raw.tips)) {
    safe.tips = raw.tips
      .filter(t => typeof t === 'string' && t.trim())
      .slice(0, 5)
      .map(t => t.trim().slice(0, 140));
  }
  if (typeof raw.encouragement === 'string') safe.encouragement = raw.encouragement.trim().slice(0, 200);
  return safe;
}
