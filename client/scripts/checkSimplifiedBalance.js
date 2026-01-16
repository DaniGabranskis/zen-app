// scripts/checkSimplifiedBalance.js
// Check state balance for simplified flows (morning and evening)
// Simulates all possible paths and reports state distribution

// Task W0: Use canonical implementations - NO local copies of routing logic
// Task W0.5: This file MUST NOT contain:
//   - function routeStateFromBaseline
//   - function shouldReturnUncertainBaseline
//   - function rankStates (local implementation)
// Any routing logic must come from canonical baselineEngine.js and stateSpace.js
//
// Task W0.5: Sanity check - if you see any of these functions defined in this file, it's a violation:
//   - routeStateFromBaseline (must use routeStateFromBaselineCanonical)
//   - shouldReturnUncertainBaseline (must come from baselineEngine)
//   - rankStates (must come from stateSpace)
// This is enforced at runtime: simulateSimplifiedFlow checks routeStateFromBaselineCanonical is initialized.

const fs = require('fs');
const path = require('path');

// Task W0.2: Import canonical routeStateFromBaseline using dynamic import
// This will be initialized before main() runs
let routeStateFromBaselineCanonical = null;

// ---------- Paths ----------
const L1_PATH = path.join(__dirname, '../src/data/flow/L1.json');
const L2_PATH = path.join(__dirname, '../src/data/flow/L2.json');

// ---------- DIMENSIONS ----------
const DIMENSIONS = [
  'valence',     // -3..+3
  'arousal',     // 0..3
  'tension',     // 0..3
  'agency',      // 0..2
  'self_blame',  // 0..2
  'other_blame', // 0..2
  'certainty',   // 0..2
  'socialness',  // 0..2
  'fatigue',     // 0..3
  'fear_bias',   // 0..3
];

function emptyState() {
  return {
    valence: 0,
    arousal: 0,
    tension: 0,
    agency: 0,
    self_blame: 0,
    other_blame: 0,
    certainty: 0, // Changed from 1 to 0 for better balance
    socialness: 0,
    fatigue: 0,
    fear_bias: 0,
  };
}

function clampState(state) {
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
    fatigue: clamp(state.fatigue ?? 0, 0, 3),
    fear_bias: clamp(state.fear_bias ?? 0, 0, 3),
  };
}

// ---------- STATE CENTROIDS (synced with stateSpace.js) ----------
// Updated to match current stateSpace.js values
const STATE_CENTROIDS = {
  grounded: {
    valence: 2.1, arousal: 0.6, tension: 0.2, agency: 1.9,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.9,
    socialness: 0.9, fatigue: 0.1, fear_bias: 0.0,
  },
  engaged: {
    valence: 1.4, arousal: 1.8, tension: 0.8, agency: 1.4,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.4,
    socialness: 1.0, fatigue: 0.0, fear_bias: 0.0,
  },
  connected: {
    valence: 1.2, arousal: 1.0, tension: 0.5, agency: 1.2,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.4,
    socialness: 2.0, fatigue: 0.0, fear_bias: 0.0,
  },
  capable: {
    valence: 1.0, arousal: 1.3, tension: 0.5, agency: 2.0,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.7,
    socialness: 0.9, fatigue: 0.0, fear_bias: 0.0,
  },
  pressured: {
    valence: -0.8, arousal: 1.6, tension: 2.1, agency: 1.1,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.1,
    socialness: 0.6, fatigue: 0.3, fear_bias: 0.0,
  },
  threatened: {
    valence: -2.3, arousal: 2.0, tension: 2.4, agency: 0.2,
    self_blame: 0.4, other_blame: 0.0, certainty: 0.6,
    socialness: 0.7, fatigue: 0.2, fear_bias: 2.2,
  },
  // Task M1: Baseline-compatible overloaded (high fatigue implies arousal ~ 0)
  overloaded: {
    valence: -2.0,
    arousal: 0.0,  // Task M1: Baseline energy splits into arousal OR fatigue, so fatigue-high → arousal=0
    tension: 2.3,
    agency: 0.3,
    self_blame: 0.0,
    other_blame: 0.0,
    certainty: 0.7,
    socialness: 0.6,
    fatigue: 1.8,  // Task M1: High fatigue (baseline-compatible)
    fear_bias: 0.0,
  },
  blocked: {
    valence: -1.5, arousal: 1.8, tension: 2.3, agency: 0.2,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.0,
    socialness: 0.5, fatigue: 0.1, fear_bias: 0.0,
  },
  confrontational: {
    valence: -2.4, arousal: 2.0, tension: 2.4, agency: 1.8,
    self_blame: 0.0, other_blame: 1.8, certainty: 1.7,
    socialness: 0.8, fatigue: 0.2, fear_bias: 0.3,
  },
  down: {
    valence: -2.4, arousal: 0.6, tension: 1.1, agency: 0.2,
    self_blame: 0.0, other_blame: 0.0, certainty: 0.9,
    socialness: 0.7, fatigue: 1.4, fear_bias: 0.0,
  },
  exhausted: {
    valence: -1.4, arousal: 0.2, tension: 0.8, agency: 0.3,
    self_blame: 0.0, other_blame: 0.0, certainty: 0.9,
    socialness: 0.4, fatigue: 2.1, fear_bias: 0.0,
  },
  self_critical: {
    valence: -2.2, arousal: 1.4, tension: 1.8, agency: 0.3,
    self_blame: 1.9, other_blame: 0.0, certainty: 1.3,
    socialness: 1.0, fatigue: 0.9, fear_bias: 0.8,
  },
  detached: {
    valence: -0.9, arousal: 0.4, tension: 0.6, agency: 0.4,
    self_blame: 0.0, other_blame: 0.0, certainty: 0.8,
    socialness: 0.2, fatigue: 1.4, fear_bias: 0.0,
  },
  uncertain: {
    valence: -0.3, arousal: 1.1, tension: 1.3, agency: 0.8,
    self_blame: 0.0, other_blame: 0.0, certainty: 0.7,
    socialness: 0.8, fatigue: 0.6, fear_bias: 0.0,
  },
  averse: {
    valence: -2.0, arousal: 1.4, tension: 1.9, agency: 0.9,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.4,
    socialness: 0.6, fatigue: 0.1, fear_bias: 0.0,
  },
};

// ---------- TAG RULES (simplified version, only tags used in L1/L2) ----------
const TAG_RULES = {
  // L1 tags
  L1_MOOD_NEG: { valence: -1.2, arousal: +0.2, tension: +0.3, fatigue: +0.3, certainty: -0.2 },
  L1_MOOD_POS: { valence: +1.6, arousal: +0.3, tension: -0.7, fatigue: -0.5, certainty: +0.4, agency: +0.4 },
  L1_BODY_TENSION: { tension: +1.6 },
  L1_BODY_RELAXED: { tension: -1.1 },
  L1_ENERGY_LOW: { arousal: -0.7, fatigue: +1.8 },
  L1_ENERGY_HIGH: { arousal: +2.3 },
  L1_CONTROL_HIGH: { agency: +2, tension: -0.2 },
  L1_CONTROL_LOW: { agency: -0.7, tension: +0.7 },
  L1_SOCIAL_SUPPORT: { socialness: +1.2, valence: +0.8, agency: +0.5, certainty: +0.4 },
  L1_SOCIAL_THREAT: { socialness: +0.3, valence: -0.4, other_blame: +0.3, certainty: -0.2, tension: +0.3 },
  L1_SAFETY_LOW: { valence: -0.8, arousal: +1.0, tension: +1.0, certainty: -0.5, fear_bias: +0.55 },
  L1_SAFETY_HIGH: { valence: +1.0, arousal: -0.6, tension: -1.0, certainty: +0.6 },
  L1_WORTH_LOW: { valence: -0.8, self_blame: +0.6, tension: +0.3, certainty: -0.2 },
  L1_WORTH_HIGH: { valence: +1.0, agency: +0.5, certainty: +0.4 },
  L1_EXPECT_LOW: { valence: -0.8, arousal: +0.5, tension: +1.0, self_blame: +0.3, other_blame: +0.6, fatigue: +0.2 },
  L1_EXPECT_OK: { valence: +0.4, tension: -0.3, fatigue: -0.3 },
  L1_PRESSURE_HIGH: { arousal: +1.0, tension: +1.0, fatigue: +0.5, valence: -0.5 },
  L1_PRESSURE_LOW: { arousal: -0.6, tension: -0.9, fatigue: -0.6, valence: +0.6, agency: +0.4, certainty: +0.3 },
  L1_CLARITY_LOW: { certainty: -0.6, tension: +0.6, fatigue: +0.5, valence: -0.1 },
  L1_CLARITY_HIGH: { certainty: +1.2, tension: -0.5, valence: +0.7, agency: +0.5 },

  // L2 tags
  L2_FOCUS_FUTURE: { arousal: +0.7, tension: +0.7 },
  L2_FOCUS_PAST: { fatigue: +0.8, valence: -0.7 },
  L2_SOURCE_PEOPLE: { other_blame: +0.8, socialness: +1 },
  L2_SOURCE_TASKS: { other_blame: +0.3, tension: +0.4 },
  L2_UNCERTAINTY_HIGH: { certainty: -1.1, arousal: 0.3, tension: 0.4 },
  L2_UNCERTAINTY_LOW: { certainty: 0.7, tension: -0.4 },
  L2_SOCIAL_PAIN_YES: { socialness: +0.3, valence: -0.8, tension: +0.8, fatigue: +0.3 },
  L2_SOCIAL_PAIN_NO: {},
  L2_SHUTDOWN: { fatigue: +1.6, tension: -0.3, agency: -0.8, arousal: -0.4 },
  L2_PRESENT: { certainty: +0.4, tension: -0.3, agency: +0.3 },
  L2_NUMB_YES: { arousal: -0.9, certainty: -1.0, agency: -1.0, fatigue: +1.8, tension: -0.3, socialness: -0.5 },
  L2_NUMB_NO: { certainty: +0.4, tension: -0.3, agency: +0.3, socialness: +0.5 },
  L2_HEAVY_YES: { fatigue: +1.8, tension: +0.5, valence: -0.5, arousal: -0.3 },
  L2_HEAVY_NO: { fatigue: -0.3, tension: -0.2, valence: +0.2 },
  L2_SELF_BLAME_YES: { self_blame: +0.8, valence: -0.4, tension: +0.3 },
  L2_SELF_BLAME_NO: { self_blame: -0.6, valence: +0.2, tension: -0.2 },
  L2_GUILT: { self_blame: +0.40, valence: -0.1, certainty: +0.1 },
  L2_SHAME: { self_blame: +0.55, valence: -0.2, certainty: -0.2, tension: +0.2 },
  L2_POS_GRATITUDE: { valence: +0.3, certainty: +0.3, socialness: +0.25 },
  L2_POS_JOY: { valence: +0.9, arousal: +0.35, socialness: +0.5 },
  L2_REGULATION_GOOD: { agency: +1.2, tension: -1.0 },
  L2_REGULATION_BAD: { agency: -0.8, tension: +0.8 },
  L2_REGULATION_HIGH: { agency: +1.2, tension: -1.0 }, // Alias
  L2_REGULATION_LOW: { agency: -0.8, tension: +0.8 }, // Alias
  L2_CLARITY_HIGH: { certainty: 0.7, tension: -0.3 },
  L2_CLARITY_LOW: { certainty: -0.7, tension: +0.6, fatigue: +0.4 },
  L2_FOCUS_FUTURE: { arousal: +0.7, tension: +0.7 },
  L2_FOCUS_PAST: { fatigue: +0.8, valence: -0.7 },
  L2_POSITIVE_SOME: { valence: +0.3, certainty: +0.2 },
  L2_POSITIVE_NONE: { valence: -0.7, fatigue: +0.7, arousal: -0.2 },
  L2_NO_POSITIVE: { valence: -0.7, fatigue: +0.7, arousal: -0.2 }, // Alias
  L2_MEANING_LOW: { valence: -1.0, certainty: -0.6, fatigue: +0.5 },
  L2_MEANING_HIGH: { valence: +1.1, certainty: +0.7 },
};

// ---------- Helper functions ----------
function squaredDistance(state, centroid) {
  let sumSq = 0;

  for (const dim of DIMENSIONS) {
    const sRaw = state[dim];
    const cRaw = centroid[dim];

    const s = Number.isFinite(sRaw) ? sRaw : 0;
    const c = Number.isFinite(cRaw) ? cRaw : 0;

    const d = s - c;
    sumSq += d * d;
  }

  return sumSq;
}

function similarity(stateVec, centroid) {
  const dist = squaredDistance(stateVec, centroid);
  const sqrtDist = Number.isFinite(dist) ? Math.sqrt(dist) : 0;
  const result = 1 / (1 + sqrtDist);
  return Number.isFinite(result) ? result : 0;
}

// Eligibility gates (quantization-aware thresholds)
// BASELINE QUANTIZATION: Arousal {0, 0.667, 1.333, 2.0}, Fatigue {0, 0.733, 1.467, 2.2}
function levelizeStateVec(stateVec) {
  const v = stateVec?.valence ?? 0;
  const ar = stateVec?.arousal ?? 0;
  const t = stateVec?.tension ?? 0;
  const ag = stateVec?.agency ?? 0;
  const s = stateVec?.socialness ?? 0;
  const f = stateVec?.fatigue ?? 0;
  const c = stateVec?.certainty ?? 0;

  return {
    Vneg: v <= -0.8,
    Vpos: v >= 0.8,
    Vmid: v > -0.8 && v < 0.8,
    // Arousal: < 0.35 (zero), >= 1.7 (high)
    Ar_low: ar < 0.35,
    Ar_high: ar >= 1.7,
    Ar_mid: ar >= 0.35 && ar < 1.7,
    // Tension: < 0.6 (low), >= 1.8 (high)
    T_low: t < 0.6,
    T_high: t >= 1.8,
    T_mid: t >= 0.6 && t < 1.8,
    // Agency: < 0.5 (low), >= 1.5 (high)
    Ag_low: ag < 0.5,
    Ag_high: ag >= 1.5,
    Ag_mid: ag >= 0.5 && ag < 1.5,
    // Socialness: < 0.5 (low), >= 1.5 (high)
    S_low: s < 0.5,
    S_high: s >= 1.5,
    S_mid: s >= 0.5 && s < 1.5,
    // Fatigue: < 0.35 (zero), >= 1.2 (high)
    F_low: f < 0.35,
    F_high: f >= 1.2,
    F_mid: f >= 0.35 && f < 1.2,
    // Certainty: < 0.5 (low), >= 1.5 (high)
    C_low: c < 0.5,
    C_high: c >= 1.5,
    C_mid: c >= 0.5 && c < 1.5,
  };
}

