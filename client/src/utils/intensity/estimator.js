// Deterministic intensity estimation based on tags, body-mind patterns and triggers.
// Comments are intentionally concise.

import { TAG_WEIGHTS, BM_WEIGHTS, TRIG_WEIGHTS } from './weights';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function scoreTags(tags = []) {
  const sum = tags.reduce((acc, t) => acc + (TAG_WEIGHTS[t] ?? 0), 0);
  // normalize so that ~3 strong tags ≈ 1.0
  return clamp(sum / 3.0, 0, 1);
}

function scoreBM(bm = []) {
  const vals = bm.map(x => BM_WEIGHTS[x] ?? 0.5).sort((a, b) => b - a);
  const top = vals.slice(0, 3);
  const mean = top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
  return clamp(mean, 0, 1);
}

function scoreTrig(trigs = []) {
  if (!trigs.length) return 0;
  const vals = trigs.map(x => TRIG_WEIGHTS[x] ?? 0.5).sort((a, b) => b - a);
  const base = (vals.length >= 2) ? (vals[0] + vals[1]) / 2 : vals[0];
  return clamp(base, 0, 1);
}

function scoreRisk(tags = [], bm = []) {
  const hasMR = tags.includes('mind_racing');
  const hasHR = bm.includes('Heart racing');
  if (hasMR && hasHR) return 0.8;

  const hasGuilt = tags.includes('guilt');
  const hasThreat = tags.includes('vigilant') || tags.includes('tension?');
  if (hasGuilt && hasThreat) return 0.6;

  return 0;
}

/**
 * Estimate intensity on a 0..10 scale + confidence 0..1.
 * @param {Object} params
 * @param {string[]} params.tags - canonical evidence tags from L1/L2
 * @param {string[]} params.bodyMind - selected body & mind patterns
 * @param {string[]} params.triggers - selected triggers
 */
export function estimateIntensity({ tags = [], bodyMind = [], triggers = [] }) {
  const S_tags = scoreTags(tags);
  const S_bm = scoreBM(bodyMind);
  const S_trig = scoreTrig(triggers);
  const S_risk = scoreRisk(tags, bodyMind);

  // weights are deliberately simple to reason about
  const w_tags = 0.45, w_bm = 0.30, w_trig = 0.20, w_risk = 0.05;
  const raw = w_tags * S_tags + w_bm * S_bm + w_trig * S_trig + w_risk * S_risk;
  const intensity = Math.round(clamp(raw, 0, 1) * 10);

  // simple confidence heuristic
  const contradictions = (tags.includes('energy_steady') && S_bm > 0.7) ? 1 : 0;
  const sparse = ((tags.length + bodyMind.length + triggers.length) < 3) ? 1 : 0;
  const conf = clamp(1 - 0.25 * contradictions - 0.20 * sparse, 0, 1);

  return { intensity, confidence: conf, breakdown: { S_tags, S_bm, S_trig, S_risk } };
}
