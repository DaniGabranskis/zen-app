// scripts/checkBaselineQuantization.js
// Check discrete values produced by baselineToVector for arousal and fatigue

const path = require('path');

// Import baseline engine (simplified version for Node.js)
function norm7(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 4;
  return Math.max(1, Math.min(7, Math.round(n)));
}

function toUnit7(v) {
  return (norm7(v) - 1) / 6;
}

function baselineToVector(metrics) {
  const m = metrics || {};
  const valence = toUnit7(m.valence);
  const energy = toUnit7(m.energy);
  const tension = toUnit7(m.tension);
  const clarity = toUnit7(m.clarity);
  const control = toUnit7(m.control);
  const social = toUnit7(m.social);

  const vec = {
    valence: (valence - 0.5) * 6,
    arousal: 0,
    tension: tension * 2.4,
    agency: control * 2.0,
    certainty: clarity * 2.0,
    socialness: social * 2.0,
    fatigue: 0,
  };

  // Energy: map to arousal (high) OR fatigue (low)
  if (energy >= 0.5) {
    vec.arousal = (energy - 0.5) * 2 * 2.0;
  } else {
    vec.fatigue = (0.5 - energy) * 2 * 2.2;
  }

  return vec;
}

console.log('=== Baseline Quantization Check ===\n');

// Test all possible energy values (1-7 for 7-point scale, or 1-9 for 9-point scale)
const SCALE = 9; // Check both 7 and 9
console.log(`Testing ${SCALE}-point scale:\n`);

const arousalValues = new Set();
const fatigueValues = new Set();
const agencyValues = new Set();
const socialValues = new Set();
const certaintyValues = new Set();
const tensionValues = new Set();

for (let energy = 1; energy <= SCALE; energy++) {
  const vec = baselineToVector({ energy, valence: 5, tension: 5, clarity: 5, control: 5, social: 5 });
  if (vec.arousal > 0) {
    arousalValues.add(Math.round(vec.arousal * 10000) / 10000);
  }
  if (vec.fatigue > 0) {
    fatigueValues.add(Math.round(vec.fatigue * 10000) / 10000);
  }
}

for (let val = 1; val <= SCALE; val++) {
  const vec = baselineToVector({ energy: 5, valence: 5, tension: val, clarity: 5, control: 5, social: 5 });
  tensionValues.add(Math.round(vec.tension * 10000) / 10000);
}

for (let val = 1; val <= SCALE; val++) {
  const vec = baselineToVector({ energy: 5, valence: 5, tension: 5, clarity: val, control: 5, social: 5 });
  certaintyValues.add(Math.round(vec.certainty * 10000) / 10000);
}

for (let val = 1; val <= SCALE; val++) {
  const vec = baselineToVector({ energy: 5, valence: 5, tension: 5, clarity: 5, control: val, social: 5 });
  agencyValues.add(Math.round(vec.agency * 10000) / 10000);
}

for (let val = 1; val <= SCALE; val++) {
  const vec = baselineToVector({ energy: 5, valence: 5, tension: 5, clarity: 5, control: 5, social: val });
  socialValues.add(Math.round(vec.socialness * 10000) / 10000);
}

console.log('Arousal possible values (sorted):');
console.log(Array.from(arousalValues).sort((a, b) => a - b).map(v => v.toFixed(4)).join(', '));
console.log('\nFatigue possible values (sorted):');
console.log(Array.from(fatigueValues).sort((a, b) => a - b).map(v => v.toFixed(4)).join(', '));
console.log('\nTension possible values (sorted):');
console.log(Array.from(tensionValues).sort((a, b) => a - b).map(v => v.toFixed(4)).join(', '));
console.log('\nAgency possible values (sorted):');
console.log(Array.from(agencyValues).sort((a, b) => a - b).map(v => v.toFixed(4)).join(', '));
console.log('\nCertainty possible values (sorted):');
console.log(Array.from(certaintyValues).sort((a, b) => a - b).map(v => v.toFixed(4)).join(', '));
console.log('\nSocialness possible values (sorted):');
console.log(Array.from(socialValues).sort((a, b) => a - b).map(v => v.toFixed(4)).join(', '));

console.log('\n=== Detailed Energy Mapping ===\n');
for (let energy = 1; energy <= SCALE; energy++) {
  const vec = baselineToVector({ energy, valence: 5, tension: 5, clarity: 5, control: 5, social: 5 });
  const energyUnit = toUnit7(energy);
  console.log(`Energy=${energy} (unit=${energyUnit.toFixed(4)}) → arousal=${vec.arousal.toFixed(4)}, fatigue=${vec.fatigue.toFixed(4)}`);
}
