// src/data/emotionSpace.js
// Core dimensional model (Russell + a few appraisal axes)

/**
 * Dimensions used in state vectors and emotion centroids.
 */
export const DIMENSIONS = [
  "valence",     // -3 (very negative) .. +3 (very positive)
  "arousal",     // 0 .. 3  (activation / energy)
  "tension",     // 0 .. 3  (muscle/inner tension)
  "agency",      // 0 .. 2  (sense of control / ability to act)
  "self_blame",  // 0 .. 2  (how much I blame myself)
  "other_blame", // 0 .. 2  (how much I blame others / world)
  "certainty",   // 0 .. 2  (clarity / understanding)
  "socialness",  // 0 .. 2  (weight of social context)
  "fatigue"      // 0 .. 2  (tired / drained)
];

/**
 * Helper: create empty state vector (neutral).
 */
export function emptyState() {
  return {
    valence: 0,
    arousal: 0,
    tension: 0,
    agency: 0,
    self_blame: 0,
    other_blame: 0,
    certainty: 1, // по умолчанию лёгкая ясность
    socialness: 0,
    fatigue: 0
  };
}

/**
 * Clamp state to allowed ranges.
 */
export function clampState(state) {
  const clamped = { ...state };

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  clamped.valence    = clamp(clamped.valence,   -3, 3);
  clamped.arousal    = clamp(clamped.arousal,    0, 3);
  clamped.tension    = clamp(clamped.tension,    0, 3);
  clamped.agency     = clamp(clamped.agency,     0, 2);
  clamped.self_blame = clamp(clamped.self_blame, 0, 2);
  clamped.other_blame= clamp(clamped.other_blame,0, 2);
  clamped.certainty  = clamp(clamped.certainty,  0, 2);
  clamped.socialness = clamp(clamped.socialness, 0, 2);
  clamped.fatigue    = clamp(clamped.fatigue,    0, 2);

  return clamped;
}

/**
 * Base emotion centroids in this dimensional space.
 * Эти значения можно потом постепенно тюнить по ощущениям/данным.
 */
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

/**
 * Compute squared distance between state and centroid.
 */
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

/**
 * Convert distance to similarity 0..1.
 */
function distanceToSimilarity(dist) {
  // 0 -> 1, grows towards 0 as dist increases
  return 1 / (1 + Math.sqrt(dist));
}

/**
 * Rank all emotions by similarity to given state vector.
 */
export function rankEmotions(stateVec) {
  const scores = Object.entries(EMOTION_CENTROIDS).map(([key, centroid]) => {
    const dist = squaredDistance(stateVec, centroid);
    const score = distanceToSimilarity(dist);
    return { key, score };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores;
}
