// src/utils/flow/discriminatorTracker.js
// Comments in English only.

/** Normalize a pair of emotion keys into a stable string key. */
export function pairKey(a, b) {
  const x = String(a || '').toLowerCase();
  const y = String(b || '').toLowerCase();
  if (!x || !y) return '';
  return [x, y].sort().join('|');
}

/** Initialize empty asked-discriminators set. */
export function initAskedDiscriminators() {
  return new Set();
}

/**
 * Mark discriminator pairs from a card as asked.
 * You should call this after the card is answered (i.e., shown).
 */
export function markDiscriminatorsAsked(prevSet, card) {
  const next = new Set(prevSet || []);
  const pairs = card?.meta?.discriminates;
  if (!Array.isArray(pairs)) return next;

  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const k = pairKey(pair[0], pair[1]);
    if (k) next.add(k);
  }
  return next;
}

/** Check if a discriminator was asked for the current top-2. */
export function hasDiscriminatorAskedFor(askedSet, top1, top2) {
  const k = pairKey(top1, top2);
  if (!k) return false;
  return (askedSet instanceof Set ? askedSet : new Set(askedSet || [])).has(k);
}