function getEligibility(stateKey, levels, mode = 'baseline') {
  const DEEP_ONLY_STATES = ['threatened', 'self_critical', 'confrontational'];
  if (mode === 'baseline' && DEEP_ONLY_STATES.includes(stateKey)) {
    return { eligible: false, reasons: ['deep-only state in baseline mode'] };
  }

  switch (stateKey) {
    case 'connected':
      if (!levels.S_high) return { eligible: false, reasons: ['needs S_high'] };
      if (levels.F_high) return { eligible: false, reasons: ['blocked by fatigue high'] };
      if (levels.T_high) return { eligible: false, reasons: ['blocked by tension high'] };
      if (levels.Vneg) return { eligible: false, reasons: ['blocked by negative valence'] };
      return { eligible: true, reasons: [] };
    case 'exhausted':
      if (!levels.F_high) return { eligible: false, reasons: ['needs F_high'] };
      if (!levels.Ar_low) return { eligible: false, reasons: ['needs Ar_low'] };
      return { eligible: true, reasons: [] };
    case 'engaged':
      if (!levels.Vpos) return { eligible: false, reasons: ['needs Vpos'] };
      if (!levels.Ar_high) return { eligible: false, reasons: ['needs Ar_high'] };
      if (levels.T_high) return { eligible: false, reasons: ['blocked by tension high'] };
      if (levels.F_high) return { eligible: false, reasons: ['blocked by fatigue high'] };
      if (levels.Ag_low) return { eligible: false, reasons: ['blocked by agency low'] };
      return { eligible: true, reasons: [] };
    case 'capable':
      if (!levels.Ag_high) return { eligible: false, reasons: ['needs Ag_high'] };
      if (levels.T_high) return { eligible: false, reasons: ['blocked by tension high'] };
      if (levels.F_high) return { eligible: false, reasons: ['blocked by fatigue high'] };
      if (levels.Vneg) return { eligible: false, reasons: ['blocked by negative valence'] };
      return { eligible: true, reasons: [] };
    case 'grounded':
      if (!levels.T_low) return { eligible: false, reasons: ['needs T_low'] };
      if (!levels.Ag_high) return { eligible: false, reasons: ['needs Ag_high'] };
      if (levels.Ar_high) return { eligible: false, reasons: ['blocked by arousal high'] };
      if (levels.F_high) return { eligible: false, reasons: ['blocked by fatigue high'] };
      if (levels.Vneg) return { eligible: false, reasons: ['blocked by negative valence'] };
      return { eligible: true, reasons: [] };
    case 'pressured':
      if (!levels.T_high) return { eligible: false, reasons: ['needs T_high'] };
      if (levels.Ar_low) return { eligible: false, reasons: ['blocked by arousal low'] };
      if (levels.Ag_low) return { eligible: false, reasons: ['blocked by agency low'] };
      if (levels.F_high) return { eligible: false, reasons: ['blocked by fatigue high'] };
      return { eligible: true, reasons: [] };
    case 'blocked':
      if (!levels.T_high) return { eligible: false, reasons: ['needs T_high'] };
      if (!levels.Ag_low) return { eligible: false, reasons: ['needs Ag_low'] };
      if (levels.Ar_low) return { eligible: false, reasons: ['blocked by arousal low'] };
      if (levels.F_high) return { eligible: false, reasons: ['blocked by fatigue high'] };
      return { eligible: true, reasons: [] };
    case 'overloaded':
      // Task M2: Simplified eligibility for overloaded (baseline-compatible)
      // Overloaded = high fatigue + high tension + low agency, negative valence.
      // In baseline mapping, fatigue > 0 implies arousal == 0, so do NOT block Ar_low.
      if (!levels.T_high) return { eligible: false, reasons: ['needs T_high'] };
      if (levels.Vpos) return { eligible: false, reasons: ['blocked by positive valence'] };
      if (!levels.F_high) return { eligible: false, reasons: ['needs F_high'] };
      if (!levels.Ag_low) return { eligible: false, reasons: ['needs Ag_low'] };
      if (!levels.Vneg) return { eligible: false, reasons: ['needs Vneg'] };
      // Optional: keeps it out of "clear but tired" (reduces overlap with exhausted)
      if (levels.C_high) return { eligible: false, reasons: ['blocked by certainty high'] };
      // Task M2: Do NOT block Ar_low - for baseline this is normal when fatigue is high
      return { eligible: true, reasons: [] };
    case 'down':
      if (!levels.Vneg) return { eligible: false, reasons: ['needs Vneg'] };
      if (!levels.Ag_low) return { eligible: false, reasons: ['needs Ag_low'] };
      if (!levels.F_mid && !levels.F_high && !levels.Ar_low) return { eligible: false, reasons: ['needs F_mid or F_high or Ar_low'] };
      return { eligible: true, reasons: [] };
    case 'averse':
      if (!levels.Vneg) return { eligible: false, reasons: ['needs Vneg'] };
      if (levels.Ar_low) return { eligible: false, reasons: ['blocked by arousal low'] };
      if (!levels.T_mid && !levels.T_high) return { eligible: false, reasons: ['needs T_mid or T_high'] };
      return { eligible: true, reasons: [] };
    case 'detached':
      if (!levels.S_low) return { eligible: false, reasons: ['needs S_low'] };
      if (!levels.Ar_low && !levels.Ar_mid) return { eligible: false, reasons: ['needs Ar_low or Ar_mid'] };
      if (!levels.T_low && !levels.T_mid) return { eligible: false, reasons: ['needs T_low or T_mid'] };
      if (levels.Ar_high) return { eligible: false, reasons: ['blocked by arousal high'] };
      if (levels.Vpos) return { eligible: false, reasons: ['blocked by positive valence'] };
      return { eligible: true, reasons: [] };
    case 'uncertain':
      return { eligible: true, reasons: [] };
    case 'threatened':
    case 'self_critical':
    case 'confrontational':
      if (mode === 'baseline') return { eligible: false, reasons: ['deep-only state in baseline mode'] };
      return { eligible: true, reasons: [] };
    default:
      return { eligible: true, reasons: [] };
  }
}

// Task W0.2: rankStates removed - use canonical import from stateSpace.js
// Task W0.5: This function MUST NOT exist here - use rankStatesCanonical instead

