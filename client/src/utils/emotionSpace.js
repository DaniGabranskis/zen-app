// src/data/emotionSpace.js

// List of dimensions for our emotional state space
export const DIMENSIONS = [
  "valence",     // -3 (very negative) .. +3 (very positive)
  "arousal",     // 0 .. 3 (activation / energy)
  "tension",     // 0 .. 3 (muscle/inner tension)
  "agency",      // 0 .. 2 (sense of control / ability to act)
  "self_blame",  // 0 .. 2
  "other_blame", // 0 .. 2
  "certainty",   // 0 .. 2 (clarity / understanding)
  "socialness",  // 0 .. 2 (social context weight)
  "fatigue",     // 0 .. 2 (tired / drained)
  "fear_bias"    // 0 .. 3 (threat / fear weighting)
];

// ---------- Base state helpers ----------

// New neutral/empty state
export function emptyState() {
  return {
    valence: 0,
    arousal: 0,
    tension: 0,
    agency: 0,
    self_blame: 0,
    other_blame: 0,
    certainty: 1, // light baseline clarity
    socialness: 0,
    fatigue: 0,
    fear_bias: 0,
  };
}

// Backwards-compatibility: some old code calls zeroVector()
export function zeroVector() {
  return emptyState();
}

// Clamp state to allowed ranges
export function clampState(state) {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  return {
    valence: clamp(state.valence ?? 0, -3, 3),
    arousal: clamp(state.arousal ?? 0, 0, 3),
    tension: clamp(state.tension ?? 0, 0, 3),
    agency: clamp(state.agency ?? 0, 0, 2),
    self_blame: clamp(state.self_blame ?? 0, 0, 2),
    other_blame: clamp(state.other_blame ?? 0, 0, 2),
    certainty: clamp(state.certainty ?? 1, 0, 2),
    socialness: clamp(state.socialness ?? 0, 0, 2),
    fatigue: clamp(state.fatigue ?? 0, 0, 2),
    fear_bias: clamp(state.fear_bias ?? 0, 0, 3),
  };
}

// Backwards-compatibility helper: accumulate base + delta * weight
// Used by some legacy simulation code.
export function accumulate(base, delta, weight = 1) {
  const state = { ...(base || emptyState()) };
  const patch = delta || {};

  for (const dim of DIMENSIONS) {
    const cur = state[dim] ?? 0;
    const add = patch[dim] ?? 0;
    state[dim] = cur + weight * add;
  }

  return clampState(state);
}

// ---------- Emotion centroids ----------

