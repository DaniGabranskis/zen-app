// utils/evidenceEngine.js

// Use emotion data for UI (colors, labels, emoji)
import emotions from '../data/emotions20.json';
import {
  emptyState,
  clampState,
  rankEmotions,
} from '../utils/emotionSpace.js';
import { getPolarityFromMeta, POLARITY_FALLBACK } from '../data/emotionMeta';

// Derive emotion keys from data file
export const emotionKeys = Array.isArray(emotions)
  ? emotions.map((e) => e.key)
  : [];

// Re-export full emotions list for consumers that need it
export { emotions };


// Thresholds for routing decisions
const T_DOM = 0.20;      // confident dominant: strong peak
const T_MIX = 0.08;      // allow mix if top emotion is at least 8%
const DELTA_MIX = 0.03;  // if p1 - p2 < 3% → treat as mix (when p1 is high enough)
const DELTA_PROBE = 0.0002; // if p1 - p2 < 1% → ask for probe

// ============================================================================
// TAG → DIMENSION RULES
// These are the only tags the engine understands.
// L1/L2 cards must emit these tag keys in their options.
// ============================================================================

const TAG_RULES = {
  // ───────────────────────────────
  // L1 — базовые эмоциональные оси
  // ───────────────────────────────

  L1_MOOD_NEG: { 
    valence: -1.2,
    arousal: +0.2,
    tension: +0.3,
    fatigue: +0.3,
    certainty: -0.2 
  },

  L1_MOOD_POS: { 
    valence: +1.6,
    arousal: +0.3,
    tension: -0.7,
    fatigue: -0.5,
    certainty: +0.4,
    agency: +0.4
  },

  L1_BODY_TENSION: { tension: +1.6 },
  L1_BODY_RELAXED: { tension: -1.1 },

  L1_ENERGY_LOW:  { 
    arousal: -0.7, 
    fatigue: +1.8 // was +1.6
  },
  L1_ENERGY_HIGH: { arousal: +2.3 },

  L1_CONTROL_HIGH: { agency: +2, tension: -0.2 },
  L1_CONTROL_LOW:  { agency: -0.7, tension: +0.7 },

  L1_SOCIAL_SUPPORT: { 
    socialness: +1.2,
    valence: +0.8,
    agency: +0.5,
    certainty: +0.4
  },

  L1_SOCIAL_THREAT:  { 
    socialness: +0.3,
    valence: -0.4,
    other_blame: +0.3,
    certainty: -0.2,
    tension: +0.3
  },

  // ───────────────────────────────
  // Дополнительные L1-оси
  // ───────────────────────────────

  L1_SAFETY_LOW: {
    valence: -0.8,
    arousal: +1.0,
    tension: +1.0,
    certainty: -0.5,
    // ослабили fear_bias (было 0.9)
    fear_bias: +0.55
  },

  L1_SAFETY_HIGH: {
    valence: +1.0,
    arousal: -0.6,
    tension: -1.0,
    certainty: +0.6
  },

  L1_WORTH_LOW: {
    valence: -0.8,      // was -1.0
    self_blame: +0.6,   // was +0.8
    tension: +0.3,
    certainty: -0.2
  },

  L1_WORTH_HIGH: {
    valence: +1.0,
    agency: +0.5,
    certainty: +0.4
  },

  L1_EXPECT_LOW: {
    valence: -0.8,
    arousal: +0.5,
    tension: +1.0,
    self_blame: +0.3,
    other_blame: +0.6,
    fatigue: +0.2
  },

  L1_EXPECT_OK: {
    valence: +0.4,
    tension: -0.3,
    fatigue: -0.3
  },

  L1_PRESSURE_HIGH: {
    arousal: +1.0,
    tension: +1.0,
    fatigue: +0.5,
    valence: -0.5
  },

  L1_PRESSURE_LOW: {
    arousal: -0.6,
    tension: -0.9,
    fatigue: -0.6,
    valence: +0.6,
    agency: +0.4,
    certainty: +0.3
  },

  L1_CLARITY_LOW: {
    certainty: -0.6,  // was -0.7
    tension: +0.6,    // was +0.2
    fatigue: +0.5,    // was +0.3
    valence: -0.1     // was -0.3
  },

  L1_CLARITY_HIGH: {
    certainty: +1.2,
    tension: -0.5,
    valence: +0.7,
    agency: +0.5
  },

  // ───────────────────────────────
  // L2 — когнитивные и социальные факторы
  // ───────────────────────────────

  L2_FOCUS_FUTURE: { arousal: +0.7, tension: +0.7 },
  L2_FOCUS_PAST:   { fatigue: +0.8, valence: -0.7 },

  L2_SOURCE_PEOPLE: { other_blame: +0.8, socialness: +1 },
  L2_SOURCE_TASKS:  { other_blame: +0.3, tension: +0.4 },

  L2_UNCERT_HIGH: { certainty: -1.1, arousal: 0.3, tension: 0.4 },
  L2_UNCERT_LOW:  { certainty: 0.7, tension: -0.4 },

  L2_SOCIAL_PAIN_YES: {
    socialness: +0.3,
    valence: -0.8,
    tension: +0.8,
    fatigue: +0.3
  },

  L2_SOCIAL_PAIN_NO:  {},

  L2_SHUTDOWN: { 
    fatigue: +1.6, 
    tension: -0.3, 
    agency: -0.8, 
    arousal: -0.4 
  },

    L2_PRESENT: {
    certainty: +0.4,
    tension: -0.3,
    agency: +0.3
  },

  L2_FEELS_FINE: {
    fatigue: -0.4,
    valence: +0.3,
    tension: -0.2
  },

  L2_SELF_BLAME_YES: {
    self_blame: +0.8,
    valence: -0.4,
    tension: +0.3
  },

  L2_SELF_BLAME_NO: {
    self_blame: -0.6,
    valence: +0.2,
    tension: -0.2
  },

  L2_FLOODING: { arousal: +0.8, tension: +0.8 },

  L2_GUILT: { 
    self_blame: +0.40,  // was 0.55
    valence: -0.1,
    certainty: +0.1     // was 0.2
  },
  
  L2_SHAME: { 
    self_blame: +0.55,  // was 0.7
    valence: -0.2,
    certainty: -0.2,    // was -0.1
    tension: +0.2
  },

  L2_POS_GRATITUDE: { 
    valence: +0.3,
    certainty: +0.3,
    socialness: +0.25
  },

  L2_POS_JOY: { 
    valence: +0.9,      // было 1.0
    arousal: +0.35,     // было 0.4
    socialness: +0.5    // было 0.6
  },

  L2_REGULATION_GOOD: { agency: +1.2, tension: -1.0 },
  L2_REGULATION_BAD:  { agency: -0.8, tension: +0.8 },

  L2_CLARITY_HIGH: { certainty: 0.7, tension: -0.3 },
  L2_CLARITY_LOW:  { 
    certainty: -0.7,  // was -0.6
    tension: +0.6,    // was +0.2
    fatigue: +0.4     // new, supports confusion/tiredness
  },

  // ───────────────────────────────
  // Дополнительные теги
  // ───────────────────────────────

  L2_NO_POSITIVE: { valence: -0.7, fatigue: +0.7, arousal: -0.2 },

  L2_DISCONNECT_NUMB: {
    arousal: -0.9,     // a bit lower activation
    certainty: -1.0,   // even less sense of clarity
    agency: -1.0,      // even less control
    fatigue: +1.8,     // stronger exhaustion
    tension: -0.3      // slightly more relaxed / flat
  },

  L2_LET_DOWN: {
    valence: -0.9,
    arousal: +0.8,
    tension: +0.8,
    self_blame: +0.6,
    other_blame: +0.6,
    fatigue: +0.2
  },

  L2_SAD_HEAVY: { 
    valence: -1.0,
    arousal: -0.6,
    fatigue: +1.3,
    tension: -0.2
  },

  // fear-спайк: ослабили fear_bias с 1.5 → 1.1
  L2_FEAR_SPIKE: {
    valence: -1.2,
    arousal: +1.3,
    tension: +1.3,
    agency: -0.2,
    certainty: -0.7,
    socialness: +0.4,
    fear_bias: +1.0
  },

  L2_MEANING_LOW: {
    valence: -1.0,
    certainty: -0.6,
    fatigue: +0.5
  },

  L2_MEANING_HIGH: {
    valence: +1.1,
    certainty: +0.7
  },

  L2_CONTENT_WARM: {
    valence: +1.4,
    arousal: +0.3,
    tension: -0.7,
    certainty: +0.4
  },
  L2_GUILT_NO: {},
  L2_SHAME_NO: {},
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
  const [first, second] = pairs;
  const [e1, p1] = first || [];
  const [e2, p2] = second || [];
  const delta = (p1 ?? 0) - (p2 ?? 0);

  const base = {
    dominant: e1 || 'unknown',
    secondary: e2 || null, // <- сразу кладём вторую эмоцию, если есть
    confidence: p1 ?? 0,
    delta,
    mode: 'single',
  };

  console.log('[evidenceEngine] decideMixOrSingle', {
    e1, p1, e2, p2, delta,
    T_DOM, T_MIX, DELTA_PROBE, DELTA_MIX,
  });

  // 1) Супер-уверенная одна эмоция
  if (p1 >= T_DOM) {
    return { ...base, mode: 'single' };
  }

  // 2) Смесь двух, gap маленький
  if (p1 >= T_MIX && delta < DELTA_MIX && e2) {
    return { ...base, mode: 'mix' };
  }

  // 3) Need extra disambiguation through probe
  // We only trigger probe when top-2 emotions are almost equal.
  // We DO NOT use "p1 < T_MIX" anymore, otherwise we always fall into probe.
  if (delta < DELTA_PROBE && e2) {
    return { ...base, mode: 'probe' };
  }

  // 4) Дефолт: одна эмоция, но secondary всё равно остаётся как второй кандидат
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

  // ❗ ВАЖНО: возвращаем ещё и state для L3-пробы
  return { decision, probsSorted: pairs, state };
}


