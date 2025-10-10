// utils/evidenceEngine.js
// Pure functions only. All comments in English.

import weights from '../data/weights.tag2emotion.v1.json';
import emotions from '../data/emotions20.json';
import { canonicalizeTags } from './tagCanon';

const T_MIX = 0.55;   // show at least something (dominant or mix)
const T_DOM = 0.68;   // confident dominant
const DELTA_PROBE = 0.08; // if p1-p2 below -> consider probe
const DELTA_MIX = 0.06;   // if close -> allow mix

// Softmax to get a proper probability distribution (sums to 1).
// Temperature < 1 sharpens; > 1 smooths. Small eps prevents p=1.0 locks.
function softmax(scoresObj, temperature = 0.9, eps = 1e-6) {
  const keys = Object.keys(scoresObj || {});
  if (keys.length === 0) return {};
  const vals = keys.map(k => scoresObj[k]);
  const max = Math.max(...vals);
  const scaled = vals.map(v => (v - max) / Math.max(temperature, 0.1));
  const exps = scaled.map(v => Math.exp(v));
  const denom = exps.reduce((a, b) => a + b, 0) + eps * exps.length;
  const probs = {};
  keys.forEach((k, i) => {
    probs[k] = (exps[i] + eps) / denom;
  });
  return probs;
}

function accumulateFromCards(acceptedCards, { wL1 = 1.0, wL2 = 1.7, wProbe = 2.2 } = {}) {
  // Expect cards with .id like "L1_..." "L2_..." or "PR_..."
  // Each card: { selectedOption, options: { [label]: [tags...] } }
  const emotionScores = {};
  const tagFreq = {};

  // prefill zeros
    for (const e of (emotions || [])) {
    const key = e.key || e.id || e.name;
    if (key) emotionScores[key] = 0;
  }

  const bump = (tag, gain) => {
    const row = weights[tag];
    if (!row) return;
    tagFreq[tag] = (tagFreq[tag] || 0) + 1;
    for (const [emotion, w] of Object.entries(row)) {
      emotionScores[emotion] = (emotionScores[emotion] || 0) + w * gain;
    }
  };

  for (const card of acceptedCards || []) {
    const selectedRaw = card.options?.[card.selectedOption] || [];
    const selected = canonicalizeTags(selectedRaw); // <- canonicalize here
    const isL2 = String(card.id || '').startsWith('L2_');
    const isProbe = String(card.id || '').startsWith('PR_');
    const gain = isProbe ? wProbe : (isL2 ? wL2 : wL1);
    for (const tag of selected) bump(tag, gain);
  }

  return { emotionScores, tagFreq };
}

export function routeEmotionFromCards(acceptedCards) {
  const { emotionScores, tagFreq } = accumulateFromCards(acceptedCards);
  const probs = softmax(emotionScores, 0.9, 1e-6);

  // pick top-2
  const sorted = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  const [e1, p1] = sorted[0] || [null, 0];
  const [e2, p2] = sorted[1] || [null, 0];
  const delta = p1 - p2;

  const result = {
    dominant: e1 || 'unknown',
    secondary: null,
    confidence: p1 || 0,
    delta,
    probs,
    tagFreq
  };

  if (p1 >= T_DOM) {
    // confident single
    return { ...result, secondary: null, mode: 'single' };
  }

  if (p1 >= T_MIX && delta < DELTA_MIX && e2) {
    // show mix of two
    return { ...result, secondary: e2, mode: 'mix' };
  }

  if (p1 < T_MIX || delta < DELTA_PROBE) {
    // probe recommended
    return { ...result, mode: 'probe' };
  }

  // fallback single
  return { ...result, mode: 'single' };
}

export function getEmotionMeta(key) {
  return emotions.find(e => e.key === key) || { key, name: key, color: ['#ccc','#eee'], emoji: '' };
}

export function accumulateTagsFromCards(cards = []) {
  // Extract option tags only for selected options
  const raw = [];
  for (const c of cards) {
    const opt = c.options?.[c.selectedOption];
    const tags = Array.isArray(opt) ? opt : (opt?.tags || []);
    for (const t of tags) raw.push(t);
  }
  return canonicalizeTags(raw);
}

/**
 * Classify canonical tags into emotions and decide routing.
 * @returns { decision, probsSorted }
 */
export function classifyTags(tags = []) {
  // Build raw scores
  const scores = {};
  for (const tag of tags) {
    const row = weights[tag];
    if (!row) continue;
    for (const emo in row) {
      scores[emo] = (scores[emo] || 0) + row[emo];
    }
  }
  const probs = softmax(scores);
  const pairs = Object.entries(probs).sort((a,b) => b[1]-a[1]);
  const top = pairs.slice(0, 2).map(([k]) => k);
  return decideMixOrSingle(pairs);
}