const EMOTION_CENTROIDS = {
  anxiety: {
    valence: -2, arousal: 3, tension: 3, agency: 0,
    self_blame: 1, other_blame: 0, certainty: 0,
    socialness: 1, fatigue: 0,
    fear_bias: 2.3,

  },
  tension: {
    valence: -1.1,
    arousal: 2.1,
    tension: 3,
    agency: 0.7,
    self_blame: 0,
    other_blame: 0,
    certainty: 0.8,
    socialness: 0,
    fatigue: 0.2,
    fear_bias: 1.3,

  },
  // ослабили fear_bias с 2 → 1.5
  fear: {
    // смещаем страх в ещё более "специальную" зону:
    // чуть более негативный + сильно повышаем fear_bias,
    // чтобы к нему тянулись только конфигурации с реально большим страховым сдвигом
    valence: -2.6,
    arousal: 3,
    tension: 3,
    agency: 0,
    self_blame: 0.5,
    other_blame: 0,
    certainty: -0.2,
    socialness: 0.5,
    fatigue: 0,
    fear_bias: 2.2   // было 1.5
  },
  anger:  { 
    valence: -2.4,   // чуть более экстремально негативная
    arousal: 3.2,    // еще более "заведённое" состояние
    tension: 3.2,    // максимум напряжения
    agency: 2,
    self_blame: 0,
    other_blame: 2.3, // сильный внешний обвинительный вектор
    certainty: 2.0,   // "я на 200% уверен, что прав"
    socialness: 1.4,
    fatigue: 0
  },
  frustration:{
    valence: -1.5,
    arousal: 1.8,
    tension: 1.8,
    agency: 1.5,
    self_blame: 0,
    other_blame: 1.4,
    certainty: 1.2,
    socialness: 0,
    fatigue: 0
  },
  irritation: {
    valence: -1, arousal: 2, tension: 2, agency: 1,
    self_blame: 0, other_blame: 1, certainty: 1,
    socialness: 0, fatigue: 0
  },
  sadness:{ 
    valence: -2.3,
    arousal: 0.5,
    tension: 1.3,
    agency: 0,
    self_blame: 1,
    other_blame: 0,
    certainty: 1,
    socialness: 0,
    fatigue: 2.3
  },
  disappointment: {
    valence: -2, arousal: 1, tension: 1, agency: 0,
    self_blame: 1, other_blame: 1, certainty: 1,
    socialness: 0, fatigue: 1
  },
  loneliness: {
    // делаем более "крайний" и более социально-насыщенный одиночный профиль,
    // чтобы к нему прилипали только реально сильные состояния
    valence: -2.8,
    arousal: 0.8,
    tension: 0.9,
    agency: 0,
    self_blame: 1.2,
    other_blame: 0,
    certainty: 1.2,
    socialness: 2.4,
    fatigue: 2.0
  },
  disconnection: {
    // emotionally: flat / empty / distant
    valence: -1.4,  // slightly less negative than sadness/loneliness
    arousal: 0.7,   // almost no activation
    tension: 0.2,   // very low tension
    agency: 0.0,    // almost no sense of influence
    self_blame: 1.2,
    other_blame: 0,
    certainty: 0.1, // still low sense of clarity/meaning
    socialness: 0.0,
    fatigue: 2.3,    // stronger exhaustion, closer to "shut down"
  },
  confusion: {
    valence: -0.7,   // было -0.8
    arousal: 1.1,    // было 1.2
    tension: 1.2,    // было 1.3
    agency: 0,
    self_blame: 0,
    other_blame: 0,
    certainty: -0.3, // new: matches low clarity states
    socialness: 0,
    fatigue: 1.2,     // was 1
    fear_bias: 0.9,

  },
  overwhelm: {
    valence: -2, arousal: 3, tension: 3, agency: 0,
    self_blame: 0, other_blame: 0, certainty: 0,
    socialness: 0, fatigue: 2,
    fear_bias: 2.1,

  },
  tiredness: {
    valence: -1.0,
    arousal: 0,
    tension: 0.4,
    agency: 0,
    self_blame: 0,
    other_blame: 0,
    certainty: 0.9,
    socialness: 0,
    fatigue: 2.6,
  },
  guilt: {
    valence: -2.3,   // was -2.1
    arousal: 2,
    tension: 2,
    agency: 0,
    self_blame: 2.2, // was 2.1
    other_blame: 0,
    certainty: 2.1,  // was 2.0
    socialness: 1,
    fatigue: 1,
  },
  shame: {
    valence: -3, arousal: 2, tension: 2, agency: 0,
    self_blame: 2, other_blame: 0, certainty: 2,
    socialness: 2, fatigue: 1
  },
  calm: {
    // приближаем calm к более реалистичному "чуть лучше, чем ок":
    // умеренно позитивный тон, очень низкое напряжение,
    // нормальная уверенность и небольшая усталость
    valence: 1.4,
    arousal: 0.1,
    tension: -0.8,
    agency: 1.2,
    self_blame: 0,
    other_blame: 0,
    certainty: 1.4,
    socialness: 0.2,
    fatigue: 0.4,
  },
  clarity: {
    valence: 1.5,
    arousal: 0.7,
    tension: 0,
    agency: 1.8,
    self_blame: 0,
    other_blame: 0,
    certainty: 1.8,
    socialness: 0,
    fatigue: 0
  },
  gratitude: {
    valence: 3.0,
    arousal: 0.8,
    tension: 0,
    agency: 2,
    self_blame: 0,
    other_blame: 0,
    certainty: 2.2,
    socialness: 2.2,
    fatigue: 0
  },
  joy: {
    valence: 3.1,  // was 3.0
    arousal: 3.2,
    tension: 0,
    agency: 2,
    self_blame: 0,
    other_blame: 0,
    certainty: 2,
    socialness: 2.4,
    fatigue: 0
  },
  contentment: {
    valence: 1.6,    // +0.1
    arousal: 0,
    tension: -1,
    agency: 1,
    self_blame: 0,
    other_blame: 0,
    certainty: 1.1,  // +0.1
    socialness: 1.1, // +0.1
    fatigue: 0
  }
};

// ---------- Distance & ranking ----------

// Squared distance between state and one centroid
function squaredDistance(state, centroid) {
  let sumSq = 0;
  for (const dim of DIMENSIONS) {
    const s = state[dim] ?? 0;
    const c = centroid[dim] ?? 0;
    const d = s - c;
    sumSq += d * d;
  }
  return sumSq;
}

// We use 1 / (1 + sqrt(dist)) as similarity in [0,1]
function similarityToEmotion(stateVec, centroid) {
  const dist = squaredDistance(stateVec, centroid);
  return 1 / (1 + Math.sqrt(dist));
}

// Main: rank emotions by similarity to given state
export function rankEmotions(stateVec) {
  const scores = Object.entries(EMOTION_CENTROIDS).map(([key, centroid]) => ({
    key,
    score: similarityToEmotion(stateVec, centroid),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores;
}