function normalizeProbs(scores) {
  const sum = scores.reduce((a, s) => a + (Number.isFinite(s.score) ? s.score : 0), 0) || 1;
  const probs = {};
  for (const s of scores) probs[s.key] = (s.score || 0) / sum;
  return probs;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ---------- Baseline conversion (9-point scale) ----------
const BASELINE_SCALE = 9;
const BASELINE_MID = Math.round(BASELINE_SCALE / 2); // 5

function normBaseline(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return BASELINE_MID;
  return clamp(Math.round(n), 1, BASELINE_SCALE);
}

function toUnit(v) {
  return (normBaseline(v) - 1) / (BASELINE_SCALE - 1); // (0..8) -> (0..1)
}

function baselineToVector(metrics) {
  const m = metrics || {};
  const valence = toUnit(m.valence);
  const energy = toUnit(m.energy);
  const tension = toUnit(m.tension);
  const clarity = toUnit(m.clarity);
  const control = toUnit(m.control);
  const social = toUnit(m.social);

  const vec = emptyState();
  vec.valence = (valence - 0.5) * 6;
  
  if (energy >= 0.5) {
    vec.arousal = (energy - 0.5) * 2 * 2.0;
  } else {
    vec.fatigue = (0.5 - energy) * 2 * 2.2;
  }
  
  vec.tension = tension * 2.4;
  vec.agency = control * 2.0;
  vec.certainty = clarity * 2.0;
  vec.socialness = social * 2.0;

  return clampState(vec);
}

function mergeBaselineAndEvidence(baselineVec, evidenceVec, weight = 0.35) {
  if (!evidenceVec) return baselineVec;

  const base = emptyState();
  const delta = {};
  for (const k of Object.keys(base)) {
    const e = Number.isFinite(evidenceVec[k]) ? evidenceVec[k] : base[k];
    delta[k] = e - base[k];
  }

  const merged = { ...(baselineVec || emptyState()) };
  for (const k of Object.keys(delta)) {
    const cur = Number.isFinite(merged[k]) ? merged[k] : base[k];
    merged[k] = cur + delta[k] * weight;
  }

  return clampState(merged);
}

// Task W0.2 + W0.3: routeStateFromBaseline REMOVED - use canonical import
// Task W0.5: This function MUST NOT exist here - use routeStateFromBaselineCanonical instead
// DELETED: All local routing logic (routeStateFromBaseline, shouldReturnUncertainBaseline, breakTieBySignals, isStrongSignalState)
// The canonical implementation in baselineEngine.js is the single source of truth.
// 
// If you see this comment and a function below, it means the deletion was incomplete.
// The entire function body (lines ~447-861) must be removed.

// ---------- Evidence from tags ----------
function buildStateFromTags(tags) {
  const unique = Array.from(new Set(tags || []));
  let state = emptyState();

  for (const t of unique) {
    const rule = TAG_RULES[t];
    if (!rule) continue;
    for (const [dim, delta] of Object.entries(rule)) {
      state[dim] = (state[dim] ?? 0) + delta;
    }
  }

  return clampState(state);
}

// ---------- Diagnostic plan builder (simplified) ----------
function buildDiagnosticPlan(baselineMetrics, sessionType) {
  if (sessionType === 'morning') return []; // Morning simplified skips diagnostics
  if (sessionType === 'evening') {
    // Evening simplified: 2 questions based on baseline
    const picks = [];
    const used = new Set();

    const distFromMid = (v) => Math.abs((v || BASELINE_MID) - BASELINE_MID);

    const candidates = [];
    // Updated thresholds for 9-point scale: <= 4 (low), >= 6 (high), mid = 5
    if (baselineMetrics.valence <= 4) candidates.push({ q: 'L2_heavy', severity: distFromMid(baselineMetrics.valence) });
    if (baselineMetrics.valence >= 6) candidates.push({ q: 'L2_positive_moments', severity: distFromMid(baselineMetrics.valence) });
    if (baselineMetrics.energy <= 4) candidates.push({ q: 'L2_regulation', severity: distFromMid(baselineMetrics.energy) });
    if (baselineMetrics.energy >= 6) candidates.push({ q: 'L2_focus', severity: distFromMid(baselineMetrics.energy) });
    if (baselineMetrics.tension >= 6) candidates.push({ q: 'L2_source', severity: distFromMid(baselineMetrics.tension) });
    if (baselineMetrics.clarity <= 4) candidates.push({ q: 'L2_uncertainty', severity: distFromMid(baselineMetrics.clarity) });
    if (baselineMetrics.clarity >= 6) candidates.push({ q: 'L2_clarity', severity: distFromMid(baselineMetrics.clarity) });
    if (baselineMetrics.control <= 4) candidates.push({ q: 'L2_regulation', severity: distFromMid(baselineMetrics.control) });
    if (baselineMetrics.social <= 4) candidates.push({ q: 'L2_numb', severity: distFromMid(baselineMetrics.social) });
    if (baselineMetrics.social >= 6) candidates.push({ q: 'L2_social_pain', severity: distFromMid(baselineMetrics.social) });

    candidates.sort((a, b) => b.severity - a.severity);
    
    for (const { q } of candidates) {
      if (used.has(q)) continue;
      picks.push(q);
      used.add(q);
      if (picks.length >= 2) break;
    }

    // Fallback if not enough
    const fallback = ['L1_mood', 'L1_body', 'L1_energy', 'L1_clarity'];
    for (const q of fallback) {
      if (used.has(q)) continue;
      picks.push(q);
      used.add(q);
      if (picks.length >= 2) break;
    }

    return picks.slice(0, 2);
  }
  return [];
}

// ---------- Load cards ----------
const L1 = JSON.parse(fs.readFileSync(L1_PATH, 'utf8'));
const L2 = JSON.parse(fs.readFileSync(L2_PATH, 'utf8'));
const ALL_CARDS = [...L1, ...L2];
const CARDS_BY_ID = {};
for (const card of ALL_CARDS) {
  CARDS_BY_ID[card.id] = card;
}

function getCardTags(cardId, optionIndex) {
  const card = CARDS_BY_ID[cardId];
  if (!card || !card.options || !card.options[optionIndex]) return [];
  return card.options[optionIndex].tags || [];
}

// ---------- Main simulation ----------
function simulateSimplifiedFlow(sessionType) {
  console.log(`\n=== Simulating ${sessionType.toUpperCase()} Simplified Flow ===\n`);
  
  const stateCounts = {};
  const stateDetails = {};
  let totalPaths = 0;
  
  // Gating diagnostics
  const eligibleCounts = { 0: 0, 1: 0, 2: 0, 3: 0, '4+': 0 };
  const ineligibilityReasons = {};
  let totalEligibleCount = 0;
  let totalVectorsChecked = 0;
  
  // Task B4: Collect stats for forcedUncertain cases
  const forcedUncertainStats = {
    delta: [],
    score1: [],
    certaintyRaw: [],
  };
  let allFilteredCount = 0; // Count all_filtered cases separately
  let finalFallbackCount = 0; // Task U3: Track final fallback usage
  let lastResortCount = 0; // Task U3: Track last resort usage
  const allFilteredSampleVectors = []; // Task R1: Sample baseline vectors for all_filtered cases
  
  // Task W0.4: Track selectionPath distribution
  const selectionPathCounts = { strict: 0, hard: 0, final_fallback: 0, last_resort: 0, none: 0 };
  
  // Task C2: Diagnostics for non-finite scores and ties
  let nonFiniteScoreCount = 0;
  let exactTie12Count = 0; // delta12 === 0
  let exactTieTop3Count = 0; // delta12 === 0 && delta23 === 0
  const score1Values = []; // For min/p05 calculation
  
  // Task I1.1: Score1 quantiles for all baseline decisions
  const score1All = []; // All score1 values
  const score1LowConfidence = []; // score1 for confidenceBand='low'
  const score1ForcedUncertain = []; // score1 for forcedUncertain=true
  const score1Counts = { // Count of score1 < threshold
    below004: 0,
    below005: 0,
    below006: 0,
    below008: 0,
  };
  
  // Task D2.4 + D2.7: Tie reporting
  let tieCount = 0;
  let tieResolvedCount = 0;
  let tieUnresolvedCount = 0; // Should be 0 after D2.5
  const tieWinnerHistogram = {}; // { stateKey: count }
  
  // Task H1: Forced uncertain breakdown and quality metrics
  const forcedUncertainReasonBreakdown = {}; // { reason: count }
  let forcedUncertainAfterTieTotal = 0;
  let forcedUncertainTotal = 0; // Task H1: Total forced uncertain cases
  const forcedUncertainScore1 = []; // Task H1: score1 for forced uncertain only
  const forcedUncertainDelta = []; // Task H1: delta for forced uncertain only
  const fallbackCandidateHistogram = {}; // Task H1: { stateKey: count } - what would have been chosen
  
  // Task I4: Confidence band distribution
  const confidenceBandDistribution = { high: 0, medium: 0, low: 0 };
  const lowConfidenceTopStates = {}; // Task I4: { stateKey: count } - states with low confidence
  
  // Task F3: Eligibility diagnostics aggregation
  const eligibilityReasonsBreakdown = {}; // { reason: count }
  
  // Task O1: Diagnostic for cases where stateKey === 'uncertain' but forcedUncertain === false
  const uncertainWithoutForceUncertainCases = [];
  const uncertainWithoutForceUncertainLimit = 50; // Sample up to 50 cases

  // Task P(B).4: Quality metrics — separate counters for clarity, confidence, and needs refine
  let uncertainStateCount = 0; // stateKey === 'uncertain' (should equal forcedUncertainCount)
  let forcedUncertainCount = 0; // forcedUncertain === true (should equal uncertainStateCount)
  let lowClarityCount = 0; // clarityFlag === 'low'
  let mediumClarityCount = 0; // clarityFlag === 'medium'
  let needsRefineCount = 0; // needsRefine === true
  let lowConfidenceCount = 0; // confidenceBand === 'low'
  let matchWarningCount = 0; // matchWarning != null
  
  // Task P(B).4: Intersections (minimal necessary)
  let lowClarityAndNeedsRefineCount = 0; // clarityFlag === 'low' && needsRefine === true
  let lowClarityAndLowConfidenceCount = 0; // clarityFlag === 'low' && confidenceBand === 'low'
  let uncertainStateAndLowClarityCount = 0; // stateKey === 'uncertain' && clarityFlag === 'low'
  
  // Task P(B).4: Top states among needsRefine (to see where model is most uncertain)
  const needsRefineTopStates = {}; // { stateKey: count } - states with needsRefine === true

  // Generate all baseline metric combinations (6 metrics, each 1-7)
  // 9-point scale with sampling (every 2nd point: 1, 3, 5, 7, 9)
  const SAMPLE_STEP = 2;
  const METRIC_VALUES = [];
  for (let i = 1; i <= BASELINE_SCALE; i += SAMPLE_STEP) {
    METRIC_VALUES.push(i);
  }
  // Also include middle point (5) if not already included
  if (!METRIC_VALUES.includes(BASELINE_MID)) {
    METRIC_VALUES.push(BASELINE_MID);
    METRIC_VALUES.sort((a, b) => a - b);
  }
  const BASELINE_COMBOS = [];
  
  function generateBaselines(idx, acc) {
    const metrics = ['valence', 'energy', 'tension', 'clarity', 'control', 'social'];
    if (idx >= metrics.length) {
      BASELINE_COMBOS.push({ ...acc });
      return;
    }
    for (const v of METRIC_VALUES) {
      acc[metrics[idx]] = v;
      generateBaselines(idx + 1, acc);
    }
  }
  
  generateBaselines(0, {});
  console.log(`Total baseline combinations: ${BASELINE_COMBOS.length}`);

  // Task T1: Control counters for input paths by mode
  let pathsMorningGenerated = 0;
  let pathsEveningGenerated = 0;
  let pathsMorningCounted = 0;
  let pathsEveningCounted = 0;

  // Task AA1: Eligibility health metrics - single source of truth: _selectionDiagnostics from rankStates
  // Definition: All metrics are counted from the ranked-pool eligibility (post-rescue counts)
  // This matches what actually influences the final selection in the real pipeline.
  
  // Task Y1: Pipeline coverage check - verify that routeStateFromBaseline always returns a valid stateKey
  let pipelineCoverageViolations = []; // Task Y1: Cases where routeStateFromBaseline fails to return stateKey
  const MAX_VIOLATIONS_TO_REPORT = 10;
  
  // Task AA2: Eligibility health metrics - counted from _selectionDiagnostics (canonical source)
  // Task AA3: Separate pre-rescue and post-rescue empties
  let preRescueStrictEmptyCount = 0; // strictCount=0 before any rescue/fallback
  let preRescueHardEmptyCount = 0; // hardCount=0 before any rescue/fallback
  let preRescueBothEmptyCount = 0; // strict=0 AND hard=0 before rescue
  let postRescueStrictEmptyCount = 0; // strictCount=0 after all rescue steps
  let postRescueHardEmptyCount = 0; // hardCount=0 after all rescue steps
  let postRescueBothEmptyCount = 0; // strict=0 AND hard=0 after all rescue steps (should correlate with fallback rates)
  
  // Task AA5: Track vectors that end up in postRescueBothEmpty for detailed dump
  let postRescueBothEmptyVectors = [];
  
  for (const baselineMetrics of BASELINE_COMBOS) {
    const diagnosticPlan = buildDiagnosticPlan(baselineMetrics, sessionType);
    
    // Task T1: Count generated paths
    if (sessionType === 'morning') {
      pathsMorningGenerated++;
    } else if (sessionType === 'evening') {
      pathsEveningGenerated++;
    }
    
    if (sessionType === 'morning') {
      // Morning: only baseline, no diagnostics
      // Task W0.2: Use canonical routeStateFromBaseline (NO local copy)
      if (!routeStateFromBaselineCanonical) {
        throw new Error('routeStateFromBaselineCanonical not initialized. Ensure main() is async and imports baselineEngine.');
      }
      const result = routeStateFromBaselineCanonical(baselineMetrics, {
        evidenceVector: null,
        evidenceWeight: 0.25,
      });
      
      const stateKey = result.stateKey;
      
      // Task S2: Assert - connected NEVER if F_high || T_high || Vneg
      // Task W5: Use result.vector directly (it's the final vector after all transformations)
      if (stateKey === 'connected') {
        const resultLevels = levelizeStateVec(result.vector);
        if (resultLevels.F_high || resultLevels.T_high || resultLevels.Vneg) {
          console.error('\n❌ TASK S2 FATAL: connected selected with semantic violation (morning)!');
          console.error('  stateKey === "connected" but (F_high || T_high || Vneg)');
          console.error('  Baseline:', baselineMetrics);
          console.error('  Vector:', result.vector || merged);
          console.error('  Levels:', resultLevels);
          console.error('  Eligibility pass:', result.eligibilityPass);
          console.error('  Top-1 key:', result.top1Key);
          console.error('  Top-2 key:', result.top2Key);
          console.error('  Score1:', result.score1);
          throw new Error('S2: Semantic violation - connected selected with F_high || T_high || Vneg (morning)');
        }
      }
      
      // Task O2.3: Diagnostic - check if stateKey === 'uncertain' but forcedUncertain !== true
      // Use !== true instead of === false to catch undefined cases
      if (stateKey === 'uncertain' && result.forcedUncertain !== true) {
        if (uncertainWithoutForceUncertainCases.length < uncertainWithoutForceUncertainLimit) {
          uncertainWithoutForceUncertainCases.push({
            baseline: { ...baselineMetrics },
            stateKey: result.stateKey,
            forcedUncertain: result.forcedUncertain,
            uncertainReason: result.uncertainReason,
            needsRefine: result.needsRefine,
            confidenceBand: result.confidenceBand,
            matchWarning: result.matchWarning,
            isUncertain: result.isUncertain,
            top1Key: result.top1Key,
            top2Key: result.top2Key,
            dominant: result.dominant,
            score1: result.score1,
            score2: result.score2,
            allFiltered: result.allFiltered,
            rankedCount: result.rankedCount,
            eligibilityPass: result.eligibilityPass,
          });
        }
      }
      
      // Task O2.4: CRITICAL — stateCounts must count ONLY stateKey, never needsRefine/isUncertain/confidenceBand
      // stateKey is the canonical source (Task O2.2)
      
      // Task O3.1: POINT OF TRUTH — жёсткая проверка инварианта прямо в месте инкремента
      if (stateKey === 'uncertain' && result.forcedUncertain !== true) {
        console.error('\n❌ TASK O3.1 FATAL: Invariant violation detected at stateCounts increment point!');
        console.error('  stateKey === "uncertain" but forcedUncertain !== true');
        console.error('  Full result object:', JSON.stringify({
          stateKey: result.stateKey,
          dominant: result.dominant,
          forcedUncertain: result.forcedUncertain,
          uncertainReason: result.uncertainReason,
          needsRefine: result.needsRefine,
          confidenceBand: result.confidenceBand,
          matchWarning: result.matchWarning,
          isUncertain: result.isUncertain,
          top1Key: result.top1Key,
          top2Key: result.top2Key,
          score1: result.score1,
          score2: result.score2,
          allFiltered: result.allFiltered,
          rankedCount: result.rankedCount,
          eligibilityPass: result.eligibilityPass,
          baseline: baselineMetrics,
        }, null, 2));
        throw new Error('O3.1: Invariant violation at stateCounts increment: stateKey="uncertain" but forcedUncertain !== true');
      }
      
      stateCounts[stateKey] = (stateCounts[stateKey] || 0) + 1;
      
      // Task P(B).4: Count quality metrics (morning flow)
      if (stateKey === 'uncertain') {
        uncertainStateCount++;
      }
      if (result.forcedUncertain === true) {
        forcedUncertainCount++;
      }
      if (result.clarityFlag === 'low') {
        lowClarityCount++;
      }
      if (result.clarityFlag === 'medium') {
        mediumClarityCount++;
      }
      if (result.needsRefine === true) {
        needsRefineCount++;
        // Track top states among needsRefine
        if (stateKey && stateKey !== 'uncertain') {
          needsRefineTopStates[stateKey] = (needsRefineTopStates[stateKey] || 0) + 1;
        }
      }
      if (result.confidenceBand === 'low') {
        lowConfidenceCount++;
      }
      if (result.matchWarning != null) {
        matchWarningCount++;
      }
      
      // Task P(B).4: Count intersections (morning flow)
      if (result.clarityFlag === 'low' && result.needsRefine === true) {
        lowClarityAndNeedsRefineCount++;
      }
      if (result.clarityFlag === 'low' && result.confidenceBand === 'low') {
        lowClarityAndLowConfidenceCount++;
      }
      if (stateKey === 'uncertain' && result.clarityFlag === 'low') {
        uncertainStateAndLowClarityCount++;
      }
      
      // Task W0.4: Track selectionPath distribution (morning flow)
      const selectionPath = result.selectionPath || result.selectionDiagnostics?.selectionPath || 'none';
      selectionPathCounts[selectionPath] = (selectionPathCounts[selectionPath] || 0) + 1;
      if (selectionPath === 'final_fallback') {
        finalFallbackCount++;
      }
      if (selectionPath === 'last_resort') {
        lastResortCount++;
      }
      
      // Task C2: Collect diagnostics (for ALL cases, not just forcedUncertain)
      if (result._diagnostics) {
        if (result._diagnostics.hasNonFiniteScore) nonFiniteScoreCount++;
        if (result._diagnostics.exactTie12) exactTie12Count++;
        if (result._diagnostics.exactTieTop3) exactTieTop3Count++;
        if (Number.isFinite(result._diagnostics.score1Value)) {
          score1Values.push(result._diagnostics.score1Value);
        }
      }
      
      // Also collect score1 from result directly
      if (Number.isFinite(result.score1)) {
        score1Values.push(result.score1);
        
        // Task I1.1: Collect score1 for quantile analysis
        score1All.push(result.score1);
        
        // Task I1.1: Count score1 below thresholds
        if (result.score1 < 0.04) score1Counts.below004++;
        if (result.score1 < 0.05) score1Counts.below005++;
        if (result.score1 < 0.06) score1Counts.below006++;
        if (result.score1 < 0.08) score1Counts.below008++;
        
        // Task I1.1: Collect score1 by confidence band
        if (result.confidenceBand === 'low') {
          score1LowConfidence.push(result.score1);
        }
        
        // Task I1.1: Collect score1 for forced uncertain
        if (result.forcedUncertain) {
          score1ForcedUncertain.push(result.score1);
        }
      }
      
      // Task O1: Count ALL forced uncertain cases (including all_filtered)
      // Task P(B).4: Build breakdown only from uncertainReason when forcedUncertain === true
      // Ensure clarity_low does NOT appear (if it does, it's a bug in logic)
      if (result.forcedUncertain) {
        forcedUncertainTotal++; // Task O1: Count all forced uncertain cases
        const reason = result.uncertainReason || 'unknown';
        
        // Task P(B).4: Sanity check — clarity_low should NOT appear in forced uncertain reasons
        if (reason === 'clarity_low') {
          console.error(`[P(B).4] ERROR: clarity_low found in forced uncertain reasons! This should not happen. Baseline:`, baselineMetrics);
        }
        
        forcedUncertainReasonBreakdown[reason] = (forcedUncertainReasonBreakdown[reason] || 0) + 1;
        
        if (result.uncertainReason === 'all_filtered') {
          allFilteredCount++;
        } else {
          const score1 = Number.isFinite(result.score1) ? result.score1 : null;
          const delta = Number.isFinite(result.delta) ? result.delta : null;
          const certaintyRaw = Number.isFinite(result.vector?.certainty) ? result.vector.certainty : null;
          
          if (score1 !== null) forcedUncertainStats.score1.push(score1);
          if (delta !== null) forcedUncertainStats.delta.push(delta);
          if (certaintyRaw !== null) forcedUncertainStats.certaintyRaw.push(certaintyRaw);
        }
      }
      
      // Task F2: Count all-filtered separately (not as ties)
      // Note: allFilteredCount already incremented above if result.forcedUncertain === true && result.uncertainReason === 'all_filtered'
      if (result.allFiltered && (!result.forcedUncertain || result.uncertainReason !== 'all_filtered')) {
        // Edge case: allFiltered but not counted above (should not happen, but handle it)
        allFilteredCount++;
        // Task F3: Collect eligibility reasons if available
        if (result._eligibilityDiagnostics?.filteredOut) {
          for (const item of result._eligibilityDiagnostics.filteredOut) {
            for (const reason of item.reasons || []) {
              eligibilityReasonsBreakdown[reason] = (eligibilityReasonsBreakdown[reason] || 0) + 1;
            }
          }
        }
      } else if (result.allFiltered && result.forcedUncertain && result.uncertainReason === 'all_filtered') {
        // Task F3: Collect eligibility reasons if available (for all_filtered cases already counted)
        if (result._eligibilityDiagnostics?.filteredOut) {
          for (const item of result._eligibilityDiagnostics.filteredOut) {
            for (const reason of item.reasons || []) {
              eligibilityReasonsBreakdown[reason] = (eligibilityReasonsBreakdown[reason] || 0) + 1;
            }
          }
        }
      } else {
        // Task F2: Count ties only when we have at least 2 real candidates
        const hasCandidates = Number.isFinite(result.score1) && Number.isFinite(result.score2);
        const isTie = hasCandidates && result._tieDiagnostics?.isTie;
        
        if (isTie) {
          tieCount++;
          if (result._tieDiagnostics.tieResolved) {
            tieResolvedCount++;
            const winner = result._tieDiagnostics.tieWinner;
            if (winner) {
              tieWinnerHistogram[winner] = (tieWinnerHistogram[winner] || 0) + 1;
            }
          } else {
            tieUnresolvedCount++;
          }
        }
        
        // Task H1: Collect forced uncertain breakdown and quality metrics (only non-tie, non-all-filtered cases)
        // Task O1: Note: forcedUncertainTotal and reasonBreakdown already counted above for ALL forced uncertain cases
        if (result.forcedUncertain && !result._tieDiagnostics?.tieResolved && !result.allFiltered) {
          forcedUncertainAfterTieTotal++;
          // Note: reason already tracked above in forcedUncertainReasonBreakdown
          
          // Task H1: Collect score1 and delta for forced uncertain
          if (Number.isFinite(result.score1)) {
            forcedUncertainScore1.push(result.score1);
          }
          if (Number.isFinite(result.delta)) {
            forcedUncertainDelta.push(result.delta);
          }
          
          // Task H1: Track fallback candidate (what would have been chosen)
          const fallback = result.top1Key || result.dominant || 'unknown';
          if (fallback && fallback !== 'uncertain') {
            fallbackCandidateHistogram[fallback] = (fallbackCandidateHistogram[fallback] || 0) + 1;
          }
        }
      }
      
      // Task I4: Collect confidence band distribution (for all results, not just forced uncertain)
      if (result.confidenceBand) {
        confidenceBandDistribution[result.confidenceBand] = (confidenceBandDistribution[result.confidenceBand] || 0) + 1;
        
        // Task I4: Track states with low confidence
        if (result.confidenceBand === 'low' && result.stateKey && result.stateKey !== 'uncertain') {
          lowConfidenceTopStates[result.stateKey] = (lowConfidenceTopStates[result.stateKey] || 0) + 1;
        }
      }
      
      if (!stateDetails[stateKey]) {
        stateDetails[stateKey] = {
          count: 0,
          totalConfidence: 0,
          examples: [],
        };
      }
      stateDetails[stateKey].count++;
      stateDetails[stateKey].totalConfidence += result.confidence || 0;
      if (stateDetails[stateKey].examples.length < 5) {
        stateDetails[stateKey].examples.push({ baseline: { ...baselineMetrics }, confidence: result.confidence });
      }
      
      totalPaths++;
      pathsMorningCounted++; // Task T1: Count morning paths that were processed
    } else if (sessionType === 'evening') {
      // Evening simplified: baseline only (no diagnostics in simplified mode)
      // Same as morning - no questions, no ×4 paths
      // Task W0.2: Use canonical routeStateFromBaseline (NO local copy)
      if (!routeStateFromBaselineCanonical) {
        throw new Error('routeStateFromBaselineCanonical not initialized. Ensure main() is async and imports baselineEngine.');
      }
      const result = routeStateFromBaselineCanonical(baselineMetrics, {
        evidenceVector: null,
        evidenceWeight: 0.25,
      });
      
      const stateKey = result.stateKey;
      
      // Task Y1: Pipeline coverage check - verify stateKey is always present (evening)
      if (!stateKey || stateKey === null || stateKey === undefined) {
        if (pipelineCoverageViolations.length < MAX_VIOLATIONS_TO_REPORT) {
          pipelineCoverageViolations.push({
            baseline: { ...baselineMetrics },
            vector: result.vector,
            result: {
              stateKey: result.stateKey,
              selectionPath: result.selectionPath,
              selectionDiagnostics: result.selectionDiagnostics,
            },
          });
        }
      }
      
      // Task S2: Assert - connected NEVER if F_high || T_high || Vneg (evening flow)
      // Task W5: Use result.vector directly (it's the final vector after all transformations)
      if (stateKey === 'connected') {
        const resultLevels = levelizeStateVec(result.vector);
        if (resultLevels.F_high || resultLevels.T_high || resultLevels.Vneg) {
          console.error('\n❌ TASK S2 FATAL: connected selected with semantic violation (evening)!');
          console.error('  stateKey === "connected" but (F_high || T_high || Vneg)');
          console.error('  Baseline:', baselineMetrics);
          console.error('  Vector:', result.vector || merged);
          console.error('  Levels:', resultLevels);
          console.error('  Eligibility pass:', result.eligibilityPass);
          console.error('  Top-1 key:', result.top1Key);
          console.error('  Top-2 key:', result.top2Key);
          console.error('  Score1:', result.score1);
          throw new Error('S2: Semantic violation - connected selected with F_high || T_high || Vneg (evening)');
        }
      }
      
      // Task O2.3: Diagnostic - check if stateKey === 'uncertain' but forcedUncertain !== true
      // Use !== true instead of === false to catch undefined cases
      if (stateKey === 'uncertain' && result.forcedUncertain !== true) {
        if (uncertainWithoutForceUncertainCases.length < uncertainWithoutForceUncertainLimit) {
          uncertainWithoutForceUncertainCases.push({
            baseline: { ...baselineMetrics },
            stateKey: result.stateKey,
            forcedUncertain: result.forcedUncertain,
            uncertainReason: result.uncertainReason,
            needsRefine: result.needsRefine,
            confidenceBand: result.confidenceBand,
            matchWarning: result.matchWarning,
            isUncertain: result.isUncertain,
            top1Key: result.top1Key,
            top2Key: result.top2Key,
            dominant: result.dominant,
            score1: result.score1,
            score2: result.score2,
            allFiltered: result.allFiltered,
            rankedCount: result.rankedCount,
            eligibilityPass: result.eligibilityPass,
          });
        }
      }
      
      // Task O2.4: CRITICAL — stateCounts must count ONLY stateKey, never needsRefine/isUncertain/confidenceBand
      // stateKey is the canonical source (Task O2.2)
      
      // Task O3.1: POINT OF TRUTH — жёсткая проверка инварианта прямо в месте инкремента
      if (stateKey === 'uncertain' && result.forcedUncertain !== true) {
        console.error('\n❌ TASK O3.1 FATAL: Invariant violation detected at stateCounts increment point!');
        console.error('  stateKey === "uncertain" but forcedUncertain !== true');
        console.error('  Full result object:', JSON.stringify({
          stateKey: result.stateKey,
          dominant: result.dominant,
          forcedUncertain: result.forcedUncertain,
          uncertainReason: result.uncertainReason,
          needsRefine: result.needsRefine,
          confidenceBand: result.confidenceBand,
          matchWarning: result.matchWarning,
          isUncertain: result.isUncertain,
          top1Key: result.top1Key,
          top2Key: result.top2Key,
          score1: result.score1,
          score2: result.score2,
          allFiltered: result.allFiltered,
          rankedCount: result.rankedCount,
          eligibilityPass: result.eligibilityPass,
          baseline: baselineMetrics,
        }, null, 2));
        throw new Error('O3.1: Invariant violation at stateCounts increment: stateKey="uncertain" but forcedUncertain !== true');
      }
      
      stateCounts[stateKey] = (stateCounts[stateKey] || 0) + 1;
      
      // Task C2: Collect diagnostics (for ALL cases, not just forcedUncertain)
      if (result._diagnostics) {
        if (result._diagnostics.hasNonFiniteScore) nonFiniteScoreCount++;
        if (result._diagnostics.exactTie12) exactTie12Count++;
        if (result._diagnostics.exactTieTop3) exactTieTop3Count++;
        if (Number.isFinite(result._diagnostics.score1Value)) {
          score1Values.push(result._diagnostics.score1Value);
        }
      }
      
      // Also collect score1 from result directly
      if (Number.isFinite(result.score1)) {
        score1Values.push(result.score1);
        
        // Task I1.1: Collect score1 for quantile analysis
        score1All.push(result.score1);
        
        // Task I1.1: Count score1 below thresholds
        if (result.score1 < 0.04) score1Counts.below004++;
        if (result.score1 < 0.05) score1Counts.below005++;
        if (result.score1 < 0.06) score1Counts.below006++;
        if (result.score1 < 0.08) score1Counts.below008++;
        
        // Task I1.1: Collect score1 by confidence band
        if (result.confidenceBand === 'low') {
          score1LowConfidence.push(result.score1);
        }
        
        // Task I1.1: Collect score1 for forced uncertain
        if (result.forcedUncertain) {
          score1ForcedUncertain.push(result.score1);
        }
      }
      
      // Task O1: Count ALL forced uncertain cases (including all_filtered)
      // Task P(B).4: Build breakdown only from uncertainReason when forcedUncertain === true
      // Ensure clarity_low does NOT appear (if it does, it's a bug in logic)
      if (result.forcedUncertain) {
        forcedUncertainTotal++; // Task O1: Count all forced uncertain cases
        const reason = result.uncertainReason || 'unknown';
        
        // Task P(B).4: Sanity check — clarity_low should NOT appear in forced uncertain reasons
        if (reason === 'clarity_low') {
          console.error(`[P(B).4] ERROR: clarity_low found in forced uncertain reasons! This should not happen. Baseline:`, baselineMetrics);
        }
        
        forcedUncertainReasonBreakdown[reason] = (forcedUncertainReasonBreakdown[reason] || 0) + 1;
        
        if (result.uncertainReason === 'all_filtered') {
          allFilteredCount++;
        } else {
          const score1 = Number.isFinite(result.score1) ? result.score1 : null;
          const delta = Number.isFinite(result.delta) ? result.delta : null;
          const certaintyRaw = Number.isFinite(result.vector?.certainty) ? result.vector.certainty : null;
          
          if (score1 !== null) forcedUncertainStats.score1.push(score1);
          if (delta !== null) forcedUncertainStats.delta.push(delta);
          if (certaintyRaw !== null) forcedUncertainStats.certaintyRaw.push(certaintyRaw);
        }
      }
      
      // Task F2: Count all-filtered separately (not as ties)
      // Note: allFilteredCount already incremented above if result.forcedUncertain === true && result.uncertainReason === 'all_filtered'
      if (result.allFiltered && (!result.forcedUncertain || result.uncertainReason !== 'all_filtered')) {
        // Edge case: allFiltered but not counted above (should not happen, but handle it)
        allFilteredCount++;
        // Task F3: Collect eligibility reasons if available
        if (result._eligibilityDiagnostics?.filteredOut) {
          for (const item of result._eligibilityDiagnostics.filteredOut) {
            for (const reason of item.reasons || []) {
              eligibilityReasonsBreakdown[reason] = (eligibilityReasonsBreakdown[reason] || 0) + 1;
            }
          }
        }
      } else if (result.allFiltered && result.forcedUncertain && result.uncertainReason === 'all_filtered') {
        // Task F3: Collect eligibility reasons if available (for all_filtered cases already counted)
        if (result._eligibilityDiagnostics?.filteredOut) {
          for (const item of result._eligibilityDiagnostics.filteredOut) {
            for (const reason of item.reasons || []) {
              eligibilityReasonsBreakdown[reason] = (eligibilityReasonsBreakdown[reason] || 0) + 1;
            }
          }
        }
      } else {
        // Task F2: Count ties only when we have at least 2 real candidates
        const hasCandidates = Number.isFinite(result.score1) && Number.isFinite(result.score2);
        const isTie = hasCandidates && result._tieDiagnostics?.isTie;
        
        if (isTie) {
          tieCount++;
          if (result._tieDiagnostics.tieResolved) {
            tieResolvedCount++;
            const winner = result._tieDiagnostics.tieWinner;
            if (winner) {
              tieWinnerHistogram[winner] = (tieWinnerHistogram[winner] || 0) + 1;
            }
          } else {
            tieUnresolvedCount++;
          }
        }
        
        // Task H1: Collect forced uncertain breakdown and quality metrics (only non-tie, non-all-filtered cases)
        // Task O1: Note: forcedUncertainTotal and reasonBreakdown already counted above for ALL forced uncertain cases
        if (result.forcedUncertain && !result._tieDiagnostics?.tieResolved && !result.allFiltered) {
          forcedUncertainAfterTieTotal++;
          // Note: reason already tracked above in forcedUncertainReasonBreakdown
          
          // Task H1: Collect score1 and delta for forced uncertain
          if (Number.isFinite(result.score1)) {
            forcedUncertainScore1.push(result.score1);
          }
          if (Number.isFinite(result.delta)) {
            forcedUncertainDelta.push(result.delta);
          }
          
          // Task H1: Track fallback candidate (what would have been chosen)
          const fallback = result.top1Key || result.dominant || 'unknown';
          if (fallback && fallback !== 'uncertain') {
            fallbackCandidateHistogram[fallback] = (fallbackCandidateHistogram[fallback] || 0) + 1;
          }
        }
      }
      
      // Task I4: Collect confidence band distribution (for all results, not just forced uncertain)
      if (result.confidenceBand) {
        confidenceBandDistribution[result.confidenceBand] = (confidenceBandDistribution[result.confidenceBand] || 0) + 1;
        
        // Task I4: Track states with low confidence
        if (result.confidenceBand === 'low' && result.stateKey && result.stateKey !== 'uncertain') {
          lowConfidenceTopStates[result.stateKey] = (lowConfidenceTopStates[result.stateKey] || 0) + 1;
        }
      }
      
      // Task W0.4: Track selectionPath distribution (evening flow)
      const selectionPathEvening = result.selectionPath || result.selectionDiagnostics?.selectionPath || 'none';
      selectionPathCounts[selectionPathEvening] = (selectionPathCounts[selectionPathEvening] || 0) + 1;
      if (selectionPathEvening === 'final_fallback') {
        finalFallbackCount++;
      }
      if (selectionPathEvening === 'last_resort') {
        lastResortCount++;
      }
      
      // Task AA2: Count eligibility health metrics from _selectionDiagnostics (evening)
      const diagnosticsEvening = result.selectionDiagnostics || {};
      const strictCountEvening = diagnosticsEvening.strictCount ?? 0;
      const hardCountEvening = diagnosticsEvening.hardCount ?? 0;
      const fallbackUsedEvening = diagnosticsEvening.fallbackUsed ?? false;
      const lastResortUsedEvening = diagnosticsEvening.lastResortUsed ?? false;
      
      // Task AA3: Pre-rescue counts (evening)
      if (strictCountEvening === 0) preRescueStrictEmptyCount++;
      if (hardCountEvening === 0 && strictCountEvening === 0) {
        preRescueHardEmptyCount++;
      }
      if (strictCountEvening === 0 && hardCountEvening === 0) {
        preRescueBothEmptyCount++;
      }
      
      // Task AA3: Post-rescue counts (evening)
      if (selectionPathEvening === 'strict' && strictCountEvening === 0) {
        postRescueStrictEmptyCount++;
      }
      if (selectionPathEvening === 'hard' && hardCountEvening === 0) {
        postRescueHardEmptyCount++;
      }
      if ((selectionPathEvening === 'final_fallback' || selectionPathEvening === 'last_resort') && strictCountEvening === 0 && hardCountEvening === 0) {
        postRescueBothEmptyCount++;
        // Task AA5: Collect vectors for detailed dump (evening)
        if (postRescueBothEmptyVectors.length < MAX_VIOLATIONS_TO_REPORT) {
          postRescueBothEmptyVectors.push({
            baseline: { ...baselineMetrics },
            vector: result.vector,
            levels: levelizeStateVec(result.vector),
            selectionDiagnostics: diagnosticsEvening,
            selectionPath: selectionPathEvening,
            stateKey: result.stateKey,
            fallbackUsed: fallbackUsedEvening,
            lastResortUsed: lastResortUsedEvening,
          });
        }
      }
      
      // Task AA4: Sanity invariants (evening)
      if (selectionPathEvening === 'hard' && hardCountEvening === 0) {
        console.error('\n❌ TASK AA4 FATAL: Invariant violation - selectionPath=hard but hardCount=0 (evening)');
        console.error('  Baseline:', baselineMetrics);
        console.error('  Diagnostics:', diagnosticsEvening);
        throw new Error('AA4: selectionPath=hard but hardCount=0 (evening)');
      }
      if (selectionPathEvening === 'strict' && strictCountEvening === 0) {
        console.error('\n❌ TASK AA4 FATAL: Invariant violation - selectionPath=strict but strictCount=0 (evening)');
        console.error('  Baseline:', baselineMetrics);
        console.error('  Diagnostics:', diagnosticsEvening);
        throw new Error('AA4: selectionPath=strict but strictCount=0 (evening)');
      }
      
      if (!stateDetails[stateKey]) {
        stateDetails[stateKey] = {
          count: 0,
          totalConfidence: 0,
          examples: [],
        };
      }
      stateDetails[stateKey].count++;
      stateDetails[stateKey].totalConfidence += result.confidence || 0;
      if (stateDetails[stateKey].examples.length < 5) {
        stateDetails[stateKey].examples.push({ baseline: { ...baselineMetrics }, confidence: result.confidence });
      }
      
      totalPaths++;
      pathsEveningCounted++; // Task T1: Count evening paths that were processed
    }
  }
  
  // Task T1: Report path generation vs counting
  console.log(`\n📊 PATH GENERATION vs COUNTING (Task T1)`);
  console.log('-'.repeat(80));
  console.log(`Morning: Generated=${pathsMorningGenerated}, Counted=${pathsMorningCounted}`);
  console.log(`Evening: Generated=${pathsEveningGenerated}, Counted=${pathsEveningCounted}`);
  
  if (pathsMorningGenerated !== pathsMorningCounted) {
    console.error(`⚠️  WARNING: Morning paths mismatch! Generated ${pathsMorningGenerated} but counted ${pathsMorningCounted}`);
  }
  if (pathsEveningGenerated !== pathsEveningCounted) {
    console.error(`⚠️  WARNING: Evening paths mismatch! Generated ${pathsEveningGenerated} but counted ${pathsEveningCounted}`);
  }
  
  // Task T2: Diagnostic - if evening generated > 0 but counted === 0, show first 5 examples
  if (pathsEveningGenerated > 0 && pathsEveningCounted === 0) {
    console.error(`\n❌ TASK T2: Evening paths disappearing!`);
    console.error(`  Generated: ${pathsEveningGenerated}, Counted: ${pathsEveningCounted}`);
    console.error(`  This indicates a problem in aggregation or filtering.`);
  }

  const avgEligibleCount = totalVectorsChecked > 0 ? (totalEligibleCount / totalVectorsChecked).toFixed(2) : 0;
  const topReasons = Object.entries(ineligibilityReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([reason, count]) => ({ reason, count }));
  
  // Task U8: Calculate quantiles for forcedUncertain stats
  const quantile = (arr, p) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * p);
    return sorted[Math.min(index, sorted.length - 1)];
  };
  
  const uncertainQuantiles = {
    delta: {
      p50: quantile(forcedUncertainStats.delta, 0.5),
      p75: quantile(forcedUncertainStats.delta, 0.75),
      p90: quantile(forcedUncertainStats.delta, 0.9),
      p95: quantile(forcedUncertainStats.delta, 0.95),
    },
    score1: {
      p50: quantile(forcedUncertainStats.score1, 0.5),
      p75: quantile(forcedUncertainStats.score1, 0.75),
      p90: quantile(forcedUncertainStats.score1, 0.9),
      p95: quantile(forcedUncertainStats.score1, 0.95),
    },
    certaintyRaw: {
      p50: quantile(forcedUncertainStats.certaintyRaw, 0.5),
      p75: quantile(forcedUncertainStats.certaintyRaw, 0.75),
      p90: quantile(forcedUncertainStats.certaintyRaw, 0.9),
      p95: quantile(forcedUncertainStats.certaintyRaw, 0.95),
    },
    total: forcedUncertainStats.delta.length,
    allFilteredCount, // Separate count for all_filtered cases
  };
  
  // Task C2: Score diagnostics
  const scoreDiagnostics = {
    nonFiniteScoreCount,
    exactTie12Count,
    exactTieTop3Count,
    minScore1: score1Values.length > 0 ? Math.min(...score1Values) : null,
    p05Score1: quantile(score1Values, 0.05),
  };
  
  // Task I1.1: Score1 quantile analysis
  const score1Quantiles = {
    overall: {
      p01: quantile(score1All, 0.01),
      p05: quantile(score1All, 0.05),
      p10: quantile(score1All, 0.10),
      p25: quantile(score1All, 0.25),
      p50: quantile(score1All, 0.50),
      min: score1All.length > 0 ? Math.min(...score1All) : null,
    },
    lowConfidence: {
      p01: quantile(score1LowConfidence, 0.01),
      p05: quantile(score1LowConfidence, 0.05),
      p10: quantile(score1LowConfidence, 0.10),
      p25: quantile(score1LowConfidence, 0.25),
      p50: quantile(score1LowConfidence, 0.50),
      min: score1LowConfidence.length > 0 ? Math.min(...score1LowConfidence) : null,
    },
    forcedUncertain: {
      p01: quantile(score1ForcedUncertain, 0.01),
      p05: quantile(score1ForcedUncertain, 0.05),
      p10: quantile(score1ForcedUncertain, 0.10),
      p25: quantile(score1ForcedUncertain, 0.25),
      p50: quantile(score1ForcedUncertain, 0.50),
      min: score1ForcedUncertain.length > 0 ? Math.min(...score1ForcedUncertain) : null,
    },
    counts: score1Counts,
  };
  
  // Task H1: Calculate quantiles for forced uncertain
  const quantileForced = (arr, p) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * p);
    return sorted[Math.min(index, sorted.length - 1)];
  };
  
  // Task H1: Forced uncertain quality metrics
  const forcedUncertainMetrics = {
    rate: totalPaths > 0 ? (forcedUncertainTotal / totalPaths) : 0,
    total: forcedUncertainTotal,
    reasonBreakdown: Object.entries(forcedUncertainReasonBreakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([reason, count]) => ({ reason, count })),
    score1Quantiles: {
      p50: quantileForced(forcedUncertainScore1, 0.5),
      p75: quantileForced(forcedUncertainScore1, 0.75),
      p90: quantileForced(forcedUncertainScore1, 0.9),
      p95: quantileForced(forcedUncertainScore1, 0.95),
    },
    deltaQuantiles: {
      p50: quantileForced(forcedUncertainDelta, 0.5),
      p75: quantileForced(forcedUncertainDelta, 0.75),
      p90: quantileForced(forcedUncertainDelta, 0.9),
      p95: quantileForced(forcedUncertainDelta, 0.95),
    },
    fallbackCandidateHistogram: Object.entries(fallbackCandidateHistogram)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({ key, count })),
  };
  
  // Task F2: All-filtered reporting
  const allFilteredDiagnostics = {
    count: allFilteredCount,
    // Task F3: Top eligibility reasons
    topReasons: Object.entries(eligibilityReasonsBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count })),
  };
  
  // Task U3: Final fallback metrics (calculate after counting)
  const finalFallbackRate = totalPaths > 0 ? (finalFallbackCount / totalPaths) : 0;
  const lastResortRate = totalPaths > 0 ? (lastResortCount / totalPaths) : 0;
  const fallbackTotalRate = totalPaths > 0 ? ((finalFallbackCount + lastResortCount) / totalPaths) : 0;
  
  // Task I4: Confidence band metrics
  const confidenceBandMetrics = {
    distribution: confidenceBandDistribution,
    total: totalPaths,
    lowConfidenceRate: totalPaths > 0 ? (confidenceBandDistribution.low / totalPaths) : 0,
    lowConfidenceTopStates: Object.entries(lowConfidenceTopStates)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({ key, count })),
  };
  
  // Task D2.4 + D2.7: Tie reporting
  const tieDiagnostics = {
    tieCount,
    tieResolvedCount,
    tieUnresolvedCount,
    tieResolvedRate: tieCount > 0 ? (tieResolvedCount / tieCount) : 0,
    tieWinnerHistogram: Object.entries(tieWinnerHistogram)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({ key, count })),
    // Task D2.7: Forced uncertain after tie fix
    forcedUncertainAfterTieTotal,
  };
  
  // Task P(B).4: Calculate quality rates
  const uncertainStateRate = totalPaths > 0 ? (uncertainStateCount / totalPaths) : 0;
  const forcedUncertainRate = totalPaths > 0 ? (forcedUncertainCount / totalPaths) : 0;
  const lowClarityRate = totalPaths > 0 ? (lowClarityCount / totalPaths) : 0;
  const mediumClarityRate = totalPaths > 0 ? (mediumClarityCount / totalPaths) : 0;
  const needsRefineRate = totalPaths > 0 ? (needsRefineCount / totalPaths) : 0;
  const lowConfidenceRate = totalPaths > 0 ? (lowConfidenceCount / totalPaths) : 0;
  const matchWarningRate = totalPaths > 0 ? (matchWarningCount / totalPaths) : 0;

  return { 
    stateCounts, 
    stateDetails, 
    totalPaths,
    // Task T1: Path generation vs counting diagnostics
    pathGeneration: {
      morningGenerated: pathsMorningGenerated,
      eveningGenerated: pathsEveningGenerated,
      morningCounted: pathsMorningCounted,
      eveningCounted: pathsEveningCounted,
    },
    gatingDiagnostics: {
      eligibleCounts,
      avgEligibleCount: parseFloat(avgEligibleCount),
      topReasons,
      totalVectorsChecked,
    },
    uncertainQuantiles, // Task B4
    scoreDiagnostics, // Task C2
    score1Quantiles, // Task I1.1
    tieDiagnostics, // Task D2.4
    allFilteredDiagnostics, // Task F2 + F3
    // Task U3: Final fallback metrics
    finalFallbackMetrics: {
      finalFallbackCount,
      lastResortCount,
      finalFallbackRate,
      lastResortRate,
      fallbackTotalRate,
    },
    forcedUncertainMetrics, // Task H1
    confidenceBandMetrics, // Task I4
    
    // Task Y1: Pipeline coverage violations (stateKey missing after routeStateFromBaseline)
    pipelineCoverageViolations,
    // Task AA2/AA3: Eligibility health metrics from _selectionDiagnostics (canonical source)
    eligibilityHealthMetrics: {
      // Pre-rescue: counts before any rescue/fallback steps
      preRescueStrictEmptyCount,
      preRescueHardEmptyCount,
      preRescueBothEmptyCount,
      // Post-rescue: counts after all rescue/fallback steps (should correlate with fallback rates)
      postRescueStrictEmptyCount,
      postRescueHardEmptyCount,
      postRescueBothEmptyCount,
    },
    // Task AA5: Vectors that ended up in postRescueBothEmpty for detailed dump
    postRescueBothEmptyVectors,
    
    // Task P(B).4: Quality metrics
    qualityMetrics: {
      uncertainStateCount,
      uncertainStateRate,
      forcedUncertainCount,
      forcedUncertainRate,
      lowClarityCount,
      lowClarityRate,
      mediumClarityCount,
      mediumClarityRate,
      needsRefineCount,
      needsRefineRate,
      lowConfidenceCount,
      lowConfidenceRate,
      matchWarningCount,
      matchWarningRate,
      intersections: {
        lowClarityAndNeedsRefine: lowClarityAndNeedsRefineCount,
        lowClarityAndLowConfidence: lowClarityAndLowConfidenceCount,
        uncertainStateAndLowClarity: uncertainStateAndLowClarityCount,
      },
      needsRefineTopStates: Object.entries(needsRefineTopStates)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([key, count]) => ({ key, count })),
    },
    // Task W0.4: Selection path distribution
    selectionPathCounts,
    finalFallbackRate: totalPaths > 0 ? finalFallbackCount / totalPaths : 0,
    lastResortRate: totalPaths > 0 ? lastResortCount / totalPaths : 0,
    
    // Task O1: Diagnostic for uncertain without forcedUncertain
    uncertainWithoutForceUncertain: {
      count: uncertainWithoutForceUncertainCases.length,
      cases: uncertainWithoutForceUncertainCases,
      // Also collect total uncertain count for comparison
      totalUncertainCount: (() => {
        let total = 0;
        // We need to count uncertain cases separately - this is a placeholder
        // The actual count should match stateCounts.uncertain
        return total;
      })(),
    },
  };
}

