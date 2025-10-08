// utils/evidenceEngine.js
// Pure functions only. All comments in English.

import weights from '../data/weights.tag2emotion.v1.json';
import emotions from '../data/emotions20.json';

const T_MIX = 0.55;   // show at least something (dominant or mix)
const T_DOM = 0.68;   // confident dominant
const DELTA_PROBE = 0.08; // if p1-p2 below -> consider probe
const DELTA_MIX = 0.06;   // if close -> allow mix

function normalize(scores) {
  // min-max to [0..1]; robust for sparse weights
  const vals = Object.values(scores);
  if (!vals.length) return {};
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (max === min) {
    const out = {};
    for (const k of Object.keys(scores)) out[k] = 1 / Object.keys(scores).length;
    return out;
    }
  const out = {};
  for (const [k, v] of Object.entries(scores)) out[k] = (v - min) / (max - min);
  return out;
}

function accumulateFromCards(acceptedCards, { wL1 = 1.0, wL2 = 1.7, wProbe = 2.2 } = {}) {
  // Expect cards with .id like "L1_..." "L2_..." or "PR_..."
  // Each card: { selectedOption, options: { [label]: [tags...] } }
  const emotionScores = {};
  const tagFreq = {};

  const bump = (tag, gain) => {
    const row = weights[tag];
    if (!row) return;
    tagFreq[tag] = (tagFreq[tag] || 0) + 1;
    for (const [emotion, w] of Object.entries(row)) {
      emotionScores[emotion] = (emotionScores[emotion] || 0) + w * gain;
    }
  };

  for (const card of acceptedCards || []) {
    const selected = card.options?.[card.selectedOption] || [];
    const isL2 = String(card.id || '').startsWith('L2_');
    const isProbe = String(card.id || '').startsWith('PR_');
    const gain = isProbe ? wProbe : (isL2 ? wL2 : wL1);
    for (const tag of selected) bump(tag, gain);
  }

  return { emotionScores, tagFreq };
}

export function routeEmotionFromCards(acceptedCards) {
  const { emotionScores, tagFreq } = accumulateFromCards(acceptedCards);
  const probs = normalize(emotionScores);

  // pick top-2
  const sorted = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  const [e1, p1] = sorted[0] || [null, 0];
  const [e2, p2] = sorted[1] || [null, 0];
  const delta = (p1 || 0) - (p2 || 0);

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
