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
  // Positive
  joy: {
    valence: 2.5, arousal: 2.0, tension: 0.4, agency: 1.6,
    self_blame: 0, other_blame: 0, certainty: 1.4,
    socialness: 1.1, fatigue: 0.0, fear_bias: 0.0,
  },
  calm: {
    valence: 1.4, arousal: 0.6, tension: 0.3, agency: 1.3,
    self_blame: 0, other_blame: 0, certainty: 1.5,
    socialness: 0.8, fatigue: 0.2, fear_bias: 0.0,
  },
  gratitude: {
    valence: 2.0, arousal: 1.0, tension: 0.4, agency: 1.2,
    self_blame: 0, other_blame: 0, certainty: 1.6,
    socialness: 1.6, fatigue: 0.0, fear_bias: 0.0,
  },
  interest: {
    valence: 1.2, arousal: 2.2, tension: 0.6, agency: 1.5,
    self_blame: 0, other_blame: 0, certainty: 1.7,
    socialness: 0.9, fatigue: 0.0, fear_bias: 0.0,
  },
  confidence: {
    valence: 2.2, arousal: 1.6, tension: 0.5, agency: 2.0,
    self_blame: 0, other_blame: 0.2, certainty: 2.0,
    socialness: 0.9, fatigue: 0.0, fear_bias: 0.0,
  },
  connection: {
    valence: 1.8, arousal: 1.0, tension: 0.4, agency: 1.2,
    self_blame: 0, other_blame: 0, certainty: 1.5,
    socialness: 2.0, fatigue: 0.0, fear_bias: 0.0,
  },

  // Negative / Threat / Activation
  anxiety: {
    valence: -2.2, arousal: 3.0, tension: 3.0, agency: 0.2,
    self_blame: 1.0, other_blame: 0, certainty: 0.4,
    socialness: 1.0, fatigue: 0.2, fear_bias: 2.4,
  },
  fear: {
    valence: -2.5, arousal: 3.0, tension: 2.6, agency: 0.1,
    self_blame: 0.2, other_blame: 0, certainty: 0.6,
    socialness: 0.6, fatigue: 0.0, fear_bias: 3.0,
  },
  anger: {
    valence: -2.6, arousal: 3.0, tension: 3.0, agency: 1.9,
    self_blame: 0.0, other_blame: 2.0, certainty: 1.9,
    socialness: 0.8, fatigue: 0.1, fear_bias: 0.2,
  },
  frustration: {
    valence: -2.0, arousal: 2.6, tension: 2.5, agency: 1.3,
    self_blame: 0.4, other_blame: 1.2, certainty: 1.3,
    socialness: 0.6, fatigue: 0.5, fear_bias: 0.3,
  },
  tension: {
    valence: -1.2, arousal: 2.0, tension: 3.0, agency: 0.7,
    self_blame: 0.2, other_blame: 0.2, certainty: 1.2,
    socialness: 0.4, fatigue: 0.4, fear_bias: 0.8,
  },
  overload: {
    valence: -2.1, arousal: 2.8, tension: 2.8, agency: 0.2,
    self_blame: 0.6, other_blame: 0.3, certainty: 0.6,
    socialness: 0.6, fatigue: 1.3, fear_bias: 1.2,
  },

  // Low energy / shutdown
  fatigue: {
    valence: -1.8, arousal: 0.2, tension: 1.0, agency: 0.2,
    self_blame: 0.3, other_blame: 0.0, certainty: 0.9,
    socialness: 0.3, fatigue: 2.0, fear_bias: 0.3,
  },
  numbness: {
    valence: -1.8, arousal: 0.1, tension: 0.6, agency: 0.1,
    self_blame: 0.2, other_blame: 0.0, certainty: 0.6,
    socialness: 0.2, fatigue: 1.4, fear_bias: 0.2,
  },
  disconnected: {
    valence: -1.6, arousal: 0.4, tension: 0.8, agency: 0.2,
    self_blame: 0.2, other_blame: 0.1, certainty: 0.8,
    socialness: 0.1, fatigue: 0.9, fear_bias: 0.3,
  },
  sadness: {
    valence: -2.5, arousal: 0.8, tension: 1.0, agency: 0.2,
    self_blame: 0.8, other_blame: 0.1, certainty: 1.0,
    socialness: 0.8, fatigue: 1.0, fear_bias: 0.6,
  },

  // Self-evaluative
  shame: {
    valence: -2.4, arousal: 1.2, tension: 2.0, agency: 0.1,
    self_blame: 2.0, other_blame: 0.0, certainty: 1.2,
    socialness: 1.0, fatigue: 0.9, fear_bias: 1.0,
  },
  guilt: {
    valence: -2.0, arousal: 1.5, tension: 1.7, agency: 0.6,
    self_blame: 1.8, other_blame: 0.0, certainty: 1.5,
    socialness: 1.2, fatigue: 0.8, fear_bias: 0.7,
  },

  // Disgust
  disgust: {
    valence: -2.2, arousal: 1.6, tension: 1.4, agency: 1.1,
    self_blame: 0.0, other_blame: 1.0, certainty: 1.7,
    socialness: 0.7, fatigue: 0.2, fear_bias: 0.2,
  },

  // Cognitive
  confusion: {
    valence: -1.2, arousal: 1.6, tension: 1.5, agency: 0.3,
    self_blame: 0.3, other_blame: 0.1, certainty: 0.2,
    socialness: 0.5, fatigue: 0.4, fear_bias: 0.4,
  },
  clarity: {
    valence: 1.0, arousal: 1.0, tension: 0.4, agency: 1.6,
    self_blame: 0.0, other_blame: 0.0, certainty: 2.0,
    socialness: 0.7, fatigue: 0.0, fear_bias: 0.0,
  },

  // Fallback
  mixed: {
    valence: 0.0, arousal: 1.2, tension: 1.2, agency: 0.9,
    self_blame: 0.5, other_blame: 0.5, certainty: 1.0,
    socialness: 0.8, fatigue: 0.6, fear_bias: 0.6,
  },
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
  // Exclude 'mixed' from ranking - it's a fallback only, not a real candidate
  const scores = Object.entries(EMOTION_CENTROIDS)
    .filter(([key]) => key !== 'mixed') // Exclude mixed from candidates
    .map(([key, centroid]) => ({
      key,
      score: similarityToEmotion(stateVec, centroid),
    }));
  scores.sort((a, b) => b.score - a.score);
  return scores;
}
