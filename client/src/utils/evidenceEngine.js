// utils/evidenceEngine.js
// Pure functions only. All comments in English.

import emotions from '../data/emotions20.json';
import { getPolarityFromMeta, POLARITY_FALLBACK } from '../data/emotionMeta';
import {
  emptyState,
  clampState,
  rankEmotions,
} from '../data/emotionSpace';

// Thresholds for routing decisions
const T_MIX = 0.55;      // show at least something (dominant or mix)
const T_DOM = 0.68;      // confident dominant
const DELTA_PROBE = 0.08; // if p1-p2 below -> consider probe
const DELTA_MIX = 0.06;   // if close -> allow mix

// ============================================================================
// TAG → DIMENSION RULES
// These are the only tags the engine understands.
// L1/L2 cards must emit these tag keys in their options.
// ============================================================================

const TAG_RULES = {
  // ===== L1 =====

  // 1) Valence (pleasant/unpleasant) – L1.Q1 (mood)
  L1_MOOD_NEG: { valence: -2 },
  L1_MOOD_POS: { valence: +2 },

  // 2) Body / tension – optional L1.Q2
  L1_BODY_TENSION: { tension: +2 },
  L1_BODY_RELAXED: { tension: -1 },

  // 3) Arousal (high/low) – L1.Q3 (energy)
  L1_ENERGY_LOW:  { arousal: -1, fatigue: +1 },
  L1_ENERGY_HIGH: { arousal: +2 },

  // 4) Control vs overwhelmed – L1.Q4
  L1_CONTROL_HIGH: { agency: +2, tension: 0 },
  L1_CONTROL_LOW:  { agency: -1, tension: +1 },

  // 5) Social threat vs support – L1.Q5
  L1_SOCIAL_SUPPORT: { socialness: +2, valence: +1 },
  L1_SOCIAL_THREAT:  { socialness: +2, valence: -1, tension: +1 },

  // ===== L2 =====

  // 6) Cognitive focus (future vs past) – L2.Q1
  L2_FOCUS_FUTURE: { arousal: +1, tension: +1 },
  L2_FOCUS_PAST:   { fatigue: +1, valence: -1 },

  // 7) Source of problem (people vs workload) – L2.Q2
  L2_SOURCE_PEOPLE: { other_blame: +2, socialness: +1 },
  L2_SOURCE_TASKS:  { other_blame: +1, tension: +1 },

  // 8) Uncertainty – L2.Q3
  L2_UNCERT_HIGH: { certainty: 0, tension: +1 },
  L2_UNCERT_LOW:  { certainty: +2 },

  // 9) Social pain – L2.Q4
  L2_SOCIAL_PAIN_YES: { socialness: +2, valence: -2, tension: +1 },
  L2_SOCIAL_PAIN_NO:  {},

  // 10) Shutdown vs emotional flooding – L2.Q5
  L2_SHUTDOWN: { fatigue: +2, tension: 0, agency: -1 },
  L2_FLOODING: { arousal: +1, tension: +1 },

  // 11) Guilt vs shame – L2.Q6–Q7
  L2_GUILT: { self_blame: +2, valence: -2 },
  L2_SHAME: { self_blame: +2, valence: -2, socialness: +2 },

  // 12) Positive moments (gratitude vs joy) – L2.Q8
  L2_POS_GRATITUDE: { valence: +2, certainty: +1, socialness: +1 },
  L2_POS_JOY:       { valence: +3, arousal: +2, socialness: +2 },

  // 13) Regulation capacity & clarity – L2.Q9–10
  L2_REGULATION_GOOD: { agency: +1, tension: -1 },
  L2_REGULATION_BAD:  { agency: -1, tension: +1 },
  L2_CLARITY_HIGH:    { certainty: +2 },
  L2_CLARITY_LOW:     { certainty: 0 }
};

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Build state vector from tags using TAG_RULES.
 */
function buildStateFromTags(rawTags = []) {
  const unique = Array.from(new Set(rawTags));
  let state = emptyState();

  for (const tag of unique) {
    const rule = TAG_RULES[tag];
    if (!rule) continue;
    for (const [dim, delta] of Object.entries(rule)) {
      state[dim] = (state[dim] ?? 0) + delta;
    }
  }

  return clampState(state);
}

/**
 * Softmax over similarity scores.
 * Input: [{ key, score }, ...]
 * Output: [{ key, p }, ...] with sum(p) ~= 1.
 */
