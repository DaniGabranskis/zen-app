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
  "fatigue",
  "fear_bias"
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
    fatigue: 0,
    fear_bias: 0
  }
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
    fatigue:    clamp(state.fatigue    ?? 0,  0, 2),
    fear_bias:  clamp(state.fear_bias  ?? 0,  0, 3)
  }
}

// ---------- TAG_RULES ----------

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
  }
};


// ---------- EMOTION_CENTROIDS ----------

const EMOTION_CENTROIDS = {
  anxiety: {
    valence: -2, arousal: 3, tension: 3, agency: 0,
    self_blame: 1, other_blame: 0, certainty: 0,
    socialness: 1, fatigue: 0
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
    fatigue: 0.2
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
    fatigue: 2.3    // stronger exhaustion, closer to "shut down"
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
    fatigue: 1.2     // was 1
  },
  overwhelm: {
    valence: -2, arousal: 3, tension: 3, agency: 0,
    self_blame: 0, other_blame: 0, certainty: 0,
    socialness: 0, fatigue: 2
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
    fatigue: 2.6
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
    fatigue: 1
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
    fatigue: 0.4
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

function softmaxFromScores(pairs, temperature = 1.2, eps = 1e-6) {
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
