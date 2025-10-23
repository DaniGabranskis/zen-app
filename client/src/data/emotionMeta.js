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
