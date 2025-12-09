// intensity/weights.js
// Weights for all L1 + L2 tags from the probe model.
// Positive values push intensity up, negative values lower it.

export const TAG_WEIGHTS = {
  // ----- L1: core axes -----
  // Mood now
  L1_MOOD_NEG: 2.0,
  L1_MOOD_POS: -1.0,

  // Body state
  L1_BODY_TENSION: 1.4,
  L1_BODY_RELAXED: -0.4,

  // Energy level
  L1_ENERGY_LOW: 0.8,
  L1_ENERGY_HIGH: 0.4, // high energy can still feel "intense"

  // Social connection
  L1_SOCIAL_THREAT: 2.0,
  L1_SOCIAL_SUPPORT: -0.6,

  // Sense of control
  L1_CONTROL_LOW: 2.0,
  L1_CONTROL_HIGH: -0.6,

  // Sense of safety
  L1_SAFETY_LOW: 2.2,
  L1_SAFETY_HIGH: -0.8,

  // Self-worth now
  L1_WORTH_LOW: 2.0,
  L1_WORTH_HIGH: -0.8,

  // Expectations
  L1_EXPECT_LOW: 1.0,
  L1_EXPECT_OK: -0.3,

  // Time pressure
  L1_PRESSURE_HIGH: 1.2,
  L1_PRESSURE_LOW: -0.3,

  // Clarity of mind
  L1_CLARITY_LOW: 0.7,
  L1_CLARITY_HIGH: -0.3,

  // ----- L2: context / amplifiers -----
  // Focus
  L2_FOCUS_FUTURE: 0.7, // future worries
  L2_FOCUS_PAST: 0.5,   // rumination about past

  // Source of tension
  L2_SOURCE_PEOPLE: 1.0,
  L2_SOURCE_TASKS: 0.8,

  // Uncertainty
  L2_UNCERT_LOW: -0.2,
  L2_UNCERT_HIGH: 1.2,
  L2_FEAR_SPIKE: 1.5,

  // Social pain
  L2_SOCIAL_PAIN_YES: 1.8,
  L2_LET_DOWN: 0.8,
  L2_SOCIAL_PAIN_NO: -0.3,

  // Shutdown / numb / sad heavy
  L2_SHUTDOWN: 1.4,
  L2_DISCONNECT_NUMB: 1.3,
  L2_SAD_HEAVY: 1.1,

  // Guilt / shame
  L2_GUILT: 1.0,
  L2_SHAME: 1.5,

  // Positive moments
  L2_POS_GRATITUDE: -0.7,
  L2_CONTENT_WARM: -0.5,
  L2_NO_POSITIVE: 1.0,

  // Regulation
  L2_REGULATION_GOOD: -0.7,
  L2_REGULATION_BAD: 1.2,

  // Clarity (second layer)
  L2_CLARITY_HIGH: -0.4,
  L2_CLARITY_LOW: 0.7,

  // Meaning
  L2_MEANING_LOW: 1.2,
  L2_MEANING_HIGH: -0.6,
};

// Kept for backward compatibility; not used by the new estimator.
export const BM_WEIGHTS = {};
export const TRIG_WEIGHTS = {};
