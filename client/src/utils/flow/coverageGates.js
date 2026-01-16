// src/utils/flow/coverageGates.js
// Comments in English only.

/**
 * Coverage gates define what "core exploration" must cover before allowing
 * discriminator selection and early stop.
 *
 * This is intentionally kept simple and auditable.
 */
export const CORE_GATES = {
  valence: { min: 1, max: 2 },
  arousal: { min: 1, max: 2 },
  agency: { min: 1, max: 2 },
  clarity: { min: 1, max: 1 },
  safety: { min: 1, max: 1 },
  // Social is optional but desirable.
  social: { min: 0, max: 1, desirable: 1 },
};

/** Initialize empty coverage tracker. */
export function initCoverage() {
  return {
    valence: 0,
    arousal: 0,
    agency: 0,
    clarity: 0,
    safety: 0,
    social: 0,
    tension: 0,
    fatigue: 0,
  };
}

/**
 * Apply a card's declared coverage to the tracker.
 * Coverage is about "axis touched", not about tag evidence strength.
 */
export function applyCoverage(prev, card) {
  const next = { ...(prev || initCoverage()) };
  const covers = card?.meta?.covers;
  if (!Array.isArray(covers)) return next;

  for (const axis of covers) {
    if (typeof axis !== 'string') continue;
    if (typeof next[axis] !== 'number') next[axis] = 0;
    next[axis] += 1;
  }
  return next;
}

/** Returns true if all required gates are satisfied. */
export function isCoreCoverageComplete(coverage) {
  const c = coverage || {};
  for (const [axis, gate] of Object.entries(CORE_GATES)) {
    const min = Number(gate?.min ?? 0);
    const v = Number(c[axis] ?? 0);
    if (v < min) return false;
  }
  return true;
}

/**
 * Returns list of missing required axes in a stable order.
 * Social is included only if you want to treat it as required.
 */
export function missingRequiredAxes(coverage) {
  const c = coverage || {};
  const order = ['valence', 'arousal', 'agency', 'clarity', 'safety'];
  const missing = [];
  for (const axis of order) {
    const min = Number(CORE_GATES?.[axis]?.min ?? 0);
    if (Number(c[axis] ?? 0) < min) missing.push(axis);
  }
  return missing;
}

/** Returns list of axes that are desirable but not required and still missing. */
export function missingDesirableAxes(coverage) {
  const c = coverage || {};
  const desirable = [];
  for (const [axis, gate] of Object.entries(CORE_GATES)) {
    const want = gate?.desirable;
    if (!want) continue;
    if (Number(c[axis] ?? 0) < Number(want)) desirable.push(axis);
  }
  return desirable;
}
