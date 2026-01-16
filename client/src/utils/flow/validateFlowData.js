// src/utils/flow/validateFlowData.js
// Comments in English only.

import { CORE_GATES } from './coverageGates';

export function validateFlowCards(cards = []) {
  const errors = [];
  const warnings = [];

  const ids = new Set();
  for (const c of cards) {
    if (!c?.id) errors.push('Card missing id');
    if (c?.id && ids.has(c.id)) errors.push(`Duplicate card id: ${c.id}`);
    if (c?.id) ids.add(c.id);

    if (!c?.title) warnings.push(`Card "${c?.id}" missing title`);
    if (!c?.type) warnings.push(`Card "${c?.id}" missing type`);

    const group = c?.meta?.group;
    if (!group) warnings.push(`Card "${c?.id}" missing meta.group`);

    const covers = c?.meta?.covers;
    if (!Array.isArray(covers)) warnings.push(`Card "${c?.id}" missing meta.covers[]`);

    if (group === 'discriminator') {
      const disc = c?.meta?.discriminates;
      if (!Array.isArray(disc) || disc.length === 0) {
        warnings.push(`Discriminator card "${c?.id}" missing meta.discriminates`);
      }
    }
  }

  // Validate core coverage presence
  const core = cards.filter((c) => c?.meta?.group === 'core');
  const axisCoverage = {};
  for (const c of core) {
    for (const a of (c?.meta?.covers || [])) {
      axisCoverage[a] = (axisCoverage[a] || 0) + 1;
    }
  }
  for (const [axis, gate] of Object.entries(CORE_GATES)) {
    const min = Number(gate?.min ?? 0);
    if (min > 0 && !axisCoverage[axis]) {
      warnings.push(`Core pack does not cover required axis: ${axis}`);
    }
  }

  return { errors, warnings };
}