// ---------- Report generation ----------
function generateReport(morningResults, eveningResults) {
  const allStateKeys = new Set([
    ...Object.keys(morningResults.stateCounts),
    ...Object.keys(eveningResults.stateCounts),
  ]);

  const sortedStates = Array.from(allStateKeys).sort((a, b) => {
    const totalA = (morningResults.stateCounts[a] || 0) + (eveningResults.stateCounts[a] || 0);
    const totalB = (morningResults.stateCounts[b] || 0) + (eveningResults.stateCounts[b] || 0);
    return totalB - totalA;
  });

  console.log('\n' + '='.repeat(80));
  console.log('STATE BALANCE REPORT - Simplified Flows');
  console.log('='.repeat(80));

  console.log('\n📊 OVERALL STATISTICS');
  console.log(`- Morning paths: ${morningResults.totalPaths.toLocaleString()}`);
  console.log(`- Evening paths: ${eveningResults.totalPaths.toLocaleString()}`);
  console.log(`- Total paths: ${(morningResults.totalPaths + eveningResults.totalPaths).toLocaleString()}`);

  console.log('\n📈 STATE DISTRIBUTION (All Paths)');
  console.log('-'.repeat(80));
  console.log(`${'State'.padEnd(20)} | ${'Morning'.padStart(10)} | ${'Evening'.padStart(10)} | ${'Total'.padStart(10)} | ${'%'.padStart(8)}`);
  console.log('-'.repeat(80));

  const grandTotal = morningResults.totalPaths + eveningResults.totalPaths;

  for (const state of sortedStates) {
    const morningCount = morningResults.stateCounts[state] || 0;
    const eveningCount = eveningResults.stateCounts[state] || 0;
    const totalCount = morningCount + eveningCount;
    const pct = ((totalCount / grandTotal) * 100).toFixed(2);
    
    console.log(
      `${state.padEnd(20)} | ${morningCount.toString().padStart(10)} | ${eveningCount.toString().padStart(10)} | ${totalCount.toString().padStart(10)} | ${pct.padStart(7)}%`
    );
  }

  console.log('\n🎯 TOP STATES (Easiest to reach)');
  console.log('-'.repeat(80));
  const topStates = sortedStates.slice(0, 5);
  for (const state of topStates) {
    const totalCount = (morningResults.stateCounts[state] || 0) + (eveningResults.stateCounts[state] || 0);
    const pct = ((totalCount / grandTotal) * 100).toFixed(2);
    console.log(`  ${state.padEnd(20)} - ${pct}% (${totalCount.toLocaleString()} paths)`);
  }

  console.log('\n🔻 BOTTOM STATES (Hardest to reach)');
  console.log('-'.repeat(80));
  const bottomStates = sortedStates.slice(-5).reverse();
  for (const state of bottomStates) {
    const totalCount = (morningResults.stateCounts[state] || 0) + (eveningResults.stateCounts[state] || 0);
    const pct = ((totalCount / grandTotal) * 100).toFixed(2);
    console.log(`  ${state.padEnd(20)} - ${pct}% (${totalCount.toLocaleString()} paths)`);
  }

  // Check for unreachable states
  const allPossibleStates = Object.keys(STATE_CENTROIDS).filter(k => k !== 'mixed');
  const unreachable = allPossibleStates.filter(s => !allStateKeys.has(s));
  if (unreachable.length > 0) {
    console.log('\n⚠️  UNREACHABLE STATES');
    console.log('-'.repeat(80));
    for (const state of unreachable) {
      console.log(`  ${state} - cannot be reached in simplified flows`);
    }
  }

  // Morning vs Evening comparison
  console.log('\n🌅 MORNING vs 🌆 EVENING COMPARISON');
  console.log('-'.repeat(80));
  console.log(`${'State'.padEnd(20)} | ${'Morning %'.padStart(12)} | ${'Evening %'.padStart(12)} | ${'Diff'.padStart(10)}`);
  console.log('-'.repeat(80));
  
  const morningTotal = morningResults.totalPaths;
  const eveningTotal = eveningResults.totalPaths;
  
  for (const state of sortedStates.slice(0, 10)) {
    const morningCount = morningResults.stateCounts[state] || 0;
    const eveningCount = eveningResults.stateCounts[state] || 0;
    const morningPct = ((morningCount / morningTotal) * 100).toFixed(2);
    const eveningPct = ((eveningCount / eveningTotal) * 100).toFixed(2);
    const diff = (parseFloat(eveningPct) - parseFloat(morningPct)).toFixed(2);
    const diffStr = diff >= 0 ? `+${diff}` : diff;
    
    console.log(
      `${state.padEnd(20)} | ${morningPct.padStart(11)}% | ${eveningPct.padStart(11)}% | ${diffStr.padStart(9)}%`
    );
  }

  // Gating diagnostics
  if (morningResults.gatingDiagnostics || eveningResults.gatingDiagnostics) {
    console.log('\n🔍 ELIGIBILITY GATING DIAGNOSTICS');
    console.log('-'.repeat(80));
    
    const morningDiag = morningResults.gatingDiagnostics || { avgEligibleCount: 0, eligibleCounts: {}, topReasons: [], totalVectorsChecked: 0 };
    const eveningDiag = eveningResults.gatingDiagnostics || { avgEligibleCount: 0, eligibleCounts: {}, topReasons: [], totalVectorsChecked: 0 };
    
    console.log('\nAverage eligible states per vector:');
    console.log(`  Morning: ${morningDiag.avgEligibleCount.toFixed(2)}`);
    console.log(`  Evening: ${eveningDiag.avgEligibleCount.toFixed(2)}`);
    
    console.log('\nEligible count distribution (Morning):');
    for (const [count, num] of Object.entries(morningDiag.eligibleCounts || {})) {
      const pct = morningDiag.totalVectorsChecked > 0 ? ((num / morningDiag.totalVectorsChecked) * 100).toFixed(1) : 0;
      console.log(`  ${count} eligible: ${num} (${pct}%)`);
    }
    
    console.log('\nTop 10 ineligibility reasons (Morning):');
    for (const { reason, count } of (morningDiag.topReasons || []).slice(0, 10)) {
      const pct = morningDiag.totalVectorsChecked > 0 ? ((count / morningDiag.totalVectorsChecked) * 100).toFixed(1) : 0;
      console.log(`  ${reason}: ${count} (${pct}%)`);
    }
    
    console.log('\nTop 10 ineligibility reasons (Evening):');
    for (const { reason, count } of (eveningDiag.topReasons || []).slice(0, 10)) {
      const pct = eveningDiag.totalVectorsChecked > 0 ? ((count / eveningDiag.totalVectorsChecked) * 100).toFixed(1) : 0;
      console.log(`  ${reason}: ${count} (${pct}%)`);
    }
  }

  // Task B4: Print quantiles for forcedUncertain cases
  const morningQuantiles = morningResults.uncertainQuantiles;
  const eveningQuantiles = eveningResults.uncertainQuantiles;
  
  if (morningQuantiles && (morningQuantiles.total > 0 || morningQuantiles.allFilteredCount > 0)) {
    console.log('\n📊 FORCED UNCERTAIN STATISTICS (Task B4)');
    console.log('-'.repeat(80));
    console.log(`\nMorning - Total forced uncertain: ${morningQuantiles.total + (morningQuantiles.allFilteredCount || 0)}`);
    if (morningQuantiles.allFilteredCount > 0) {
      console.log(`  - all_filtered: ${morningQuantiles.allFilteredCount}`);
      console.log(`  - other reasons: ${morningQuantiles.total}`);
    }
    console.log('\nDelta quantiles:');
    console.log(`  p50: ${morningQuantiles.delta.p50?.toFixed(4) || 'N/A'}`);
    console.log(`  p75: ${morningQuantiles.delta.p75?.toFixed(4) || 'N/A'}`);
    console.log(`  p90: ${morningQuantiles.delta.p90?.toFixed(4) || 'N/A'}`);
    console.log(`  p95: ${morningQuantiles.delta.p95?.toFixed(4) || 'N/A'}`);
    console.log('\nScore1 quantiles:');
    console.log(`  p50: ${morningQuantiles.score1.p50?.toFixed(4) || 'N/A'}`);
    console.log(`  p75: ${morningQuantiles.score1.p75?.toFixed(4) || 'N/A'}`);
    console.log(`  p90: ${morningQuantiles.score1.p90?.toFixed(4) || 'N/A'}`);
    console.log(`  p95: ${morningQuantiles.score1.p95?.toFixed(4) || 'N/A'}`);
    console.log('\nCertainty (raw) quantiles:');
    console.log(`  p50: ${morningQuantiles.certaintyRaw.p50?.toFixed(4) || 'N/A'}`);
    console.log(`  p75: ${morningQuantiles.certaintyRaw.p75?.toFixed(4) || 'N/A'}`);
    console.log(`  p90: ${morningQuantiles.certaintyRaw.p90?.toFixed(4) || 'N/A'}`);
    console.log(`  p95: ${morningQuantiles.certaintyRaw.p95?.toFixed(4) || 'N/A'}`);
  }
  
  if (eveningQuantiles && (eveningQuantiles.total > 0 || eveningQuantiles.allFilteredCount > 0)) {
    console.log(`\nEvening - Total forced uncertain: ${eveningQuantiles.total + (eveningQuantiles.allFilteredCount || 0)}`);
    if (eveningQuantiles.allFilteredCount > 0) {
      console.log(`  - all_filtered: ${eveningQuantiles.allFilteredCount}`);
      console.log(`  - other reasons: ${eveningQuantiles.total}`);
    }
    console.log('\nDelta quantiles:');
    console.log(`  p50: ${eveningQuantiles.delta.p50?.toFixed(4) || 'N/A'}`);
    console.log(`  p75: ${eveningQuantiles.delta.p75?.toFixed(4) || 'N/A'}`);
    console.log(`  p90: ${eveningQuantiles.delta.p90?.toFixed(4) || 'N/A'}`);
    console.log(`  p95: ${eveningQuantiles.delta.p95?.toFixed(4) || 'N/A'}`);
    console.log('\nScore1 quantiles:');
    console.log(`  p50: ${eveningQuantiles.score1.p50?.toFixed(4) || 'N/A'}`);
    console.log(`  p75: ${eveningQuantiles.score1.p75?.toFixed(4) || 'N/A'}`);
    console.log(`  p90: ${eveningQuantiles.score1.p90?.toFixed(4) || 'N/A'}`);
    console.log(`  p95: ${eveningQuantiles.score1.p95?.toFixed(4) || 'N/A'}`);
    console.log('\nCertainty (raw) quantiles:');
    console.log(`  p50: ${eveningQuantiles.certaintyRaw.p50?.toFixed(4) || 'N/A'}`);
    console.log(`  p75: ${eveningQuantiles.certaintyRaw.p75?.toFixed(4) || 'N/A'}`);
    console.log(`  p90: ${eveningQuantiles.certaintyRaw.p90?.toFixed(4) || 'N/A'}`);
    console.log(`  p95: ${eveningQuantiles.certaintyRaw.p95?.toFixed(4) || 'N/A'}`);
  }

  // Task F2: Print all-filtered diagnostics
  const morningAllFiltered = morningResults.allFilteredDiagnostics;
  const eveningAllFiltered = eveningResults.allFilteredDiagnostics;
  
  if (morningAllFiltered || eveningAllFiltered) {
    console.log('\n🚫 ALL-FILTERED DIAGNOSTICS (Task F2 + F3)');
    console.log('-'.repeat(80));
    
    if (morningAllFiltered) {
      console.log('\nMorning:');
      console.log(`  All-filtered count: ${morningAllFiltered.count}`);
      if (morningAllFiltered.topReasons && morningAllFiltered.topReasons.length > 0) {
        console.log('\n  Top eligibility reasons:');
        for (const { reason, count } of morningAllFiltered.topReasons.slice(0, 10)) {
          const pct = morningAllFiltered.count > 0 ? ((count / morningAllFiltered.count) * 100).toFixed(1) : 0;
          console.log(`    ${reason}: ${count} (${pct}%)`);
        }
      }
    }
    
    if (eveningAllFiltered) {
      console.log('\nEvening:');
      console.log(`  All-filtered count: ${eveningAllFiltered.count}`);
      if (eveningAllFiltered.topReasons && eveningAllFiltered.topReasons.length > 0) {
        console.log('\n  Top eligibility reasons (strict pass):');
        for (const { reason, count } of eveningAllFiltered.topReasons.slice(0, 10)) {
          const pct = eveningAllFiltered.count > 0 ? ((count / eveningAllFiltered.count) * 100).toFixed(1) : 0;
          console.log(`    ${reason}: ${count} (${pct}%)`);
        }
      }
      
      // Task R1: Show sample vectors
      if (eveningAllFiltered.sampleVectors && eveningAllFiltered.sampleVectors.length > 0) {
        console.log('\n  Sample baseline vectors (first 3):');
        for (const sample of eveningAllFiltered.sampleVectors.slice(0, 3)) {
          console.log(`    Baseline:`, sample.baseline);
          console.log(`    Levels:`, sample.levels);
          console.log(`    Ineligible states: ${sample.ineligibleStates?.length || 0}`);
          if (sample.ineligibleStates && sample.ineligibleStates.length > 0) {
            console.log(`      Top 3 reasons:`);
            const reasonCounts = {};
            for (const stateInfo of sample.ineligibleStates) {
              for (const reason of stateInfo.strictReasons || []) {
                reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
              }
            }
            const topReasons = Object.entries(reasonCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3);
            for (const [reason, count] of topReasons) {
              console.log(`        ${reason}: ${count} states`);
            }
          }
        }
      }
    }
  }
  
  // Task H1: Print forced uncertain metrics
  const morningForcedUncertain = morningResults.forcedUncertainMetrics;
  const eveningForcedUncertain = eveningResults.forcedUncertainMetrics;
  
  if (morningForcedUncertain || eveningForcedUncertain) {
    console.log('\n📊 FORCED UNCERTAIN QUALITY METRICS (Task H1)');
    console.log('-'.repeat(80));
    
    if (morningForcedUncertain) {
      console.log('\nMorning:');
      console.log(`  Forced uncertain rate: ${(morningForcedUncertain.rate * 100).toFixed(2)}% (${morningForcedUncertain.total} cases)`);
      if (morningForcedUncertain.reasonBreakdown.length > 0) {
        console.log('\n  Reason breakdown:');
        for (const { reason, count } of morningForcedUncertain.reasonBreakdown) {
          const pct = morningForcedUncertain.total > 0 ? ((count / morningForcedUncertain.total) * 100).toFixed(1) : 0;
          console.log(`    ${reason}: ${count} (${pct}%)`);
        }
      }
      if (morningForcedUncertain.score1Quantiles.p50 !== null) {
        console.log('\n  Score1 quantiles (forced uncertain only):');
        console.log(`    p50: ${morningForcedUncertain.score1Quantiles.p50?.toFixed(4) || 'N/A'}`);
        console.log(`    p75: ${morningForcedUncertain.score1Quantiles.p75?.toFixed(4) || 'N/A'}`);
        console.log(`    p90: ${morningForcedUncertain.score1Quantiles.p90?.toFixed(4) || 'N/A'}`);
        console.log(`    p95: ${morningForcedUncertain.score1Quantiles.p95?.toFixed(4) || 'N/A'}`);
      }
      if (morningForcedUncertain.deltaQuantiles.p50 !== null) {
        console.log('\n  Delta quantiles (forced uncertain only):');
        console.log(`    p50: ${morningForcedUncertain.deltaQuantiles.p50?.toFixed(4) || 'N/A'}`);
        console.log(`    p75: ${morningForcedUncertain.deltaQuantiles.p75?.toFixed(4) || 'N/A'}`);
        console.log(`    p90: ${morningForcedUncertain.deltaQuantiles.p90?.toFixed(4) || 'N/A'}`);
        console.log(`    p95: ${morningForcedUncertain.deltaQuantiles.p95?.toFixed(4) || 'N/A'}`);
      }
      if (morningForcedUncertain.fallbackCandidateHistogram.length > 0) {
        console.log('\n  Fallback candidates (what would have been chosen):');
        for (const { key, count } of morningForcedUncertain.fallbackCandidateHistogram.slice(0, 10)) {
          const pct = morningForcedUncertain.total > 0 ? ((count / morningForcedUncertain.total) * 100).toFixed(1) : 0;
          console.log(`    ${key}: ${count} (${pct}%)`);
        }
      }
    }
    
    if (eveningForcedUncertain) {
      console.log('\nEvening:');
      console.log(`  Forced uncertain rate: ${(eveningForcedUncertain.rate * 100).toFixed(2)}% (${eveningForcedUncertain.total} cases)`);
      if (eveningForcedUncertain.reasonBreakdown.length > 0) {
        console.log('\n  Reason breakdown:');
        for (const { reason, count } of eveningForcedUncertain.reasonBreakdown) {
          const pct = eveningForcedUncertain.total > 0 ? ((count / eveningForcedUncertain.total) * 100).toFixed(1) : 0;
          console.log(`    ${reason}: ${count} (${pct}%)`);
        }
      }
      if (eveningForcedUncertain.score1Quantiles.p50 !== null) {
        console.log('\n  Score1 quantiles (forced uncertain only):');
        console.log(`    p50: ${eveningForcedUncertain.score1Quantiles.p50?.toFixed(4) || 'N/A'}`);
        console.log(`    p75: ${eveningForcedUncertain.score1Quantiles.p75?.toFixed(4) || 'N/A'}`);
        console.log(`    p90: ${eveningForcedUncertain.score1Quantiles.p90?.toFixed(4) || 'N/A'}`);
        console.log(`    p95: ${eveningForcedUncertain.score1Quantiles.p95?.toFixed(4) || 'N/A'}`);
      }
      if (eveningForcedUncertain.deltaQuantiles.p50 !== null) {
        console.log('\n  Delta quantiles (forced uncertain only):');
        console.log(`    p50: ${eveningForcedUncertain.deltaQuantiles.p50?.toFixed(4) || 'N/A'}`);
        console.log(`    p75: ${eveningForcedUncertain.deltaQuantiles.p75?.toFixed(4) || 'N/A'}`);
        console.log(`    p90: ${eveningForcedUncertain.deltaQuantiles.p90?.toFixed(4) || 'N/A'}`);
        console.log(`    p95: ${eveningForcedUncertain.deltaQuantiles.p95?.toFixed(4) || 'N/A'}`);
      }
      if (eveningForcedUncertain.fallbackCandidateHistogram.length > 0) {
        console.log('\n  Fallback candidates (what would have been chosen):');
        for (const { key, count } of eveningForcedUncertain.fallbackCandidateHistogram.slice(0, 10)) {
          const pct = eveningForcedUncertain.total > 0 ? ((count / eveningForcedUncertain.total) * 100).toFixed(1) : 0;
          console.log(`    ${key}: ${count} (${pct}%)`);
        }
      }
    }
  }
  
  // Task I4: Print confidence band metrics
  const morningConfidence = morningResults.confidenceBandMetrics;
  const eveningConfidence = eveningResults.confidenceBandMetrics;
  
  if (morningConfidence || eveningConfidence) {
    console.log('\n📈 CONFIDENCE BAND DISTRIBUTION (Task I4)');
    console.log('-'.repeat(80));
    
    if (morningConfidence) {
      console.log('\nMorning:');
      console.log(`  High confidence: ${morningConfidence.distribution.high} (${(morningConfidence.distribution.high / morningConfidence.total * 100).toFixed(1)}%)`);
      console.log(`  Medium confidence: ${morningConfidence.distribution.medium} (${(morningConfidence.distribution.medium / morningConfidence.total * 100).toFixed(1)}%)`);
      console.log(`  Low confidence: ${morningConfidence.distribution.low} (${(morningConfidence.distribution.low / morningConfidence.total * 100).toFixed(1)}%)`);
      console.log(`  Low confidence rate: ${(morningConfidence.lowConfidenceRate * 100).toFixed(2)}%`);
      if (morningConfidence.lowConfidenceTopStates.length > 0) {
        console.log('\n  Top states with low confidence:');
        for (const { key, count } of morningConfidence.lowConfidenceTopStates.slice(0, 10)) {
          const pct = morningConfidence.distribution.low > 0 ? ((count / morningConfidence.distribution.low) * 100).toFixed(1) : 0;
          console.log(`    ${key}: ${count} (${pct}%)`);
        }
      }
    }
    
    if (eveningConfidence) {
      console.log('\nEvening:');
      console.log(`  High confidence: ${eveningConfidence.distribution.high} (${(eveningConfidence.distribution.high / eveningConfidence.total * 100).toFixed(1)}%)`);
      console.log(`  Medium confidence: ${eveningConfidence.distribution.medium} (${(eveningConfidence.distribution.medium / eveningConfidence.total * 100).toFixed(1)}%)`);
      console.log(`  Low confidence: ${eveningConfidence.distribution.low} (${(eveningConfidence.distribution.low / eveningConfidence.total * 100).toFixed(1)}%)`);
      console.log(`  Low confidence rate: ${(eveningConfidence.lowConfidenceRate * 100).toFixed(2)}%`);
      if (eveningConfidence.lowConfidenceTopStates.length > 0) {
        console.log('\n  Top states with low confidence:');
        for (const { key, count } of eveningConfidence.lowConfidenceTopStates.slice(0, 10)) {
          const pct = eveningConfidence.distribution.low > 0 ? ((count / eveningConfidence.distribution.low) * 100).toFixed(1) : 0;
          console.log(`    ${key}: ${count} (${pct}%)`);
        }
      }
    }
  }
  
  // Task C2: Print score diagnostics
  const morningScoreDiag = morningResults.scoreDiagnostics;
  const eveningScoreDiag = eveningResults.scoreDiagnostics;
  
  if (morningScoreDiag || eveningScoreDiag) {
    console.log('\n🔬 SCORE DIAGNOSTICS (Task C2)');
    console.log('-'.repeat(80));
    
    if (morningScoreDiag) {
      console.log('\nMorning:');
      console.log(`  Non-finite scores: ${morningScoreDiag.nonFiniteScoreCount}`);
      console.log(`  Exact ties (top-2): ${morningScoreDiag.exactTie12Count}`);
      console.log(`  Exact ties (top-3): ${morningScoreDiag.exactTieTop3Count}`);
      console.log(`  Min score1: ${morningScoreDiag.minScore1?.toFixed(4) || 'N/A'}`);
      console.log(`  p05 score1: ${morningScoreDiag.p05Score1?.toFixed(4) || 'N/A'}`);
    }
    
    if (eveningScoreDiag) {
      console.log('\nEvening:');
      console.log(`  Non-finite scores: ${eveningScoreDiag.nonFiniteScoreCount}`);
      console.log(`  Exact ties (top-2): ${eveningScoreDiag.exactTie12Count}`);
      console.log(`  Exact ties (top-3): ${eveningScoreDiag.exactTieTop3Count}`);
      console.log(`  Min score1: ${eveningScoreDiag.minScore1?.toFixed(4) || 'N/A'}`);
      console.log(`  p05 score1: ${eveningScoreDiag.p05Score1?.toFixed(4) || 'N/A'}`);
    }
  }
  
  // Task I1.1: Print score1 quantile analysis
  const morningScore1Quantiles = morningResults.score1Quantiles;
  const eveningScore1Quantiles = eveningResults.score1Quantiles;
  
  if (morningScore1Quantiles || eveningScore1Quantiles) {
    console.log('\n📊 SCORE1 QUANTILE ANALYSIS (Task I1.1)');
    console.log('-'.repeat(80));
    
    if (morningScore1Quantiles) {
      console.log('\nMorning:');
      console.log('\n  Overall score1 quantiles:');
      console.log(`    p01: ${morningScore1Quantiles.overall.p01?.toFixed(4) || 'N/A'}`);
      console.log(`    p05: ${morningScore1Quantiles.overall.p05?.toFixed(4) || 'N/A'}`);
      console.log(`    p10: ${morningScore1Quantiles.overall.p10?.toFixed(4) || 'N/A'}`);
      console.log(`    p25: ${morningScore1Quantiles.overall.p25?.toFixed(4) || 'N/A'}`);
      console.log(`    p50: ${morningScore1Quantiles.overall.p50?.toFixed(4) || 'N/A'}`);
      console.log(`    min: ${morningScore1Quantiles.overall.min?.toFixed(4) || 'N/A'}`);
      
      console.log('\n  Low confidence score1 quantiles:');
      console.log(`    p01: ${morningScore1Quantiles.lowConfidence.p01?.toFixed(4) || 'N/A'}`);
      console.log(`    p05: ${morningScore1Quantiles.lowConfidence.p05?.toFixed(4) || 'N/A'}`);
      console.log(`    p10: ${morningScore1Quantiles.lowConfidence.p10?.toFixed(4) || 'N/A'}`);
      console.log(`    p25: ${morningScore1Quantiles.lowConfidence.p25?.toFixed(4) || 'N/A'}`);
      console.log(`    p50: ${morningScore1Quantiles.lowConfidence.p50?.toFixed(4) || 'N/A'}`);
      console.log(`    min: ${morningScore1Quantiles.lowConfidence.min?.toFixed(4) || 'N/A'}`);
      
      console.log('\n  Forced uncertain score1 quantiles:');
      console.log(`    p01: ${morningScore1Quantiles.forcedUncertain.p01?.toFixed(4) || 'N/A'}`);
      console.log(`    p05: ${morningScore1Quantiles.forcedUncertain.p05?.toFixed(4) || 'N/A'}`);
      console.log(`    p10: ${morningScore1Quantiles.forcedUncertain.p10?.toFixed(4) || 'N/A'}`);
      console.log(`    p25: ${morningScore1Quantiles.forcedUncertain.p25?.toFixed(4) || 'N/A'}`);
      console.log(`    p50: ${morningScore1Quantiles.forcedUncertain.p50?.toFixed(4) || 'N/A'}`);
      console.log(`    min: ${morningScore1Quantiles.forcedUncertain.min?.toFixed(4) || 'N/A'}`);
      
      console.log('\n  Score1 below thresholds:');
      console.log(`    < 0.04: ${morningScore1Quantiles.counts.below004}`);
      console.log(`    < 0.05: ${morningScore1Quantiles.counts.below005}`);
      console.log(`    < 0.06: ${morningScore1Quantiles.counts.below006}`);
      console.log(`    < 0.08: ${morningScore1Quantiles.counts.below008}`);
    }
    
    if (eveningScore1Quantiles) {
      console.log('\nEvening:');
      console.log('\n  Overall score1 quantiles:');
      console.log(`    p01: ${eveningScore1Quantiles.overall.p01?.toFixed(4) || 'N/A'}`);
      console.log(`    p05: ${eveningScore1Quantiles.overall.p05?.toFixed(4) || 'N/A'}`);
      console.log(`    p10: ${eveningScore1Quantiles.overall.p10?.toFixed(4) || 'N/A'}`);
      console.log(`    p25: ${eveningScore1Quantiles.overall.p25?.toFixed(4) || 'N/A'}`);
      console.log(`    p50: ${eveningScore1Quantiles.overall.p50?.toFixed(4) || 'N/A'}`);
      console.log(`    min: ${eveningScore1Quantiles.overall.min?.toFixed(4) || 'N/A'}`);
      
      console.log('\n  Low confidence score1 quantiles:');
      console.log(`    p01: ${eveningScore1Quantiles.lowConfidence.p01?.toFixed(4) || 'N/A'}`);
      console.log(`    p05: ${eveningScore1Quantiles.lowConfidence.p05?.toFixed(4) || 'N/A'}`);
      console.log(`    p10: ${eveningScore1Quantiles.lowConfidence.p10?.toFixed(4) || 'N/A'}`);
      console.log(`    p25: ${eveningScore1Quantiles.lowConfidence.p25?.toFixed(4) || 'N/A'}`);
      console.log(`    p50: ${eveningScore1Quantiles.lowConfidence.p50?.toFixed(4) || 'N/A'}`);
      console.log(`    min: ${eveningScore1Quantiles.lowConfidence.min?.toFixed(4) || 'N/A'}`);
      
      console.log('\n  Forced uncertain score1 quantiles:');
      console.log(`    p01: ${eveningScore1Quantiles.forcedUncertain.p01?.toFixed(4) || 'N/A'}`);
      console.log(`    p05: ${eveningScore1Quantiles.forcedUncertain.p05?.toFixed(4) || 'N/A'}`);
      console.log(`    p10: ${eveningScore1Quantiles.forcedUncertain.p10?.toFixed(4) || 'N/A'}`);
      console.log(`    p25: ${eveningScore1Quantiles.forcedUncertain.p25?.toFixed(4) || 'N/A'}`);
      console.log(`    p50: ${eveningScore1Quantiles.forcedUncertain.p50?.toFixed(4) || 'N/A'}`);
      console.log(`    min: ${eveningScore1Quantiles.forcedUncertain.min?.toFixed(4) || 'N/A'}`);
      
      console.log('\n  Score1 below thresholds:');
      console.log(`    < 0.04: ${eveningScore1Quantiles.counts.below004}`);
      console.log(`    < 0.05: ${eveningScore1Quantiles.counts.below005}`);
      console.log(`    < 0.06: ${eveningScore1Quantiles.counts.below006}`);
      console.log(`    < 0.08: ${eveningScore1Quantiles.counts.below008}`);
    }
  }
  
  // Task D2.4: Print tie diagnostics
  const morningTieDiag = morningResults.tieDiagnostics;
  const eveningTieDiag = eveningResults.tieDiagnostics;
  
  if (morningTieDiag || eveningTieDiag) {
    console.log('\n🔗 TIE HANDLING DIAGNOSTICS (Task D2.4)');
    console.log('-'.repeat(80));
    
    if (morningTieDiag) {
      console.log('\nMorning:');
      console.log(`  Total ties: ${morningTieDiag.tieCount}`);
      console.log(`  Ties resolved: ${morningTieDiag.tieResolvedCount}`);
      console.log(`  Ties unresolved: ${morningTieDiag.tieUnresolvedCount || 0}`);
      console.log(`  Tie resolution rate: ${(morningTieDiag.tieResolvedRate * 100).toFixed(1)}%`);
      if (morningTieDiag.tieWinnerHistogram.length > 0) {
        console.log('\n  Top tie winners:');
        for (const { key, count } of morningTieDiag.tieWinnerHistogram.slice(0, 5)) {
          const pct = morningTieDiag.tieResolvedCount > 0 ? ((count / morningTieDiag.tieResolvedCount) * 100).toFixed(1) : 0;
          console.log(`    ${key}: ${count} (${pct}%)`);
        }
      }
    }
    
    if (eveningTieDiag) {
      console.log('\nEvening:');
      console.log(`  Total ties: ${eveningTieDiag.tieCount}`);
      console.log(`  Ties resolved: ${eveningTieDiag.tieResolvedCount}`);
      console.log(`  Ties forced uncertain: ${eveningTieDiag.tieForcedUncertainCount}`);
      console.log(`  Tie resolution rate: ${(eveningTieDiag.tieResolvedRate * 100).toFixed(1)}%`);
      if (eveningTieDiag.tieWinnerHistogram.length > 0) {
        console.log('\n  Top tie winners:');
        for (const { key, count } of eveningTieDiag.tieWinnerHistogram.slice(0, 5)) {
          const pct = eveningTieDiag.tieResolvedCount > 0 ? ((count / eveningTieDiag.tieResolvedCount) * 100).toFixed(1) : 0;
          console.log(`    ${key}: ${count} (${pct}%)`);
        }
      }
    }
  }

  // Task I5.2 + L1: Uncertain state breakdown (stateKey === 'uncertain', not needs_refine)
  console.log('\n📊 UNCERTAIN STATE BREAKDOWN (Task I5.2 + L1)');
  console.log('-'.repeat(80));
  
  const morningUncertainState = morningResults.stateCounts?.uncertain || 0; // stateKey === 'uncertain'
  const eveningUncertainState = eveningResults.stateCounts?.uncertain || 0;
  const morningTotalPaths = morningResults.totalPaths || 0;
  const eveningTotalPaths = eveningResults.totalPaths || 0;
  
  // Task P(B).4: Use quality metrics from results (not approximate calculations)
  const morningQuality = morningResults.qualityMetrics || {};
  const eveningQuality = eveningResults.qualityMetrics || {};
  
  // Task P(B).4: Get actual rates from quality metrics
  const morningUncertainStateRate = morningQuality.uncertainStateRate || 0;
  const eveningUncertainStateRate = eveningQuality.uncertainStateRate || 0;
  const morningForcedUncertainRate = morningQuality.forcedUncertainRate || 0;
  const eveningForcedUncertainRate = eveningQuality.forcedUncertainRate || 0;
  const morningLowClarityRate = morningQuality.lowClarityRate || 0;
  const eveningLowClarityRate = eveningQuality.lowClarityRate || 0;
  const morningNeedsRefineRate = morningQuality.needsRefineRate || 0;
  const eveningNeedsRefineRate = eveningQuality.needsRefineRate || 0;
  
  if (morningUncertainState > 0 || eveningUncertainState > 0) {
    console.log('\nMorning:');
    console.log(`  Uncertain state count: ${morningUncertainState} (${(morningUncertainStateRate * 100).toFixed(2)}%)`);
    const morningForced = morningResults.forcedUncertainMetrics;
    if (morningForced && morningForced.reasonBreakdown.length > 0) {
      console.log('  Reasons:');
      morningForced.reasonBreakdown.forEach(({ reason, count }) => {
        const pct = morningForced.total > 0 ? ((count / morningForced.total) * 100).toFixed(1) : 0;
        console.log(`    ${reason}: ${count} (${pct}%)`);
        // Task P(B).4: Sanity check — clarity_low should NOT appear
        if (reason === 'clarity_low') {
          console.error(`    ⚠️  ERROR: clarity_low found in forced uncertain reasons! This should not happen.`);
        }
      });
    }
    
    console.log('\nEvening:');
    console.log(`  Uncertain state count: ${eveningUncertainState} (${(eveningUncertainStateRate * 100).toFixed(2)}%)`);
    const eveningForced = eveningResults.forcedUncertainMetrics;
    if (eveningForced && eveningForced.reasonBreakdown.length > 0) {
      console.log('  Reasons:');
      eveningForced.reasonBreakdown.forEach(({ reason, count }) => {
        const pct = eveningForced.total > 0 ? ((count / eveningForced.total) * 100).toFixed(1) : 0;
        console.log(`    ${reason}: ${count} (${pct}%)`);
        // Task P(B).4: Sanity check — clarity_low should NOT appear
        if (reason === 'clarity_low') {
          console.error(`    ⚠️  ERROR: clarity_low found in forced uncertain reasons! This should not happen.`);
        }
      });
    }
  } else {
    console.log('\n✅ No uncertain states detected.');
  }
  
  // Task U3: Final fallback metrics
  const morningFallback = morningResults.finalFallbackMetrics;
  const eveningFallback = eveningResults.finalFallbackMetrics;
  
  if (morningFallback || eveningFallback) {
    console.log(`\n🔄 FINAL FALLBACK METRICS (Task U3)`);
    console.log('-'.repeat(80));
    
    if (morningFallback) {
      console.log('\nMorning:');
      console.log(`  Final fallback count: ${morningFallback.finalFallbackCount} (${(morningFallback.finalFallbackRate * 100).toFixed(2)}%)`);
      console.log(`  Last resort count: ${morningFallback.lastResortCount} (${(morningFallback.lastResortRate * 100).toFixed(2)}%)`);
      console.log(`  Total fallback rate: ${(morningFallback.fallbackTotalRate * 100).toFixed(2)}%`);
      if (morningFallback.fallbackTotalRate > 0.03) {
        console.log(`  ⚠️  WARNING: Fallback rate > 3% - eligibility gates may be too strict!`);
      }
    }
    
    if (eveningFallback) {
      console.log('\nEvening:');
      console.log(`  Final fallback count: ${eveningFallback.finalFallbackCount} (${(eveningFallback.finalFallbackRate * 100).toFixed(2)}%)`);
      console.log(`  Last resort count: ${eveningFallback.lastResortCount} (${(eveningFallback.lastResortRate * 100).toFixed(2)}%)`);
      console.log(`  Total fallback rate: ${(eveningFallback.fallbackTotalRate * 100).toFixed(2)}%`);
      if (eveningFallback.fallbackTotalRate > 0.03) {
        console.log(`  ⚠️  WARNING: Fallback rate > 3% - eligibility gates may be too strict!`);
      }
    }
  }
  
  // Task O2: Diagnostic - output cases where stateKey === 'uncertain' but forcedUncertain !== true
  const morningDiag = morningResults.diagnostics?.uncertainWithoutForceUncertain;
  const eveningDiag = eveningResults.diagnostics?.uncertainWithoutForceUncertain;
  const morningUncertainTotal = morningResults.stateCounts?.uncertain || 0;
  const eveningUncertainTotal = eveningResults.stateCounts?.uncertain || 0;
  const morningForcedUncertainTotal = morningResults.forcedUncertainMetrics?.total || 0;
  const eveningForcedUncertainTotal = eveningResults.forcedUncertainMetrics?.total || 0;
  
  console.log('\n⚠️  TASK O2 DIAGNOSTIC: Uncertain state vs forced uncertain discrepancy');
  console.log(`  Morning: uncertain count = ${morningUncertainTotal}, forced uncertain = ${morningForcedUncertainTotal}, diff = ${morningUncertainTotal - morningForcedUncertainTotal}`);
  console.log(`  Evening: uncertain count = ${eveningUncertainTotal}, forced uncertain = ${eveningForcedUncertainTotal}, diff = ${eveningUncertainTotal - eveningForcedUncertainTotal}`);
  
  // Task O2.5: Sanity check — invariant should hold
  const morningViolations = morningUncertainTotal - morningForcedUncertainTotal;
  const eveningViolations = eveningUncertainTotal - eveningForcedUncertainTotal;
  if (morningViolations > 0 || eveningViolations > 0) {
    console.log(`\n⚠️  TASK O2.5 INVARIANT VIOLATION: Found ${morningViolations + eveningViolations} cases where stateKey === "uncertain" but forcedUncertain !== true.`);
    console.log('  This violates the invariant: stateKey === "uncertain" → forcedUncertain === true');
  }
  
  if (morningDiag && morningDiag.count > 0) {
    console.log('\n⚠️  TASK O2.3 DIAGNOSTIC: Morning cases where stateKey === "uncertain" but forcedUncertain !== true');
    console.log(`  Total cases found: ${morningDiag.count}`);
    if (morningDiag.cases && morningDiag.cases.length > 0) {
      console.log('  Sample cases (first 20):');
      morningDiag.cases.slice(0, 20).forEach((c, i) => {
        console.log(`    ${i + 1}. stateKey: ${c.stateKey}, forcedUncertain: ${c.forcedUncertain}, dominant: ${c.dominant}, top1Key: ${c.top1Key}, uncertainReason: ${c.uncertainReason}, needsRefine: ${c.needsRefine}, confidenceBand: ${c.confidenceBand}, matchWarning: ${c.matchWarning}, eligibilityPass: ${c.eligibilityPass}`);
      });
    }
  } else if (morningViolations > 0) {
    console.log(`\n⚠️  TASK O2.3 WARNING: Morning has ${morningViolations} uncertain cases without forcedUncertain, but diagnostic found 0. This indicates a bug in the diagnostic logic.`);
  }
  if (eveningDiag && eveningDiag.count > 0) {
    console.log('\n⚠️  TASK O2.3 DIAGNOSTIC: Evening cases where stateKey === "uncertain" but forcedUncertain !== true');
    console.log(`  Total cases found: ${eveningDiag.count}`);
    if (eveningDiag.cases && eveningDiag.cases.length > 0) {
      console.log('  Sample cases (first 20):');
      eveningDiag.cases.slice(0, 20).forEach((c, i) => {
        console.log(`    ${i + 1}. stateKey: ${c.stateKey}, forcedUncertain: ${c.forcedUncertain}, dominant: ${c.dominant}, top1Key: ${c.top1Key}, uncertainReason: ${c.uncertainReason}, needsRefine: ${c.needsRefine}, confidenceBand: ${c.confidenceBand}, matchWarning: ${c.matchWarning}, eligibilityPass: ${c.eligibilityPass}`);
      });
    }
  } else if (eveningViolations > 0) {
    console.log(`\n⚠️  TASK O2.3 WARNING: Evening has ${eveningViolations} uncertain cases without forcedUncertain, but diagnostic found 0. This indicates a bug in the diagnostic logic.`);
  }

  // Task L1: Needs refine summary (uncertain state + low confidence)
  console.log('\n📊 NEEDS REFINE SUMMARY (Task L1)');
  console.log('-'.repeat(80));
  // Task P(B).4: Quality metrics block
  console.log('\n📊 QUALITY METRICS (Task P(B).4)');
  console.log('-'.repeat(80));
  console.log('\nMorning:');
  console.log(`  Uncertain state rate: ${(morningUncertainStateRate * 100).toFixed(2)}% (${morningQuality.uncertainStateCount || 0} cases)`);
  console.log(`  Forced uncertain rate: ${(morningForcedUncertainRate * 100).toFixed(2)}% (${morningQuality.forcedUncertainCount || 0} cases)`);
  console.log(`  Low clarity rate: ${(morningLowClarityRate * 100).toFixed(2)}% (${morningQuality.lowClarityCount || 0} cases)`);
  console.log(`  Medium clarity rate: ${((morningQuality.mediumClarityRate || 0) * 100).toFixed(2)}% (${morningQuality.mediumClarityCount || 0} cases)`);
  console.log(`  Needs refine rate: ${(morningNeedsRefineRate * 100).toFixed(2)}% (${morningQuality.needsRefineCount || 0} cases)`);
  console.log(`  Low confidence rate: ${((morningQuality.lowConfidenceRate || 0) * 100).toFixed(2)}% (${morningQuality.lowConfidenceCount || 0} cases)`);
  console.log(`  Match warning rate: ${((morningQuality.matchWarningRate || 0) * 100).toFixed(2)}% (${morningQuality.matchWarningCount || 0} cases)`);
  
  if (morningQuality.intersections) {
    console.log('\n  Intersections:');
    console.log(`    Low clarity AND needs refine: ${morningQuality.intersections.lowClarityAndNeedsRefine}`);
    console.log(`    Low clarity AND low confidence: ${morningQuality.intersections.lowClarityAndLowConfidence}`);
    console.log(`    Uncertain state AND low clarity: ${morningQuality.intersections.uncertainStateAndLowClarity}`);
  }
  
  if (morningQuality.needsRefineTopStates && morningQuality.needsRefineTopStates.length > 0) {
    console.log('\n  Top states among needsRefine:');
    morningQuality.needsRefineTopStates.slice(0, 5).forEach(({ key, count }) => {
      const pct = morningQuality.needsRefineCount > 0 ? ((count / morningQuality.needsRefineCount) * 100).toFixed(1) : 0;
      console.log(`    ${key}: ${count} (${pct}%)`);
    });
  }
  
  console.log('\nEvening:');
  console.log(`  Uncertain state rate: ${(eveningUncertainStateRate * 100).toFixed(2)}% (${eveningQuality.uncertainStateCount || 0} cases)`);
  console.log(`  Forced uncertain rate: ${(eveningForcedUncertainRate * 100).toFixed(2)}% (${eveningQuality.forcedUncertainCount || 0} cases)`);
  console.log(`  Low clarity rate: ${(eveningLowClarityRate * 100).toFixed(2)}% (${eveningQuality.lowClarityCount || 0} cases)`);
  console.log(`  Medium clarity rate: ${((eveningQuality.mediumClarityRate || 0) * 100).toFixed(2)}% (${eveningQuality.mediumClarityCount || 0} cases)`);
  console.log(`  Needs refine rate: ${(eveningNeedsRefineRate * 100).toFixed(2)}% (${eveningQuality.needsRefineCount || 0} cases)`);
  console.log(`  Low confidence rate: ${((eveningQuality.lowConfidenceRate || 0) * 100).toFixed(2)}% (${eveningQuality.lowConfidenceCount || 0} cases)`);
  console.log(`  Match warning rate: ${((eveningQuality.matchWarningRate || 0) * 100).toFixed(2)}% (${eveningQuality.matchWarningCount || 0} cases)`);
  
  if (eveningQuality.intersections) {
    console.log('\n  Intersections:');
    console.log(`    Low clarity AND needs refine: ${eveningQuality.intersections.lowClarityAndNeedsRefine}`);
    console.log(`    Low clarity AND low confidence: ${eveningQuality.intersections.lowClarityAndLowConfidence}`);
    console.log(`    Uncertain state AND low clarity: ${eveningQuality.intersections.uncertainStateAndLowClarity}`);
  }
  
  if (eveningQuality.needsRefineTopStates && eveningQuality.needsRefineTopStates.length > 0) {
    console.log('\n  Top states among needsRefine:');
    eveningQuality.needsRefineTopStates.slice(0, 5).forEach(({ key, count }) => {
      const pct = eveningQuality.needsRefineCount > 0 ? ((count / eveningQuality.needsRefineCount) * 100).toFixed(1) : 0;
      console.log(`    ${key}: ${count} (${pct}%)`);
    });
  }
  
  // Task P(B).4: Confidence band distribution
  const morningConfidenceDist = morningResults.confidenceBandMetrics?.distribution || {};
  const eveningConfidenceDist = eveningResults.confidenceBandMetrics?.distribution || {};
  console.log('\n  Confidence band distribution:');
  console.log('    Morning:');
  console.log(`      High: ${morningConfidenceDist.high || 0} (${morningTotalPaths > 0 ? ((morningConfidenceDist.high || 0) / morningTotalPaths * 100).toFixed(2) : 0}%)`);
  console.log(`      Medium: ${morningConfidenceDist.medium || 0} (${morningTotalPaths > 0 ? ((morningConfidenceDist.medium || 0) / morningTotalPaths * 100).toFixed(2) : 0}%)`);
  console.log(`      Low: ${morningConfidenceDist.low || 0} (${morningTotalPaths > 0 ? ((morningConfidenceDist.low || 0) / morningTotalPaths * 100).toFixed(2) : 0}%)`);
  console.log('    Evening:');
  console.log(`      High: ${eveningConfidenceDist.high || 0} (${eveningTotalPaths > 0 ? ((eveningConfidenceDist.high || 0) / eveningTotalPaths * 100).toFixed(2) : 0}%)`);
  console.log(`      Medium: ${eveningConfidenceDist.medium || 0} (${eveningTotalPaths > 0 ? ((eveningConfidenceDist.medium || 0) / eveningTotalPaths * 100).toFixed(2) : 0}%)`);
  console.log(`      Low: ${eveningConfidenceDist.low || 0} (${eveningTotalPaths > 0 ? ((eveningConfidenceDist.low || 0) / eveningTotalPaths * 100).toFixed(2) : 0}%)`);
  
  // Task W0.4: Selection path distribution
  console.log('\n📊 SELECTION PATH DISTRIBUTION (Task W0.4)');
  console.log('-'.repeat(80));
  const morningSelectionPaths = morningResults.selectionPathCounts || {};
  const eveningSelectionPaths = eveningResults.selectionPathCounts || {};
  const morningTotalForPaths = morningResults.totalPaths || 0;
  const eveningTotalForPaths = eveningResults.totalPaths || 0;
  
  console.log('\nMorning:');
  ['strict', 'hard', 'final_fallback', 'last_resort', 'none'].forEach(path => {
    const count = morningSelectionPaths[path] || 0;
    const rate = morningTotalForPaths > 0 ? (count / morningTotalForPaths * 100).toFixed(2) : 0;
    console.log(`  ${path.padEnd(20)}: ${count.toString().padStart(6)} (${rate}%)`);
  });
  console.log(`  Final fallback rate: ${((morningResults.finalFallbackRate || 0) * 100).toFixed(2)}%`);
  console.log(`  Last resort rate: ${((morningResults.lastResortRate || 0) * 100).toFixed(2)}%`);
  
  console.log('\nEvening:');
  ['strict', 'hard', 'final_fallback', 'last_resort', 'none'].forEach(path => {
    const count = eveningSelectionPaths[path] || 0;
    const rate = eveningTotalForPaths > 0 ? (count / eveningTotalForPaths * 100).toFixed(2) : 0;
    console.log(`  ${path.padEnd(20)}: ${count.toString().padStart(6)} (${rate}%)`);
  });
  console.log(`  Final fallback rate: ${((eveningResults.finalFallbackRate || 0) * 100).toFixed(2)}%`);
  console.log(`  Last resort rate: ${((eveningResults.lastResortRate || 0) * 100).toFixed(2)}%`);
  
  // Task I5.2: Confidence distribution summary (detailed already printed in I4 section)
  console.log('\n📊 CONFIDENCE DISTRIBUTION SUMMARY (Task I5.2)');
  console.log('-'.repeat(80));
  
  const morningConf = morningResults.confidenceBandMetrics;
  const eveningConf = eveningResults.confidenceBandMetrics;
  
  if (morningConf || eveningConf) {
    if (morningConf) {
      console.log('\nMorning:');
      console.log(`  High: ${morningConf.distribution.high} (${(morningConf.distribution.high / morningConf.total * 100).toFixed(1)}%)`);
      console.log(`  Medium: ${morningConf.distribution.medium} (${(morningConf.distribution.medium / morningConf.total * 100).toFixed(1)}%)`);
      console.log(`  Low: ${morningConf.distribution.low} (${(morningConf.distribution.low / morningConf.total * 100).toFixed(1)}%)`);
      if (morningConf.lowConfidenceTopStates.length > 0) {
        console.log('\n  Top states with low confidence:');
        morningConf.lowConfidenceTopStates.slice(0, 5).forEach(({ key, count }) => {
          const pct = morningConf.distribution.low > 0 ? ((count / morningConf.distribution.low) * 100).toFixed(1) : 0;
          console.log(`    ${key}: ${count} (${pct}%)`);
        });
      }
    }
    
    if (eveningConf) {
      console.log('\nEvening:');
      console.log(`  High: ${eveningConf.distribution.high} (${(eveningConf.distribution.high / eveningConf.total * 100).toFixed(1)}%)`);
      console.log(`  Medium: ${eveningConf.distribution.medium} (${(eveningConf.distribution.medium / eveningConf.total * 100).toFixed(1)}%)`);
      console.log(`  Low: ${eveningConf.distribution.low} (${(eveningConf.distribution.low / eveningConf.total * 100).toFixed(1)}%)`);
      if (eveningConf.lowConfidenceTopStates.length > 0) {
        console.log('\n  Top states with low confidence:');
        eveningConf.lowConfidenceTopStates.slice(0, 5).forEach(({ key, count }) => {
          const pct = eveningConf.distribution.low > 0 ? ((count / eveningConf.distribution.low) * 100).toFixed(1) : 0;
          console.log(`    ${key}: ${count} (${pct}%)`);
        });
      }
    }
  }

  console.log('\n' + '='.repeat(80));
}

