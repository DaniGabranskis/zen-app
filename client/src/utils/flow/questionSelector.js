// src/utils/flow/questionSelector.js
// Comments in English only.

import { missingRequiredAxes, missingDesirableAxes } from './coverageGates';
import { pairKey } from './discriminatorTracker';

/**
 * Pick next card id according to:
 *  - core gates first (fill missing axes)
 *  - then discriminator for current top-2
 *  - then confirm / fallback remaining
 *
 * This selector is deterministic and avoids repeats.
 */
export function selectNextCardId({
  cardsById,
  allIds,
  askedIds,
  coverage,
  coreComplete,
  top1,
  top2,
  askedDiscriminators,
  askedCount,
}) {
  const asked = askedIds instanceof Set ? askedIds : new Set(askedIds || []);
  const getCard = (id) => cardsById?.[id];

  const notAsked = allIds.filter((id) => !asked.has(id));

  // 1) If core is not complete — target missing required axes
  if (!coreComplete) {
    const missing = missingRequiredAxes(coverage);
    const desirable = missingDesirableAxes(coverage);

    const targetAxes = [...missing, ...desirable];

    for (const axis of targetAxes) {
      const candidate = notAsked.find((id) => {
        const c = getCard(id);
        if (c?.meta?.group !== 'core') return false;
        const covers = c?.meta?.covers;
        return Array.isArray(covers) && covers.includes(axis);
      });
      if (candidate) return candidate;
    }

    // fallback: any remaining core
    const anyCore = notAsked.find((id) => getCard(id)?.meta?.group === 'core');
    if (anyCore) return anyCore;
  }

  // 2) After core: try discriminator for top-2
  const t1 = String(top1 || '').toLowerCase();
  const t2 = String(top2 || '').toLowerCase();
  const wantPair = pairKey(t1, t2);

  const discriminatorCandidates = notAsked.filter((id) => {
    const c = getCard(id);
    if (c?.meta?.group !== 'discriminator') return false;
    const minAskedAfter = Number(c?.meta?.minAskedAfter ?? 0);
    if (Number(askedCount || 0) < minAskedAfter) return false;
    return true;
  });

  if (wantPair) {
    const match = discriminatorCandidates.find((id) => {
      const c = getCard(id);
      const pairs = c?.meta?.discriminates;
      if (!Array.isArray(pairs)) return false;
      return pairs.some((p) => Array.isArray(p) && p.length === 2 && pairKey(p[0], p[1]) === wantPair);
    });
    if (match) return match;
  }

  // fallback: any discriminator not asked
  if (discriminatorCandidates.length) return discriminatorCandidates[0];

  // 3) Confirm / fallback
  const confirmCandidates = notAsked.filter((id) => {
    const c = getCard(id);
    const minAskedAfter = Number(c?.meta?.minAskedAfter ?? 0);
    if (Number(askedCount || 0) < minAskedAfter) return false;
    return c?.meta?.group === 'confirm';
  });

  if (confirmCandidates.length) return confirmCandidates[0];

  // 4) Absolute fallback: any not asked
  return notAsked[0] || null;
}
