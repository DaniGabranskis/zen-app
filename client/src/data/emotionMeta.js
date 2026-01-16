// src/data/emotionMeta.js
// Comments in English only.
/**
 * Minimal taxonomy for emotions used by probes.
 * valence: -1 (negative) .. +1 (positive)
 * arousal: 0 (low) .. 1 (high)
 * control: 0 (external) .. 1 (internal)
 */
export const EMOTION_META = {
  joy:          { valence: +1.0, arousal: 0.8, control: 0.9, label: 'Joy' },
  calm:         { valence: +0.8, arousal: 0.2, control: 0.9, label: 'Calm' },
  gratitude:    { valence: +0.9, arousal: 0.4, control: 0.7, label: 'Gratitude' },
  interest:     { valence: +0.6, arousal: 0.7, control: 0.8, label: 'Interest / Curiosity' },
  confidence:   { valence: +0.9, arousal: 0.6, control: 1.0, label: 'Confidence' },
  connection:   { valence: +0.8, arousal: 0.4, control: 0.8, label: 'Connection / Affection' },

  anxiety:      { valence: -0.9, arousal: 0.9, control: 0.2, label: 'Anxiety' },
  fear:         { valence: -1.0, arousal: 0.95, control: 0.1, label: 'Fear' },
  anger:        { valence: -0.9, arousal: 0.9, control: 0.8, label: 'Anger' },
  frustration:  { valence: -0.8, arousal: 0.8, control: 0.6, label: 'Frustration' },
  sadness:      { valence: -1.0, arousal: 0.3, control: 0.2, label: 'Sadness' },
  shame:        { valence: -1.0, arousal: 0.5, control: 0.1, label: 'Shame' },
  guilt:        { valence: -1.0, arousal: 0.6, control: 0.2, label: 'Guilt' },
  disgust:      { valence: -0.9, arousal: 0.5, control: 0.4, label: 'Disgust' },
  overload:     { valence: -0.8, arousal: 0.9, control: 0.2, label: 'Overload' },
  fatigue:      { valence: -0.8, arousal: 0.1, control: 0.2, label: 'Fatigue / Exhaustion' },
  tension:      { valence: -0.6, arousal: 0.8, control: 0.5, label: 'Tension' },
  numbness:     { valence: -0.7, arousal: 0.1, control: 0.1, label: 'Numbness / Emptiness' },
  disconnected: { valence: -0.7, arousal: 0.2, control: 0.1, label: 'Disconnected / Detached' },
  confusion:    { valence: -0.5, arousal: 0.5, control: 0.3, label: 'Confusion' },
  clarity:      { valence: +0.6, arousal: 0.3, control: 0.9, label: 'Clarity' },
  mixed:        { valence: 0.0, arousal: 0.5, control: 0.5, label: 'Mixed / Unclear' },
};

/**
 * Return 'positive' | 'negative' | 'neutral' based on EMOTION_META.valence.
 * If valence is not available, returns null (caller may use a fallback).
 */
export function getPolarityFromMeta(key) {
  const k = String(key || '').toLowerCase();
  const v = EMOTION_META[k]?.valence;
  if (typeof v !== 'number') return null;
  if (v > 0.15) return 'positive';
  if (v < -0.15) return 'negative';
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
