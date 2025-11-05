// src/data/emotionMeta.js
// Comments in English only.
/**
 * Minimal taxonomy for emotions used by probes.
 * valence: -1 (negative) .. +1 (positive)
 * arousal: 0 (low) .. 1 (high)
 * control: 0 (external) .. 1 (internal)
 */
export const EMOTION_META = {
  anger:        { valence: -1, arousal: 0.9, control: 0.7, label: 'Anger' },
  anxiety:      { valence: -1, arousal: 0.85, control: 0.3, label: 'Anxiety' },
  frustration:  { valence: -1, arousal: 0.7, control: 0.5, label: 'Frustration' },
  sadness:      { valence: -1, arousal: 0.2, control: 0.4, label: 'Sadness' },
  confusion:    { valence: -0.4, arousal: 0.5, control: 0.3, label: 'Confusion' },
  overload:     { valence: -0.7, arousal: 0.8, control: 0.2, label: 'Overload' },
  joy:          { valence: +0.9, arousal: 0.7, control: 0.8, label: 'Joy' },
  calm:         { valence: +0.7, arousal: 0.2, control: 0.9, label: 'Calm' },
  gratitude:    { valence: +0.8, arousal: 0.4, control: 0.7, label: 'Gratitude' },
  clarity:      { valence: +0.6, arousal: 0.3, control: 0.8, label: 'Clarity' },
};

// Thresholds to convert continuous valence to a discrete polarity.
const POSITIVE_THRESHOLD = 0.15;
const NEGATIVE_THRESHOLD = -0.15;

/**
 * Return 'positive' | 'negative' | 'neutral' based on EMOTION_META.valence.
 * If valence is not available, returns null (caller may use a fallback).
 */
export function getPolarityFromMeta(key) {
  const k = String(key || '').toLowerCase();
  const v = EMOTION_META[k]?.valence;
  if (typeof v !== 'number') return null;
  if (v > POSITIVE_THRESHOLD) return 'positive';
  if (v < NEGATIVE_THRESHOLD) return 'negative';
  return 'neutral';
}

/**
 * Fallback polarity map for emotions absent in EMOTION_META.
 * Keep it minimal and easily replaceable by data-driven polarity later.
 */
export const POLARITY_FALLBACK = {
  // negative-ish
  tension: 'negative',
  fear: 'negative',
  irritation: 'negative',
  disappointment: 'negative',
  loneliness: 'negative',
  disconnection: 'negative',
  overwhelm: 'negative',   // a.k.a. "overload" in some places
  tiredness: 'negative',
  guilt: 'negative',
  shame: 'negative',
  // positive-ish
  contentment: 'positive',
};
