// src/dev/runDevSeed.js
// One-shot seeding on app start. No UI.
// It reads src/dev/devSeed.config.json and src/dev/seed.payload.json (written by scripts/seed-history.mjs)
// and injects rows to the store if nonce wasn't applied before.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useStore from '../store/useStore';
import { seedHistoryCustom } from '../utils/seedStats';

// Safe JSON load: skip seeding if files are absent during dev
let devCfg = null;
let payload = null;
try {
  // Metro supports require() for JSON
  // If files are missing, we'll skip seeding gracefully.
  // eslint-disable-next-line import/no-commonjs, global-require
  devCfg = require('./devSeed.config.json');
  // eslint-disable-next-line import/no-commonjs, global-require
  payload = require('./seed.payload.json');
} catch (e) {
  // No seed files present — just skip silently
  devCfg = null;
  payload = null;
}

// map emotion name -> polarity groups you use across Stats
// keep in sync with your app's vocabulary
const POSITIVE = new Set(['Joy', 'Gratitude', 'Calm', 'Clarity']);
const NEGATIVE = new Set(['Anxious', 'Anger', 'Frustration', 'Sadness', 'Overload', 'Confusion', 'Disconnected']);

// optional sanity check to avoid inserting "Tiredness" only rows by accident
function looksTooSkewed(rows) {
  const pos = rows.filter(r => POSITIVE.has(r.emotion)).length;
  const neg = rows.filter(r => NEGATIVE.has(r.emotion)).length;
  return (pos + neg) > 12 && (pos === 0 || neg === 0);
}

export async function runDevSeedIfAny() {
  try {
    if (!devCfg || !payload) return;
    if (!devCfg.enabled) return;
    if (!Array.isArray(payload.rows) || payload.rows.length === 0) return;

    const key = 'dev_seed_nonce';
    const seen = await AsyncStorage.getItem(key);
    const already = seen && Number(seen) === Number(devCfg.nonce);
    if (already) return; // skip same seed

    // Optional: clear only once per new seed if you want a clean slate
    // useStore.getState().clearHistory?.();

    if (looksTooSkewed(payload.rows)) {
      console.log('[dev-seed] Proceeding with skewed data (OK for targeted tests).');
    }

    // Convert template rows into entries via seedHistoryCustom (keeps store shape intact)
    await seedHistoryCustom(payload.rows);

    await AsyncStorage.setItem(key, String(devCfg.nonce));
    console.log('[dev-seed] Applied seed nonce', devCfg.nonce, 'rows:', payload.rows.length);
  } catch (e) {
    console.warn('[dev-seed] failed:', e?.message || e);
  }
}
