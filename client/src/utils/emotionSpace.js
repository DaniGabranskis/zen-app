export const DIMENSIONS = [
  "valence",     // -3 (very negative) .. +3 (very positive)
  "arousal",     // 0 .. 3 (energy)
  "tension",     // 0 .. 3 (muscle tension / stress)
  "agency",      // 0 .. 2 (sense of control)
  "self_blame",  // 0 .. 2
  "other_blame", // 0 .. 2
  "certainty",   // 0 .. 2 (clarity)
  "socialness",  // 0 .. 2 (social context weight)
  "fatigue"      // 0 .. 2 (tired/low energy)
];

// Base emotion centroids. Tweak over time with real data.
export const EMOTION_CENTROIDS = {
  anxiety:        { valence:-2, arousal:3, tension:3, agency:0, self_blame:1, other_blame:0, certainty:0, socialness:1, fatigue:0 },
  tension:        { valence:-1, arousal:2, tension:3, agency:1, self_blame:0, other_blame:0, certainty:1, socialness:0, fatigue:0 },
  fear:           { valence:-3, arousal:3, tension:3, agency:0, self_blame:0, other_blame:0, certainty:0, socialness:1, fatigue:0 },
  anger:          { valence:-2, arousal:3, tension:3, agency:2, self_blame:0, other_blame:2, certainty:2, socialness:1, fatigue:0 },
  frustration:    { valence:-2, arousal:2, tension:2, agency:1, self_blame:0, other_blame:1, certainty:1, socialness:0, fatigue:0 },
  irritation:     { valence:-1, arousal:2, tension:2, agency:1, self_blame:0, other_blame:1, certainty:2, socialness:0, fatigue:0 },
  sadness:        { valence:-3, arousal:1, tension:1, agency:0, self_blame:1, other_blame:0, certainty:1, socialness:0, fatigue:1 },
  disappointment: { valence:-2, arousal:1, tension:1, agency:0, self_blame:0, other_blame:0, certainty:2, socialness:0, fatigue:1 },
  loneliness:     { valence:-2, arousal:1, tension:1, agency:0, self_blame:0, other_blame:0, certainty:1, socialness:2, fatigue:1 },
  disconnection:  { valence:-2, arousal:1, tension:1, agency:0, self_blame:0, other_blame:0, certainty:0, socialness:2, fatigue:1 },
  confusion:      { valence:-1, arousal:2, tension:2, agency:0, self_blame:0, other_blame:0, certainty:0, socialness:0, fatigue:0 },
  overwhelm:      { valence:-2, arousal:3, tension:3, agency:0, self_blame:0, other_blame:0, certainty:0, socialness:1, fatigue:1 },
  tiredness:      { valence:-1, arousal:0, tension:1, agency:0, self_blame:0, other_blame:0, certainty:1, socialness:0, fatigue:2 },
  guilt:          { valence:-2, arousal:2, tension:2, agency:0, self_blame:2, other_blame:0, certainty:2, socialness:1, fatigue:0 },
  shame:          { valence:-3, arousal:2, tension:2, agency:0, self_blame:2, other_blame:0, certainty:2, socialness:2, fatigue:0 },
  calm:           { valence:+2, arousal:0, tension:0, agency:1, self_blame:0, other_blame:0, certainty:2, socialness:0, fatigue:0 },
  clarity:        { valence:+2, arousal:1, tension:0, agency:1, self_blame:0, other_blame:0, certainty:2, socialness:0, fatigue:0 },
  gratitude:      { valence:+3, arousal:1, tension:0, agency:1, self_blame:0, other_blame:0, certainty:2, socialness:2, fatigue:0 },
  joy:            { valence:+3, arousal:2, tension:0, agency:2, self_blame:0, other_blame:0, certainty:2, socialness:2, fatigue:0 },
  contentment:    { valence:+2, arousal:1, tension:0, agency:1, self_blame:0, other_blame:0, certainty:2, socialness:1, fatigue:0 },
};

// Create zero vector
export function zeroVector() {
  const v = {};
  DIMENSIONS.forEach((d) => (v[d] = 0));
  return v;
}

const MAX_ABS = 6;          // soft cap per dimension
const SMOOTH = 0.85;        // smoothing factor to avoid jumps

// Add tags/deltas into state vector
export function accumulate(v, d) {
  const out = { ...v };
  for (const k of Object.keys(out)) {
    const raw = (out[k] ?? 0) + (d[k] ?? 0);
    // smooth toward new value
    const smoothed = out[k] + (raw - out[k]) * (1 - SMOOTH);
    // clamp
    out[k] = Math.max(-MAX_ABS, Math.min(MAX_ABS, smoothed));
  }
  return out;
}

// Simple similarity: negative L2 distance inverted to a [0..1] score
export function similarityToEmotion(stateVec, centroid) {
  let sumSq = 0;
  DIMENSIONS.forEach((d) => {
    const diff = (stateVec[d] ?? 0) - (centroid[d] ?? 0);
    sumSq += diff * diff;
  });
  // Convert distance to similarity: 1 / (1 + sqrt(dist))
  return 1 / (1 + Math.sqrt(sumSq));
}

// Get best emotion + confidence
export function rankEmotions(stateVec) {
  const scores = Object.entries(EMOTION_CENTROIDS).map(([key, c]) => ({
    key,
    score: similarityToEmotion(stateVec, c),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores; // sorted desc
}
