// src/utils/insightGenerator.js
import { getStateMeta } from '../data/stateMeta';
import { resolveStateKeyFromEntry } from './resolveStateKeyFromEntry';

const DAY_MS = 24 * 60 * 60 * 1000;

function toTs(row) {
  const d = row?.createdAt || row?.date || 0;
  const ts = new Date(d).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function withinLastDays(rows, days) {
  const now = Date.now();
  const minTs = now - days * DAY_MS;
  return (rows || [])
    .map((r) => ({ ...r, _ts: toTs(r) }))
    .filter((r) => r._ts >= minTs)
    .sort((a, b) => b._ts - a._ts);
}

function avgIntensity(rows) {
  const vals = (rows || [])
    .map((r) => Number(r?.session?.l4?.intensity ?? 0))
    .filter((v) => Number.isFinite(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function polarityShare(rows, polarity) {
  const n = (rows || []).length || 1;
  const cnt = (rows || []).reduce((acc, r) => {
    const key = resolveStateKeyFromEntry(r);
    const p = getStateMeta(key)?.polarity || 'neutral';
    return acc + (p === polarity ? 1 : 0);
  }, 0);
  return cnt / n;
}

function dominantState(rows) {
  const counts = new Map();
  for (const r of rows || []) {
    const key = resolveStateKeyFromEntry(r);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const [key, count] = sorted[0];
  return { key, count, share: count / ((rows || []).length || 1) };
}

/**
 * Generate short, human-friendly insights for the Stats screen.
 * Returns an array of plain strings.
 */
export function generateInsights(history = [], opts = {}) {
  const {
    maxItems = 3,
    horizonDays = 35,
    compareWindow = 7,
  } = opts;

  const H = withinLastDays(history, horizonDays);
  if (!H.length) return [];

  const now = Date.now();
  const thisWin = H.filter((r) => r._ts >= now - compareWindow * DAY_MS);
  const prevWin = H.filter(
    (r) =>
      r._ts < now - compareWindow * DAY_MS &&
      r._ts >= now - compareWindow * 2 * DAY_MS
  );

  const out = [];

  const dom = dominantState(H);
  if (dom) {
    const meta = getStateMeta(dom.key);
    const pct = Math.round(dom.share * 100);
    out.push(`Most frequent state recently: ${meta?.name || dom.key} (${pct}% of entries).`);
  }

  const posNow = polarityShare(thisWin, 'positive');
  const posPrev = polarityShare(prevWin, 'positive');
  if (prevWin.length >= 3 && Math.abs(posNow - posPrev) >= 0.15) {
    const dir = posNow > posPrev ? 'up' : 'down';
    const delta = Math.round(Math.abs(posNow - posPrev) * 100);
    out.push(`Positive-leaning days are ${dir} by ~${delta} points vs the previous ${compareWindow} days.`);
  }

  const intNow = avgIntensity(thisWin);
  const intPrev = avgIntensity(prevWin);
  if (Number.isFinite(intNow) && Number.isFinite(intPrev) && prevWin.length >= 3) {
    const diff = intNow - intPrev;
    if (Math.abs(diff) >= 1.2) {
      const dir = diff > 0 ? 'higher' : 'lower';
      out.push(`Average intensity is ${dir} vs the previous ${compareWindow} days.`);
    }
  }

  return out.slice(0, maxItems);
}
