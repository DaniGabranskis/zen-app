// scripts/checkProbeStats.js

// Adjust import path if your folder structure is a bit different
import { routeEmotionFromCards } from '../src/utils/evidenceEngine.js';

// This should be the full list of canonical tags that can appear from L1+L2.
// You can extend it or even import from a central place if you have it.
const ALL_TAGS = [
  'L1_MOOD_NEG',
  'L1_BODY_TENSION',
  'L1_ENERGY_LOW',
  'L1_ENERGY_HIGH',
  'L1_SOCIAL_THREAT',
  'L1_SOCIAL_SUPPORT',
  'L1_CONTROL_HIGH',
  'L1_CONTROL_LOW',
  'L1_SAFETY_LOW',
  'L1_SAFETY_HIGH',
  'L1_WORTH_LOW',
  'L1_WORTH_HIGH',
  'L1_EXPECT_OK',
  'L1_PRESSURE_LOW',
  'L1_CLARITY_LOW',
  'L2_FOCUS_FUTURE',
  'L2_SOURCE_PEOPLE',
  'L2_UNCERT_HIGH',
  'L2_FEAR_SPIKE',
  'L2_SOCIAL_PAIN_NO',
  'L2_SAD_HEAVY',
  'L2_GUILT',
  'L2_POS_GRATITUDE',
  'L2_CONTENT_WARM',
  'L2_REGULATION_BAD',
  'L2_CLARITY_LOW',
  'L2_MEANING_HIGH',
];

// Helper: pick a random subset of tags
function randomEvidence() {
  const tags = [];
  for (const tag of ALL_TAGS) {
    // 0.0–1.0; probability ~30% to include each tag
    if (Math.random() < 0.3) {
      tags.push(tag);
    }
  }
  // Ensure we never return an empty set
  if (tags.length === 0) {
    tags.push(ALL_TAGS[Math.floor(Math.random() * ALL_TAGS.length)]);
  }
  return tags;
}

// Helper: basic stats
function stats(arr) {
  const n = arr.length;
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const avg = arr.reduce((sum, x) => sum + x, 0) / n;
  return { n, min, max, avg };
}

async function main() {
  const NUM_RUNS = 1000;

  const p1List = [];
  const p2List = [];
  const deltaList = [];

  for (let i = 0; i < NUM_RUNS; i++) {
    const evidenceTags = randomEvidence();
    const result = routeEmotionFromCards(evidenceTags);

    const p1 = result.p1;
    const p2 = result.p2;
    const delta = p1 - p2;

    p1List.push(p1);
    p2List.push(p2);
    deltaList.push(delta);
  }

  console.log('=== Probe routing stats over', NUM_RUNS, 'runs ===');
  console.log('p1:', stats(p1List));
  console.log('p2:', stats(p2List));
  console.log('delta (p1 - p2):', stats(deltaList));
}

main().catch((err) => {
  console.error('Error in checkProbeStats:', err);
  process.exit(1);
});