/**
 * Main entry for routing from cards (L1/L2/Probe).
 * Keeps the same shape as the old version.
 */
export function routeEmotionFromCards(acceptedCards) {
  const tags = accumulateTagsFromCards(acceptedCards || []);

  const tagFreq = {};
  for (const t of tags) {
    tagFreq[t] = (tagFreq[t] || 0) + 1;
  }

  // ❗ Теперь забираем ещё и state
  const { decision, probsSorted, state } = classifyTags(tags);

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
    // ❗ Новый параметр: исходный вектор L1+L2
    vector: state,
  };
}

/**
 * Get rich meta info for an emotion key (for UI).
 * Always returns at least two colors for LinearGradient.
 */
// Variant A — correct polarity for StatsScreen & EmotionalBalanceBar
export function getEmotionMeta(key) {
  if (!key || typeof key !== 'string') {
    return {
      key: '',
      name: '',
      color: ['#A78BFA', '#7C3AED'],
      emoji: '',
      polarity: 'neutral',
    };
  }

  const k = String(key).toLowerCase();

  // find emotion in emotions20.json
  const found = Array.isArray(emotions)
    ? emotions.find(
        (e) =>
          String(e.key || '').toLowerCase() === k ||
          String(e.name || '').toLowerCase() === k
      )
    : null;

  if (!found) {
    return {
      key,
      name: key,
      color: ['#A78BFA', '#7C3AED'],
      emoji: '',
      polarity: 'neutral',
    };
  }

  // ensure valid gradient array
  let colorArray;
  if (Array.isArray(found.color)) {
    colorArray =
      found.color.length >= 2
        ? found.color
        : [found.color[0], found.color[0]];
  } else if (typeof found.color === 'string') {
    colorArray = [found.color, found.color];
  } else {
    colorArray = ['#A78BFA', '#7C3AED'];
  }

  // derive polarity from emotionMeta.js or fallback
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
    color: colorArray,
    emoji: found.emoji || '',
    polarity,
  };
}