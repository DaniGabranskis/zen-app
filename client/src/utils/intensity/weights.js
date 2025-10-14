// Static weight maps for intensity estimation.
// Keep values small and human-tunable.

export const TAG_WEIGHTS = {
  // high-anxiety/tension
  mind_racing: 1.0,
  panic: 1.0,
  vigilant: 0.9,
  'tension?': 0.85,
  body_tension: 0.8,

  // fatigue/low-energy
  'tiredness?': 0.65,
  body_heavy: 0.6,
  energy_low: 0.6,

  // uncertainty/pressure
  'overwhelm?': 0.75,
  pressure: 0.7,
  low_control: 0.7,
  uncertainty_mid: 0.55,

  // protective/positive (reduce intensity)
  'gratitude?': -0.3,
  support: -0.2,
  work_ok: -0.15,
  social_neutral: -0.1,
  energy_steady: -0.1,

  // guilt/threat
  guilt: 0.6,
};

export const BM_WEIGHTS = {
  'Heart racing': 1.0,
  'Shaky/trembling': 0.9,
  Hypervigilant: 0.9,
  'Hard to concentrate': 0.7,
  'Brain fog': 0.6,
  Restless: 0.6,
  'Tight chest': 0.75,
  'Jaw clenching': 0.7,
  'Neck/shoulder tightness': 0.65,
  'Cold hands/feet': 0.55,
  'Sweaty palms': 0.55,
  'Dry mouth': 0.5,
  'Shallow breathing': 0.65,
  'Holding breath': 0.55,
  'Sighing often': 0.45,
  'Stomach knots': 0.7,
  Nausea: 0.65,
  'Butterflies in stomach': 0.55,
  'Low energy': 0.6,
  'Heavy limbs': 0.6,
  'Slumped posture': 0.5,
  'Racing thoughts': 0.8,
  'Spaced out': 0.55,
};

export const TRIG_WEIGHTS = {
  // hard
  'Financial worries': 0.9,
  'Health concerns': 0.85,
  'Relationship stress': 0.8,
  'Relationship problems': 0.8,

  // mid
  Deadlines: 0.65,
  Overcommitment: 0.6,
  Work: 0.55,
  'Unmet expectations': 0.6,
  'Lack of control': 0.6,
  'Self-criticism': 0.65,
  'Family issues': 0.65,

  // light
  'Changes in routine': 0.45,
  'Environmental noise': 0.35,
  'Negative news': 0.45,
  Perfectionism: 0.55,
  'Too many responsibilities': 0.6,
  'Time pressure': 0.6,
  'Information overload': 0.55,
  Isolation: 0.55,
  'Sleep deprivation': 0.6,
  Uncertainty: 0.5,
  Conflict: 0.6,
  Fatigue: 0.55,
  'Feeling misunderstood': 0.55,
  'Physical pain': 0.6,
  'Social pressure': 0.55,
};
