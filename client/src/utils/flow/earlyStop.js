// src/utils/flow/earlyStop.js
// Comments in English only.

import { isCoreCoverageComplete } from './coverageGates';
import { hasDiscriminatorAskedFor } from './discriminatorTracker';

/**
 * Compute notSure domination in the last N answers.
 */
export function notSureDomination(accepted, windowSize = 5, threshold = 3) {
  const arr = Array.isArray(accepted) ? accepted : [];
  const last = arr.slice(-windowSize);
  const count = last.filter((x) => x?.answer === 'notSure').length;
  return {
    windowSize,
    threshold,
    count,
    isDominant: count >= threshold,
  };
}

/**
 * Decide whether we can early-stop.
 * Conditions:
 *  - askedCount >= minQuestions
 *  - core coverage complete
 *  - discriminator asked for top-2
 *  - confidence gap >= minGap
 *  - notSure not dominating recent window
 */
export function canEarlyStop({
  askedCount,
  minQuestions,
  coreCoverage,
  askedDiscriminators,
  top1,
  top2,
  confidenceGap,
  minGap,
  accepted,
  notSureWindow = 5,
  notSureThreshold = 3,
}) {
  if (Number(askedCount || 0) < Number(minQuestions || 0)) return false;
  if (!isCoreCoverageComplete(coreCoverage)) return false;
  if (!hasDiscriminatorAskedFor(askedDiscriminators, top1, top2)) return false;
  if (Number(confidenceGap || 0) < Number(minGap || 0)) return false;

  const ns = notSureDomination(accepted, notSureWindow, notSureThreshold);
  if (ns.isDominant) return false;

  return true;
}