function softmaxFromScores(pairs, temperature = 0.9, eps = 1e-6) {
  if (!pairs || pairs.length === 0) return [];
  const scaled = pairs.map(({ key, score }) => ({
    key,
    v: Math.exp((score / Math.max(temperature, 0.1)) || 0)
  }));
  const sum = scaled.reduce((acc, x) => acc + x.v, 0) + eps;
  return scaled.map(({ key, v }) => ({ key, p: v / sum }));
}

/**
 * Decide between single / mix / probe based on sorted probabilities.
 * pairs: [ [emotionKey, prob], ... ] sorted desc by prob.
 */
function decideMixOrSingle(pairs) {
  const [first, second] = [
    pairs[0] || ['unknown', 0],
    pairs[1] || [null, 0],
  ];
  const [e1, p1] = first;
  const [e2, p2] = second;
  const delta = p1 - p2;

  const base = {
    dominant: e1 || 'unknown',
    secondary: null,
    confidence: p1 || 0,
    delta,
    mode: 'single',
  };

  if (p1 >= T_DOM) {
    // confident single
    return { ...base, secondary: null, mode: 'single' };
  }

  if (p1 >= T_MIX && delta < DELTA_MIX && e2) {
    // show mix of two
    return { ...base, secondary: e2, mode: 'mix' };
  }

  if (p1 < T_MIX || delta < DELTA_PROBE) {
    // probe recommended
    return { ...base, mode: 'probe' };
  }

  // fallback single
  return { ...base, mode: 'single' };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Extract option tags only for selected options.
 * NOTE: now it returns raw tags as they are in cards (no canonicalization).
 */
export function accumulateTagsFromCards(cards = []) {
  const raw = [];
  for (const c of cards) {
    const opt = c.options?.[c.selectedOption];
    const tags = Array.isArray(opt) ? opt : (opt?.tags || []);
    for (const t of tags) raw.push(t);
  }
  return raw;
}

/**
 * Classify canonical tags into emotions and decide routing.
 * @returns {{ decision: {dominant, secondary, confidence, delta, mode}, probsSorted: [ [key, p], ... ] }}
 */
export function classifyTags(tags = []) {
  // 1) Build dimensional state
  const state = buildStateFromTags(tags);

  // 2) Rank emotions by similarity
  const similarityRank = rankEmotions(state); // [{ key, score }, ...]

  // 3) Convert similarity scores to probabilities
  const withProb = softmaxFromScores(similarityRank); // [{ key, p }, ...]
  const pairs = withProb.map(({ key, p }) => [key, p]);

  // 4) Decide mode (single/mix/probe)
  const decision = decideMixOrSingle(pairs);

  return { decision, probsSorted: pairs };
}

/**
 * Main entry for routing from cards (L1/L2/Probe).
 * Keeps the same shape as the old version.
 */
export function routeEmotionFromCards(acceptedCards) {
  const tags = accumulateTagsFromCards(acceptedCards || []);

  // Compute tag frequency just for debug / transparency
  const tagFreq = {};
  for (const t of tags) {
    tagFreq[t] = (tagFreq[t] || 0) + 1;
  }

  const { decision, probsSorted } = classifyTags(tags);

  // Build probs map from sorted pairs
  const probs = {};
  for (const [k, p] of probsSorted) {
    probs[k] = p;
  }

  return {
    dominant: decision.dominant || 'unknown',
    secondary: decision.secondary || null,
    confidence: decision.confidence || 0,
    delta: decision.delta || 0,
    probs,
    tagFreq,
    mode: decision.mode,
  };
}

/**
 * Get rich meta info for an emotion key (for UI).
 */
export function getEmotionMeta(key) {
  // Normalize lookup to be robust to key/name usage
  const k = String(key || '').toLowerCase();
  const found = emotions.find(
    e => String(e.key || '').toLowerCase() === k || String(e.name || '').toLowerCase() === k
  );

  if (!found) {
    // Unknown emotion: return safe meta with neutral polarity
    return { key: k, name: key, color: '#ccc', emoji: '', polarity: 'neutral' };
  }

  // Color can be array or string — take the first if array
  const color = Array.isArray(found.color)
    ? found.color
    : [found.color || '#ccc', found.color || '#ccc'];

  // Resolve polarity:
  // 1) try meta-driven valence → polarity,
  // 2) fallback dictionary,
  // 3) neutral.
  const fromMeta =
    getPolarityFromMeta(found.key) ||
    getPolarityFromMeta(found.name);
  const fallback =
    POLARITY_FALLBACK[String(found.key || '').toLowerCase()] ||
    POLARITY_FALLBACK[String(found.name || '').toLowerCase()];
  const polarity = fromMeta || fallback || 'neutral';

  return {
    key: found.key,
    name: found.name,
    color,
    emoji: found.emoji || '',
    polarity,
  };
}
