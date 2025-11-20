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
  "fatigue"      // 0 .. 2 (tired / drained)
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
    fatigue: 0
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
    valence:    clamp(state.valence    ?? 0, -3, 3),
    arousal:    clamp(state.arousal    ?? 0,  0, 3),
    tension:    clamp(state.tension    ?? 0,  0, 3),
    agency:     clamp(state.agency     ?? 0,  0, 2),
    self_blame: clamp(state.self_blame ?? 0,  0, 2),
    other_blame:clamp(state.other_blame?? 0,  0, 2),
    certainty:  clamp(state.certainty  ?? 1,  0, 2),
    socialness: clamp(state.socialness ?? 0,  0, 2),
    fatigue:    clamp(state.fatigue    ?? 0,  0, 2)
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

export const EMOTION_CENTROIDS = {
  // Cluster A — Anxiety / Tension / Fear
  anxiety: {
    valence: -2, arousal: 3, tension: 3, agency: 0,
    self_blame: 1, other_blame: 0, certainty: 0,
    socialness: 1, fatigue: 0
  },
  tension: {
    valence: -1, arousal: 2, tension: 3, agency: 1,
    self_blame: 0, other_blame: 0, certainty: 1,
    socialness: 0, fatigue: 0
  },
  fear: {
    valence: -3, arousal: 3, tension: 3, agency: 0,
    self_blame: 0, other_blame: 0, certainty: 0,
    socialness: 1, fatigue: 0
  },

  // Cluster B — Anger / Frustration / Irritation
  anger: {
    valence: -2, arousal: 3, tension: 3, agency: 2,
    self_blame: 0, other_blame: 2, certainty: 2,
    socialness: 1, fatigue: 0
  },
  frustration: {
    valence: -2, arousal: 2, tension: 2, agency: 1,
    self_blame: 0, other_blame: 2, certainty: 1,
    socialness: 0, fatigue: 0
  },
  irritation: {
    valence: -1, arousal: 2, tension: 2, agency: 1,
    self_blame: 0, other_blame: 1, certainty: 1,
    socialness: 0, fatigue: 0
  },

  // Cluster C — Sadness / Disappointment / Loneliness
  sadness: {
    valence: -3, arousal: 0, tension: 1, agency: 0,
    self_blame: 1, other_blame: 0, certainty: 1,
    socialness: 0, fatigue: 2
  },
  disappointment: {
    valence: -2, arousal: 1, tension: 1, agency: 0,
    self_blame: 1, other_blame: 1, certainty: 1,
    socialness: 0, fatigue: 1
  },
  loneliness: {
    valence: -2, arousal: 1, tension: 1, agency: 0,
    self_blame: 1, other_blame: 0, certainty: 1,
    socialness: 2, fatigue: 1
  },

  // Cluster D — Disconnection / Confusion / Overwhelm / Tiredness
  disconnection: {
    valence: -2, arousal: 0, tension: 0, agency: 0,
    self_blame: 0, other_blame: 0, certainty: 0,
    socialness: 0, fatigue: 2
  },
  confusion: {
    valence: -1, arousal: 1, tension: 1, agency: 0,
    self_blame: 0, other_blame: 0, certainty: 0,
    socialness: 0, fatigue: 1
  },
  overwhelm: {
    valence: -2, arousal: 3, tension: 3, agency: 0,
    self_blame: 0, other_blame: 0, certainty: 0,
    socialness: 0, fatigue: 2
  },
  tiredness: {
    valence: -1, arousal: 0, tension: 0, agency: 0,
    self_blame: 0, other_blame: 0, certainty: 1,
    socialness: 0, fatigue: 3
  },

  // Cluster E — Guilt / Shame
  guilt: {
    valence: -2, arousal: 2, tension: 2, agency: 0,
    self_blame: 2, other_blame: 0, certainty: 2,
    socialness: 1, fatigue: 1
  },
  shame: {
    valence: -3, arousal: 2, tension: 2, agency: 0,
    self_blame: 2, other_blame: 0, certainty: 2,
    socialness: 2, fatigue: 1
  },

  // Cluster F — Calm / Clarity / Gratitude / Joy / Contentment
  calm: {
    valence: 2, arousal: 0, tension: 0, agency: 2,
    self_blame: 0, other_blame: 0, certainty: 2,
    socialness: 0, fatigue: 0
  },
  clarity: {
    valence: 2, arousal: 1, tension: 0, agency: 2,
    self_blame: 0, other_blame: 0, certainty: 2,
    socialness: 0, fatigue: 0
  },
  gratitude: {
    valence: 3, arousal: 1, tension: 0, agency: 2,
    self_blame: 0, other_blame: 0, certainty: 2,
    socialness: 2, fatigue: 0
  },
  joy: {
    valence: 3, arousal: 3, tension: 0, agency: 2,
    self_blame: 0, other_blame: 0, certainty: 2,
    socialness: 2, fatigue: 0
  },
  contentment: {
    valence: 3, arousal: 1, tension: 0, agency: 2,
    self_blame: 0, other_blame: 0, certainty: 2,
    socialness: 1, fatigue: 0
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
