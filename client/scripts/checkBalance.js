// scripts/checkBalance.js
// Standalone balance checker. Uses same logic as new evidenceEngine,
// but does NOT import app modules (to avoid RN/Node import conflicts).

const fs = require('fs');
const path = require('path');

// ---------- Paths to L1 / L2 -----------

const L1_PATH = path.join(__dirname, '../src/data/flow/L1.json');
const L2_PATH = path.join(__dirname, '../src/data/flow/L2.json');

// ---------- DIMENSIONS & helpers ----------

const DIMENSIONS = [
  "valence",
  "arousal",
  "tension",
  "agency",
  "self_blame",
  "other_blame",
  "certainty",
  "socialness",
  "fatigue"
];

function emptyState() {
  return {
    valence: 0,
    arousal: 0,
    tension: 0,
    agency: 0,
    self_blame: 0,
    other_blame: 0,
    certainty: 1,
    socialness: 0,
    fatigue: 0
  };
}

function clampState(state) {
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

// ---------- TAG_RULES (как в evidenceEngine.js) ----------

const TAG_RULES = {
  // L1

  L1_MOOD_NEG: { valence: -2 },
  L1_MOOD_POS: { valence: +2 },

  L1_BODY_TENSION: { tension: +2 },
  L1_BODY_RELAXED: { tension: -1 },

  L1_ENERGY_LOW:  { arousal: -1, fatigue: +1 },
  L1_ENERGY_HIGH: { arousal: +2 },

  L1_CONTROL_HIGH: { agency: +2, tension: 0 },
  L1_CONTROL_LOW:  { agency: -1, tension: +1 },

  L1_SOCIAL_SUPPORT: { socialness: +2, valence: +1 },
  L1_SOCIAL_THREAT:  { socialness: +2, valence: -1, tension: +1 },

  // L2

  L2_FOCUS_FUTURE: { arousal: +1, tension: +1 },
  L2_FOCUS_PAST:   { fatigue: +1, valence: -1 },

  L2_SOURCE_PEOPLE: { other_blame: +2, socialness: +1 },
  L2_SOURCE_TASKS:  { other_blame: +1, tension: +1 },

  L2_UNCERT_HIGH: { certainty: 0, tension: +1 },
  L2_UNCERT_LOW:  { certainty: +2 },

  L2_SOCIAL_PAIN_YES: { socialness: +2, valence: -2, tension: +1 },
  L2_SOCIAL_PAIN_NO:  {},

  L2_SHUTDOWN: { fatigue: +2, tension: 0, agency: -1 },
  L2_FLOODING: { arousal: +1, tension: +1 },

  L2_GUILT: { self_blame: +2, valence: -2 },
  L2_SHAME: { self_blame: +2, valence: -2, socialness: +2 },

  L2_POS_GRATITUDE: { valence: +2, certainty: +1, socialness: +1 },
  L2_POS_JOY:       { valence: +3, arousal: +2, socialness: +2 },

  L2_REGULATION_GOOD: { agency: +1, tension: -1 },
  L2_REGULATION_BAD:  { agency: -1, tension: +1 },
  L2_CLARITY_HIGH:    { certainty: +2 },
  L2_CLARITY_LOW:     { certainty: 0 }
};

// ---------- EMOTION_CENTROIDS (из emotionSpace.js) ----------

const EMOTION_CENTROIDS = {
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

// ---------- Core math ----------

function buildStateFromTags(tags) {
  const unique = Array.from(new Set(tags || []));
  let state = emptyState();

  for (const t of unique) {
    const rule = TAG_RULES[t];
    if (!rule) continue;
    for (const dim of Object.keys(rule)) {
      state[dim] = (state[dim] ?? 0) + rule[dim];
    }
  }
  return clampState(state);
}

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

function similarityToEmotion(state, centroid) {
  const dist = squaredDistance(state, centroid);
  return 1 / (1 + Math.sqrt(dist));
}

function rankEmotions(state) {
  const scores = Object.entries(EMOTION_CENTROIDS).map(([key, centroid]) => ({
    key,
    score: similarityToEmotion(state, centroid)
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

function softmaxFromScores(pairs, temperature = 0.9, eps = 1e-6) {
  if (!pairs || pairs.length === 0) return [];
  const scaled = pairs.map(({ key, score }) => ({
    key,
    v: Math.exp((score / Math.max(temperature, 0.1)) || 0)
  }));
  const sum = scaled.reduce((acc, x) => acc + x.v, 0) + eps;
  return scaled.map(({ key, v }) => ({ key, p: v / sum }));
}

function classifyFromTags(tags) {
  const state = buildStateFromTags(tags);
  const rank = rankEmotions(state);
  const probs = softmaxFromScores(rank);
  const [p1, p2] = probs;
  return {
    state,
    ranked: probs,
    primary: p1 ? p1.key : null,
    secondary: p2 ? p2.key : null
  };
}

// ---------- Load L1 / L2 ----------

const L1 = JSON.parse(fs.readFileSync(L1_PATH, 'utf8'));
const L2 = JSON.parse(fs.readFileSync(L2_PATH, 'utf8'));
const ALL_CARDS = [...L1, ...L2];

function getCardOptions(card) {
  return (card.options || []).map(o => ({
    label: o.label,
    tags: o.tags || []
  }));
}

// ---------- Exploration ----------

const emotionCounts = {};
const emotionExamplePath = {};
let totalCombos = 0;

function explore(idx, accTags, accPath) {
  if (idx >= ALL_CARDS.length) {
    totalCombos += 1;
    const { primary } = classifyFromTags(accTags);
    const emo = primary || 'unknown';
    emotionCounts[emo] = (emotionCounts[emo] || 0) + 1;
    if (!emotionExamplePath[emo]) {
      emotionExamplePath[emo] = accPath.slice();
    }
    return;
  }

  const card = ALL_CARDS[idx];
  const opts = getCardOptions(card);
  for (const opt of opts) {
    explore(
      idx + 1,
      accTags.concat(opt.tags || []),
      accPath.concat({
        id: card.id,
        label: opt.label
      })
    );
  }
}

console.log('Starting brute-force over all L1+L2 combinations...');
explore(0, [], []);
console.log(`Total combinations: ${totalCombos}`);

const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);

console.log('\n=== Emotion distribution (primary) ===');
for (const [emo, count] of sorted) {
  const pct = ((count / totalCombos) * 100).toFixed(2);
  console.log(`${emo.padEnd(12)} : ${String(count).padStart(5)} (${pct}%)`);
}

const ALL_EMOTIONS = [
  'anxiety','tension','fear',
  'anger','frustration','irritation',
  'sadness','disappointment','loneliness',
  'disconnection','confusion','overwhelm','tiredness',
  'guilt','shame',
  'calm','clarity','gratitude','joy','contentment'
];

const missing = ALL_EMOTIONS.filter(e => !emotionCounts[e]);
if (missing.length > 0) {
  console.log('\nEmotions with NO primary hits:');
  console.log(missing.join(', '));
} else {
  console.log('\nAll 20 emotions are reachable as primary.');
}

console.log('\n=== Example path per emotion ===');
for (const emo of ALL_EMOTIONS) {
  const pathInfo = emotionExamplePath[emo];
  if (!pathInfo) {
    console.log(`\n[${emo}] no example path`);
    continue;
  }
  console.log(`\n[${emo}] example path:`);
  for (const step of pathInfo) {
    console.log(`  ${step.id.padEnd(16)} -> ${step.label}`);
  }
}
