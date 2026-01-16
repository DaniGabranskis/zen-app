// src/utils/recommendationsEngine.js

export const RECOMMENDATIONS = [
  {
    key: "breathe",
    title: "Breeze",
    kind: "breath",
    durationSec: 45, // Default fallback; actual value is overridden by getBreezeDurationSec(intensity).
    description: "A short breathing reset to lower activation and regain control.",
    signals: {
      emotions: ["anxiety", "tension", "anger", "frustration", "overload", "fear"],
      states: ["pressured","threatened","overloaded","confrontational","uncertain"],
      tagsAny: ["l1_body_tension", "l1_pressure_high", "l2_uncert_high", "l2_social_threat"],
      bodyMindAny: ["shallow breathing", "heart racing", "tight chest", "butterflies", "restless"],
      intensityMin: 2,
    },
  },
  {
    key: "grounding",
    title: "Grounding",
    kind: "grounding",
    description: "A grounding routine to return attention to the body and the present moment.",
    signals: {
      emotions: ["anxiety", "confusion", "overload", "disconnected", "numbness", "fatigue"],
      states: ["threatened","overloaded","pressured","uncertain"],
      tagsAny: ["l2_shutdown", "l2_disconnect_numb", "l1_clarity_low"],
      bodyMindAny: ["numb", "dissociated", "floaty", "shaky", "jaw clenching"],
      intensityMin: 1,
    },
  },
  {
    key: "micro_plan",
    title: "Micro Plan",
    kind: "plan",
    description: "Turn the day into 1–3 tiny steps to reduce overwhelm.",
    signals: {
      emotions: ["overload", "sadness", "confusion", "anxiety", "fatigue"],
      states: ["overloaded","pressured","uncertain"],
      tagsAny: ["l1_pressure_high", "l2_focus_future", "l2_uncert_high", "l2_meaning_low"],
      intensityMin: 2,
    },
  },
  {
    key: "compassion",
    title: "Self-Compassion",
    kind: "compassion",
    description: "A gentle exercise to reduce self-judgment and shame.",
    signals: {
      emotions: ["shame", "guilt"],
      states: ["self_critical","down"],
      tagsAny: ["l2_guilt", "l1_worth_low"],
      intensityMin: 1,
    },
  },
  {
    key: "reframe",
    title: "Reframe",
    kind: "cognitive",
    description: "A short reframe to shift perspective without denying reality.",
    signals: {
      emotions: ["frustration", "anger", "confusion"],
      states: ["blocked","confrontational","uncertain","pressured"],
      tagsAny: ["l1_control_low", "l1_expect_low", "l2_let_down"],
      intensityMin: 1,
    },
  },
  {
    key: "connect",
    title: "Connection Nudge",
    kind: "social",
    description: "A small, concrete step toward support or contact.",
    signals: {
      emotions: ["disconnected", "sadness", "shame"],
      states: ["detached","down","self_critical"],
      tagsAny: ["l2_social_pain_yes", "l1_safety_low"],
      intensityMin: 1,
    },
  },
  {
    key: "rest",
    title: "Rest Reset",
    kind: "rest",
    description: "A brief recovery plan for low energy and fatigue.",
    signals: {
      emotions: ["overload", "sadness", "fatigue"],
      states: ["exhausted","overloaded","down"],
      tagsAny: ["l1_energy_low"],
      intensityMin: 1,
    },
  },
  {
    key: "gratitude",
    title: "Gratitude Anchor",
    kind: "positive",
    description: "Lock in something good from today to stabilize mood.",
    signals: {
      emotions: ["gratitude", "calm", "joy", "clarity", "connection", "confidence"],
      states: ["grounded","connected"],
      tagsAny: ["l2_pos_gratitude", "l2_content_warm", "l2_clarity_high"],
      intensityMin: 0,
    },
  },
  {
    key: "values",
    title: "Values Check",
    kind: "meaning",
    description: "Reconnect actions with what matters most.",
    signals: {
      emotions: ["confusion", "sadness", "disconnected"],
      states: ["uncertain","blocked","pressured"],
      tagsAny: ["l2_meaning_low"],
      intensityMin: 1,
    },
  },
  {
    key: "body_release",
    title: "Body Release",
    kind: "body",
    description: "A short release routine for tension patterns.",
    signals: {
      emotions: ["tension", "anxiety", "frustration", "overload"],
      states: ["pressured","threatened","overloaded","blocked"],
      tagsAny: ["l1_body_tension"],
      bodyMindAny: ["jaw clenching", "tight shoulders", "stiff neck"],
      intensityMin: 1,
    },
  },
];

// -------------------------
// Helpers (module-scope)
// -------------------------

function normArr(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((x) => String(x));
  return [String(value)];
}

function normStr(value) {
  return String(value || "").trim().toLowerCase();
}

function includesAny(haystack, needles) {
  const hs = normArr(haystack).map(normStr);
  const ns = normArr(needles).map(normStr);

  for (const n of ns) {
    if (!n) continue;
    for (const h of hs) {
      if (h.includes(n)) return true;
    }
  }
  return false;
}

function hasAnyTag(evidenceTags, tagsAny) {
  const hs = normArr(evidenceTags).map(normStr);
  const ns = normArr(tagsAny).map(normStr);
  for (const n of ns) {
    if (!n) continue;
    if (hs.includes(n)) return true;
  }
  return false;
}

// -------------------------
// State detectors (exported for safety)
// -------------------------

