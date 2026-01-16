// src/utils/resolveStateKeyFromEntry.js
import { STATE_META, emotionToStateKey } from '../data/stateMeta';

const STATE_KEYS = new Set(Object.keys(STATE_META || {}));

/**
 * Resolve a stable `stateKey` for any history row, including older rows that
 * stored an emotion key (e.g. "joy").
 */
export function resolveStateKeyFromEntry(entry) {
  const raw =
    entry?.dominantStateKey ??
    entry?.dominantGroup ??
    entry?.session?.l3?.stateKey ??
    entry?.session?.l3?.emotionKey ??
    '';

  const k = String(raw || '').toLowerCase().trim();
  if (!k) return 'mixed';

  if (STATE_KEYS.has(k)) return k;

  // Backward compatibility: older rows used emotion keys.
  return emotionToStateKey(k);
}
