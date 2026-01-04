// intensity/estimator.js
// Deterministic intensity estimation based on L1 + L2 tags only.

import { TAG_WEIGHTS } from './weights';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Baseline "moderate" intensity. Tags will push this up or down.
const BASE_INTENSITY = 4;

/**
 * Sum weights for all known tags.
 * Unknown tags contribute 0 (neutral).
 */
function sumTagWeights(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) return 0;

  let sum = 0;
  for (const raw of tags) {
    if (!raw) continue;
    const key = String(raw);
    const w = TAG_WEIGHTS[key] ?? TAG_WEIGHTS[key.toUpperCase()];
    if (typeof w === 'number') {
      sum += w;
    }
  }
  return sum;
}

/**
 * Estimate intensity on a 0..10 scale + confidence 0.5..0.98.
 *
 * @param {Object} params
 * @param {string[]} params.tags     - L1/L2 tags collected in probes
 * @param {string[]} params.bodyMind - kept for compatibility, ignored for now
 * @param {string[]} params.triggers - kept for compatibility, ignored for now
 */
export function estimateIntensity({ tags = [], bodyMind, triggers } = {}) {
  const safeTags = Array.isArray(tags) ? tags : [];

  // 1) Raw score from tags: baseline + sum of tag weights
  const tagScore = sumTagWeights(safeTags);
  const raw = BASE_INTENSITY + tagScore;

  // 2) Map to 0..10 range, keep one decimal for internal logic
  const intensity = clamp(Math.round(raw * 10) / 10, 0, 10);

  // 3) Confidence: more tags -> higher confidence.
  const tagCount = safeTags.length;
  let confidence = 0.5 + Math.min(tagCount, 12) * 0.04; // up to ~0.98
  confidence = clamp(confidence, 0.5, 0.98);

  return {
    intensity,
    confidence,
  };
}