// ---------- Task I5.1: Sanity checks (semantic invariants) ----------
function runSanityChecks(morningResults, eveningResults) {
  const errors = [];
  const warnings = [];
  
  // Task Z1: Connected semantic analysis (not a violation, just distribution analysis)
  const analyzeConnected = (results, sessionType) => {
    const connectedCount = results.stateCounts?.connected || 0;
    if (connectedCount > 0) {
      // Task Z1: This is not a warning - connected can appear legitimately
      // The fail-fast checks in simulation will catch actual violations (F_high || T_high || Vneg)
      // Here we just note the count for reference
      console.log(`\n📊 ${sessionType} Connected State Analysis (Task Z1):`);
      console.log(`  Connected count: ${connectedCount} (${results.totalPaths > 0 ? ((connectedCount / results.totalPaths) * 100).toFixed(2) : 0}%)`);
      console.log(`  Note: Fail-fast checks in simulation verify connected never appears with F_high || T_high || Vneg`);
      // Task Z1: TODO - Add distribution analysis (S_high rate, F/T/V distribution) if needed
    }
  };
  
  analyzeConnected(morningResults, 'Morning');
  analyzeConnected(eveningResults, 'Evening');
  
  // B) Reachability checks
  const checkReachability = (results, sessionType) => {
    const requiredStates = ['overloaded', 'blocked', 'pressured'];
    for (const state of requiredStates) {
      const count = results.stateCounts?.[state] || 0;
      if (count === 0) {
        errors.push(`${sessionType}: ${state} is unreachable (count=0)`);
        
        // Task J4: If overloaded is unreachable, print top-3 ineligibility reasons
        if (state === 'overloaded') {
          // Try to find eligibility diagnostics from gatingDiagnostics
          const gatingDiag = results.gatingDiagnostics;
          if (gatingDiag && gatingDiag.topReasons) {
            const overloadedReasons = gatingDiag.topReasons
              .filter(r => r.reason && r.reason.toLowerCase().includes('overloaded'))
              .slice(0, 3);
            if (overloadedReasons.length > 0) {
              errors.push(`  Top ineligibility reasons for overloaded:`);
              overloadedReasons.forEach(({ reason, count: reasonCount }) => {
                errors.push(`    - ${reason}: ${reasonCount} cases`);
              });
            }
          }
        }
      }
    }
  };
  
  checkReachability(morningResults, 'Morning');
  checkReachability(eveningResults, 'Evening');
  
  // Task T3: Sanity check - eveningCount === 0 is an error
  const checkEveningCount = (results, sessionType) => {
    const pathGen = results.pathGeneration;
    if (pathGen) {
      if (pathGen.eveningCounted === 0 && pathGen.eveningGenerated > 0) {
        errors.push(`${sessionType}: eveningCount === 0 but eveningGenerated === ${pathGen.eveningGenerated}. This is a regression - evening paths are being filtered out.`);
      }
      if (pathGen.eveningGenerated === 0) {
        errors.push(`${sessionType}: eveningGenerated === 0. This indicates a problem in path generation.`);
      }
    }
  };
  
  checkEveningCount(morningResults, 'Morning');
  checkEveningCount(eveningResults, 'Evening');
  
  // Task Y1: Pipeline coverage sanity check (stateKey must always be present)
  const checkPipelineCoverage = (results, sessionType) => {
    const violations = results.pipelineCoverageViolations || [];
    if (violations.length > 0) {
      errors.push(`${sessionType}: Found ${violations.length} baseline vectors where routeStateFromBaseline returned null/undefined stateKey. This violates pipeline coverage guarantee.`);
      if (violations.length <= 5) {
        console.error(`\n❌ ${sessionType} Pipeline Coverage Violations (Task Y1):`);
        for (const v of violations) {
          console.error(`  Baseline:`, v.baseline);
          console.error(`  Result:`, v.result);
        }
      }
    }
  };
  
  checkPipelineCoverage(morningResults, 'Morning');
  checkPipelineCoverage(eveningResults, 'Evening');
  
  // Task AA3/AA4/AA5: Report eligibility health metrics and sanity checks
  const reportEligibilityHealth = (results, sessionType) => {
    const metrics = results.eligibilityHealthMetrics || {};
    const totalPaths = results.totalPaths || 0;
    const finalFallbackRate = results.finalFallbackMetrics?.finalFallbackRate || 0;
    const lastResortRate = results.finalFallbackMetrics?.lastResortRate || 0;
    
    const preRescueStrict = metrics.preRescueStrictEmptyCount || 0;
    const preRescueHard = metrics.preRescueHardEmptyCount || 0;
    const preRescueBoth = metrics.preRescueBothEmptyCount || 0;
    const postRescueStrict = metrics.postRescueStrictEmptyCount || 0;
    const postRescueHard = metrics.postRescueHardEmptyCount || 0;
    const postRescueBoth = metrics.postRescueBothEmptyCount || 0;
    
    console.log(`\n📊 ${sessionType} Eligibility Health Metrics (Task AA3):`);
    console.log(`  Pre-rescue (before fallback):`);
    console.log(`    Strict empty: ${preRescueStrict} (${totalPaths > 0 ? ((preRescueStrict / totalPaths) * 100).toFixed(2) : 0}%)`);
    console.log(`    Hard empty: ${preRescueHard} (${totalPaths > 0 ? ((preRescueHard / totalPaths) * 100).toFixed(2) : 0}%)`);
    console.log(`    Both empty: ${preRescueBoth} (${totalPaths > 0 ? ((preRescueBoth / totalPaths) * 100).toFixed(2) : 0}%)`);
    console.log(`  Post-rescue (after all fallback steps):`);
    console.log(`    Strict empty: ${postRescueStrict} (${totalPaths > 0 ? ((postRescueStrict / totalPaths) * 100).toFixed(2) : 0}%)`);
    console.log(`    Hard empty: ${postRescueHard} (${totalPaths > 0 ? ((postRescueHard / totalPaths) * 100).toFixed(2) : 0}%)`);
    console.log(`    Both empty: ${postRescueBoth} (${totalPaths > 0 ? ((postRescueBoth / totalPaths) * 100).toFixed(2) : 0}%)`);
    
    // Task AA4: Sanity invariant checks
    if (finalFallbackRate === 0 && lastResortRate === 0 && postRescueBoth > 0) {
      errors.push(`${sessionType}: postRescueBothEmpty=${postRescueBoth} but finalFallbackRate=0 and lastResortRate=0. This violates sanity invariant AA4.`);
    }
    if (postRescueBoth > 0 && finalFallbackRate === 0 && lastResortRate === 0) {
      errors.push(`${sessionType}: postRescueBothEmpty=${postRescueBoth} should correlate with non-zero fallback rates, but both are 0.`);
    }
    
    // Task AA5: Dump examples from postRescueBothEmpty vectors
    const postRescueVectors = results.postRescueBothEmptyVectors || [];
    if (postRescueVectors.length > 0) {
      console.log(`\n📊 ${sessionType} Post-Rescue Both Empty Vectors (Task AA5):`);
      console.log(`  Found ${postRescueVectors.length} vectors with strict=0 AND hard=0 after all rescue steps`);
      console.log(`  Detailed dump (first ${Math.min(5, postRescueVectors.length)}):`);
      for (const v of postRescueVectors.slice(0, 5)) {
        console.log(`    Baseline:`, v.baseline);
        console.log(`      Levels:`, v.levels);
        console.log(`      Selection path: ${v.selectionPath}`);
        console.log(`      Final stateKey: ${v.stateKey}`);
        console.log(`      Selection diagnostics:`, JSON.stringify(v.selectionDiagnostics, null, 2));
        console.log(`      Fallback used: ${v.fallbackUsed}, Last resort: ${v.lastResortUsed}`);
      }
    }
  };
  
  reportEligibilityHealth(morningResults, 'Morning');
  reportEligibilityHealth(eveningResults, 'Evening');
  
  // C) Uncertain rate check (Task P(B).5: updated threshold to ≤ 12%)
  const checkUncertain = (results, sessionType) => {
    const quality = results.qualityMetrics || {};
    const uncertainStateCount = quality.uncertainStateCount || results.stateCounts?.uncertain || 0;
    const forcedUncertainCount = quality.forcedUncertainCount || results.forcedUncertainMetrics?.total || 0;
    const totalPaths = results.totalPaths || 0;
    const uncertainStateRate = quality.uncertainStateRate || (totalPaths > 0 ? (uncertainStateCount / totalPaths) : 0);
    const forcedUncertainRate = quality.forcedUncertainRate || (totalPaths > 0 ? (forcedUncertainCount / totalPaths) : 0);
    
    // Task P(B).5: Hard threshold — uncertain_state_rate ≤ 12%
    if (uncertainStateRate > 0.12) {
      errors.push(`${sessionType}: uncertain_state_rate is ${(uncertainStateRate * 100).toFixed(2)}% (target: ≤ 12%)`);
    }
    
    // Task P(B).5: Invariant — forcedUncertainRate == uncertain_state_rate
    const rateDiff = Math.abs(forcedUncertainRate - uncertainStateRate);
    if (rateDiff > 0.001) { // Allow small floating point differences
      errors.push(`${sessionType}: Invariant violation — forcedUncertainRate (${(forcedUncertainRate * 100).toFixed(2)}%) != uncertain_state_rate (${(uncertainStateRate * 100).toFixed(2)}%), diff = ${(rateDiff * 100).toFixed(2)}%`);
    }
    
    // Task P(B).5: New invariant — clarityFlag === 'low' НЕ обязан приводить к stateKey === 'uncertain'
    const lowClarityCount = quality.lowClarityCount || 0;
    const uncertainStateAndLowClarity = quality.intersections?.uncertainStateAndLowClarity || 0;
    const lowClarityWithoutUncertain = lowClarityCount - uncertainStateAndLowClarity;
    
    if (lowClarityWithoutUncertain === 0 && lowClarityCount > 0) {
      errors.push(`${sessionType}: All low clarity cases (${lowClarityCount}) result in uncertain state. This violates P(B).2: clarityFlag === 'low' should NOT force uncertain.`);
    } else if (lowClarityWithoutUncertain < 10 && lowClarityCount > 50) {
      warnings.push(`${sessionType}: Only ${lowClarityWithoutUncertain} out of ${lowClarityCount} low clarity cases have non-uncertain state. This may indicate clarity is still forcing uncertain.`);
    }
    
    // Task P(B).5: Extreme uncertain sanity — each uncertain case should match thresholds
    // This is a soft check (warning) since we can't easily verify all cases here
    const forcedUncertainMetrics = results.forcedUncertainMetrics || {};
    const reasonBreakdown = forcedUncertainMetrics.reasonBreakdown || [];
    const extremeUncertainCount = reasonBreakdown.find(r => r.reason === 'extreme_uncertainty')?.count || 0;
    const allFilteredCount = reasonBreakdown.find(r => r.reason === 'all_filtered')?.count || 0;
    const otherReasonsCount = uncertainStateCount - extremeUncertainCount - allFilteredCount;
    
    if (otherReasonsCount > 0) {
      warnings.push(`${sessionType}: Found ${otherReasonsCount} uncertain cases with reasons other than 'extreme_uncertainty' or 'all_filtered'. This may indicate forced uncertain is not following P(B).1 rules.`);
    }
  };
  
  checkUncertain(morningResults, 'Morning');
  checkUncertain(eveningResults, 'Evening');
  
  // D) Confidence band quality checks
  const checkConfidence = (results, sessionType) => {
    const confidenceMetrics = results.confidenceBandMetrics;
    if (confidenceMetrics) {
      const lowConfidenceRate = confidenceMetrics.lowConfidenceRate || 0;
      if (lowConfidenceRate > 0.55) {
        warnings.push(`${sessionType}: low confidence rate is ${(lowConfidenceRate * 100).toFixed(2)}% (target: <55%)`);
      }
      
      // Check matchWarning distribution
      const matchWarningCount = results.forcedUncertainMetrics?.reasonBreakdown?.find(r => r.reason === 'weak_match_extreme')?.count || 0;
      const totalForced = results.forcedUncertainMetrics?.total || 0;
      if (totalForced > 0) {
        const matchWarningRate = matchWarningCount / totalForced;
        if (matchWarningRate > 0.45) {
          warnings.push(`${sessionType}: weak_match_extreme is ${(matchWarningRate * 100).toFixed(2)}% of forced uncertain (target: <45%)`);
        }
      }
    }
  };
  
  checkConfidence(morningResults, 'Morning');
  checkConfidence(eveningResults, 'Evening');
  
  // Print results
  if (errors.length > 0) {
    console.error('\n❌ SANITY CHECK ERRORS (Task I5.1):');
    console.error('-'.repeat(80));
    errors.forEach(err => console.error(`  ERROR: ${err}`));
    console.error('-'.repeat(80));
  }
  
  if (warnings.length > 0) {
    console.warn('\n⚠️  SANITY CHECK WARNINGS (Task I5.1):');
    console.warn('-'.repeat(80));
    warnings.forEach(warn => console.warn(`  WARNING: ${warn}`));
    console.warn('-'.repeat(80));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ SANITY CHECKS PASSED (Task I5.1)');
  }
  
  // Return exit code: 1 if errors, 0 otherwise
  return errors.length > 0 ? 1 : 0;
}

