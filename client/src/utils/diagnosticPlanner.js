// src/utils/diagnosticPlanner.js
// Comments in English only.

const MID = 4;

function distFromMid(v) {
  if (typeof v !== 'number') return 0;
  return Math.abs(v - MID);
}

function pickByValence(v) {
  if (v <= 3) return 'L2_heavy';
  if (v >= 5) return 'L2_positive_moments';
  return null;
}

function pickByClarity(v) {
  if (v <= 3) return 'L2_uncertainty';
  if (v >= 5) return 'L2_clarity';
  return null;
}

function pickByControl(v) {
  if (v <= 3) return 'L2_regulation';
  return null;
}

function pickByTension(v) {
  if (v >= 5) return 'L2_source';
  return null;
}

function pickByEnergy(v) {
  if (v <= 3) return 'L2_regulation';
  if (v >= 5) return 'L2_focus';
  return null;
}

function pickBySocial(v) {
  if (v <= 3) return 'L2_numb';
  if (v >= 5) return 'L2_social_pain';
  return null;
}

function pickPlanQuestion(focusTags) {
  const tags = focusTags || [];
  if (tags.includes('plan_focus_work')) return 'L2_focus';
  if (tags.includes('plan_focus_social')) return 'L2_social_pain';
  if (tags.includes('plan_focus_health')) return 'L2_regulation';
  if (tags.includes('plan_focus_rest')) return 'L2_numb';
  if (tags.includes('plan_focus_admin')) return 'L2_uncertainty';
  if (tags.includes('plan_focus_learning')) return 'L2_meaning';
  return null;
}

export function buildDiagnosticPlan({
  baselineMetrics = {},
  mode = 'simplified',
  sessionType = 'morning',
  plans = { focusTags: [], intensity: 'med' },
} = {}) {
  // Target sizes aligned with MVP.
  // Simplified => 0 (no diagnostics at all).
  // Deep must guarantee 6-10 questions as per requirements.
  let target = 0;

  if (mode === 'deep') {
    target = sessionType === 'morning' ? 7 : 10; // 6-10 range
  }

  if (target <= 0) return [];

  const picks = [];
  const used = new Set();

  const planQ = pickPlanQuestion(plans?.focusTags);
  if (planQ) {
    picks.push(planQ);
    used.add(planQ);
  }

  const candidates = [
    pickByValence(baselineMetrics.valence),
    pickByEnergy(baselineMetrics.energy),
    pickByTension(baselineMetrics.tension),
    pickByClarity(baselineMetrics.clarity),
    pickByControl(baselineMetrics.control),
    pickBySocial(baselineMetrics.social),
  ].filter(Boolean);

  // Sort by "severity" so the most extreme metrics get priority.
  const severity = [
    { k: 'valence', v: distFromMid(baselineMetrics.valence) },
    { k: 'energy', v: distFromMid(baselineMetrics.energy) },
    { k: 'tension', v: distFromMid(baselineMetrics.tension) },
    { k: 'clarity', v: distFromMid(baselineMetrics.clarity) },
    { k: 'control', v: distFromMid(baselineMetrics.control) },
    { k: 'social', v: distFromMid(baselineMetrics.social) },
  ].sort((a, b) => b.v - a.v);

  const ordered = [];
  for (const s of severity) {
    let q = null;
    if (s.k === 'valence') q = pickByValence(baselineMetrics.valence);
    if (s.k === 'energy') q = pickByEnergy(baselineMetrics.energy);
    if (s.k === 'tension') q = pickByTension(baselineMetrics.tension);
    if (s.k === 'clarity') q = pickByClarity(baselineMetrics.clarity);
    if (s.k === 'control') q = pickByControl(baselineMetrics.control);
    if (s.k === 'social') q = pickBySocial(baselineMetrics.social);
    if (q) ordered.push(q);
  }

  for (const q of ordered.concat(candidates)) {
    if (!q) continue;
    if (used.has(q)) continue;
    picks.push(q);
    used.add(q);
    if (picks.length >= target) break;
  }

  // Fallback pool for Deep: if we don't have enough questions, add generic L1 questions
  if (mode === 'deep' && picks.length < target) {
    const fallbackL1 = [
      'L1_mood',
      'L1_body',
      'L1_energy',
      'L1_social',
      'L1_control',
      'L1_safety',
      'L1_self_worth',
      'L1_expectations',
      'L1_pressure',
      'L1_clarity',
    ];

    for (const q of fallbackL1) {
      if (used.has(q)) continue;
      picks.push(q);
      used.add(q);
      if (picks.length >= target) break;
    }
  }

  return picks.slice(0, target);
}