export function isHighArousal(input) {
  const emotion = normStr(input?.dominant);
  const intensity = Number(input?.intensity || 0);
  const evidenceTags = input?.evidenceTags || input?.tags || [];
  const bodyMind = input?.bodyMind || [];

  const HIGH_AROUSAL_EMOTIONS = new Set([
    "anxiety",
    "fear",
    "anger",
    "frustration",
    "tension",
    "overload",
  ]);

  if (intensity >= 7) return true;
  if (HIGH_AROUSAL_EMOTIONS.has(emotion)) return true;

  if (hasAnyTag(evidenceTags, ["l1_body_tension", "l1_pressure_high", "l2_uncert_high", "l2_social_threat"])) {
    return true;
  }

  if (includesAny(bodyMind, ["shallow breathing", "heart racing", "tight chest", "butterflies", "restless"])) {
    return true;
  }

  return false;
}

export function isSelfJudgment(input) {
  const emotion = normStr(input?.dominant);
  const evidenceTags = input?.evidenceTags || input?.tags || [];
  const triggers = input?.triggers || [];

  const SELF_JUDGMENT_EMOTIONS = new Set(["shame", "guilt", "embarrassment"]);

  if (SELF_JUDGMENT_EMOTIONS.has(emotion)) return true;
  if (hasAnyTag(evidenceTags, ["l2_guilt", "l1_worth_low"])) return true;
  if (includesAny(triggers, ["self", "critic", "perfection", "not good enough"])) return true;

  return false;
}

// -------------------------
// Scoring + selection
// -------------------------

function scoreRecommendation(rec, input) {
  const dominantState = normStr(input?.stateKey ?? input?.dominant);
  const secondaryState = normStr(input?.secondary);
  const intensity = Number(input?.intensity || 0);

  const evidenceTags = input?.evidenceTags || input?.tags || [];
  const triggers = input?.triggers || [];
  const bodyMind = input?.bodyMind || [];

  let score = 0;

  const s = rec.signals || {};

  // State match
  if (Array.isArray(s.states) && s.states.map(normStr).includes(dominantState)) score += 4;
  else if (Array.isArray(s.states) && s.states.map(normStr).includes(secondaryState)) score += 2;

  // Emotion match (legacy input)
  const dominantEmotion = normStr(input?.emotionKey ?? input?.dominantEmotion);
  const secondaryEmotion = normStr(input?.secondaryEmotion);
  if (Array.isArray(s.emotions) && s.emotions.map(normStr).includes(dominantEmotion)) score += 3;
  else if (Array.isArray(s.emotions) && s.emotions.map(normStr).includes(secondaryEmotion)) score += 1;

  // Tags match (cap only tag part, not total score)
  let tagScore = 0;
  if (Array.isArray(s.tagsAny)) {
    for (const t of s.tagsAny) {
      if (hasAnyTag(evidenceTags, [t])) tagScore += 1;
    }
  }
  tagScore = Math.min(tagScore, 3);
  score += tagScore;

  // BodyMind and triggers (soft)
  if (Array.isArray(s.bodyMindAny) && includesAny(bodyMind, s.bodyMindAny)) score += 2;
  if (Array.isArray(s.triggersAny) && includesAny(triggers, s.triggersAny)) score += 2;

  // Intensity gates
  const minI = Number(s.intensityMin ?? 0);
  if (intensity < minI) score -= 3;
  else if (intensity >= minI && minI > 0) score += 1;

  // State boosts
  const high = isHighArousal(input);
  const selfJ = isSelfJudgment(input);

  if (high) {
    if (rec.kind === "breath" || rec.kind === "grounding" || rec.kind === "body") score += 4;
    if (rec.kind === "cognitive") score -= 1;
  }

  if (selfJ) {
    if (rec.kind === "compassion") score += 6;
    if (rec.kind === "cognitive") score += 1;
  }

  return score;
}

function pickTopWithDiversity(scored, limit = 3) {
  // Prefer different "kind" to avoid 3 одинаковые карточки
  const chosen = [];
  const usedKinds = new Set();

  for (const item of scored) {
    if (chosen.length >= limit) break;
    const k = item.rec.kind || "misc";
    if (usedKinds.has(k)) continue;
    chosen.push(item);
    usedKinds.add(k);
  }

  // Fill if not enough
  for (const item of scored) {
    if (chosen.length >= limit) break;
    if (chosen.includes(item)) continue;
    chosen.push(item);
  }

  return chosen.slice(0, limit).map((x) => x.rec);
}

function getBreezeDurationSec(intensity) {
  const i = Number(intensity || 0);
  if (!Number.isFinite(i)) return 45;

  // Intensity is 0..10 (see intensity/estimator.js). Use 60s only for very high intensity.
  if (i >= 8) return 60;
  if (i >= 5) return 45;
  return 30;
}

export function selectRecommendations(input, limit = 3) {
  const scored = RECOMMENDATIONS
    .map((rec) => ({ rec, score: scoreRecommendation(rec, input) }))
    .sort((a, b) => b.score - a.score);

  const picked = pickTopWithDiversity(scored, limit);
  const breezeDurationSec = getBreezeDurationSec(input?.intensity);

  console.log('[recEngine] intensity=', input?.intensity, 'breezeSec=', breezeDurationSec);

  return picked.map((rec) => {
    if (rec.key !== 'breathe') return rec;
    return { ...rec, durationSec: breezeDurationSec };
  });
}