// ---------- Main execution ----------
async function main() {
  // Task W0.2: Initialize canonical routeStateFromBaseline using dynamic import
  try {
    // Use file:// URL for ES module import from CommonJS
    const baselineEnginePath = path.resolve(__dirname, '../src/utils/baselineEngine.js');
    const baselineEngineUrl = `file://${baselineEnginePath.replace(/\\/g, '/')}`;
    const baselineEngine = await import(baselineEngineUrl);
    routeStateFromBaselineCanonical = baselineEngine.routeStateFromBaseline;
    
    if (!routeStateFromBaselineCanonical) {
      throw new Error('Failed to import routeStateFromBaseline from baselineEngine.js');
    }
    
    console.log('Starting simplified flow balance check...\n');
  } catch (err) {
    console.error('Failed to import baselineEngine:', err);
    console.error('Error details:', err.message);
    throw err;
  }

  const morningResults = simulateSimplifiedFlow('morning');
  const eveningResults = simulateSimplifiedFlow('evening');

  generateReport(morningResults, eveningResults);
  
  // Task I5.1: Run sanity checks
  const exitCode = runSanityChecks(morningResults, eveningResults);
  
  // Exit with code (0 = success, 1 = errors)
  if (exitCode !== 0) {
    process.exit(exitCode);
  }

  // Save detailed results to JSON
  const outputPath = path.join(__dirname, 'out', 'simplified-balance.json');
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    morning: {
      totalPaths: morningResults.totalPaths,
      stateCounts: morningResults.stateCounts,
      stateDetails: Object.fromEntries(
        Object.entries(morningResults.stateDetails).map(([k, v]) => [
          k,
          {
            count: v.count,
            avgConfidence: v.totalConfidence / v.count,
            examples: v.examples,
          },
        ])
      ),
    },
    evening: {
      totalPaths: eveningResults.totalPaths,
      stateCounts: eveningResults.stateCounts,
      stateDetails: Object.fromEntries(
        Object.entries(eveningResults.stateDetails).map(([k, v]) => [
          k,
          {
            count: v.count,
            avgConfidence: v.totalConfidence / v.count,
            examples: v.examples,
          },
        ])
      ),
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Detailed report saved to: ${outputPath}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
