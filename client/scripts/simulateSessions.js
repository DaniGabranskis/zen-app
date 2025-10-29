// Dev-only simulator for routing/emotions balance
import { classifyTags } from '../utils/evidenceEngine';
import { canonicalizeTags } from '../utils/canonicalizeTags';

/**
 * Generate random set of tags similar to L1/L2 outputs.
 * You can tune sources below to emulate real distributions.
 */
function randomTagSet() {
  const buckets = [
    ['mood_negative','anxiety?','tension?','overwhelm?','tiredness?','disconnection?'],
    ['mind_fast','mind_slow','clarity?'],
    ['work_ok','work_over','uncertainty_low','uncertainty_high'],
    ['support','self_ok','contentment?','gratitude?'],
    ['safe','threat?','low_control'],
  ];
  const res = [];
  for (const b of buckets) {
    // 60% chance to pick 1 tag from bucket
    if (Math.random() < 0.6) {
      res.push(b[Math.floor(Math.random() * b.length)]);
    }
  }
  return canonicalizeTags(res);
}

export function runSimulation(n = 200) {
  const tally = {};
  const modes = { single: 0, mix: 0, probe: 0 };
  for (let i = 0; i < n; i++) {
    const tags = randomTagSet();
    const decision = classifyTags(tags);
    modes[decision.mode] = (modes[decision.mode] || 0) + 1;
    const dom = decision?.top?.[0];
    if (dom) tally[dom] = (tally[dom] || 0) + 1;
  }
  const summary = {
    total: n,
    modes,
    emotions: Object.fromEntries(Object.entries(tally).sort((a,b)=>b[1]-a[1])),
  };
  // JSON
  console.log('[SIM_JSON]', JSON.stringify(summary));
  // Human
  console.log(`[SIM] total=${n} | single=${modes.single} mix=${modes.mix} probe=${modes.probe}`);
  for (const [emo, cnt] of Object.entries(summary.emotions)) {
    console.log(`[SIM] ${emo.padEnd(12,' ')} → ${cnt}`);
  }
  return summary;
}
