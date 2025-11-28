import { zeroVector, accumulate, rankEmotions } from "./emotionSpace";
import { emotionCategoryMap } from "./emotionProbe";
import { nextProbeAdaptive } from "./probeRouting";

// Minimal in-memory state. You can move to Zustand if needed.
export class ProbeEngine {
  constructor({ maxSteps = 3, confidence = 0.72 } = {}) {
    this.state = zeroVector();
    this.step = 0;
    this.maxSteps = maxSteps;
    this.confidence = confidence;
    this.history = []; // { step, label, tags }
    this.usedLabels = new Set(); // track labels to avoid repeats across probes
  }

  _penaltyFor(emotionKey) {
    const v = this.state || {};
    const hiTension = (v.tension ?? 0) >= 3;
    const hiArousal = (v.arousal ?? 0) >= 4;
    const blame = (v.self_blame ?? 0) + (v.other_blame ?? 0);
    const hiBlame = blame >= 2;

    // Penalize only highly aroused positives when tension/blame is high
    const isHighArousalPositive = (emotionKey === 'joy');
    if (isHighArousalPositive && (hiTension || hiBlame) && hiArousal) {
      return 0.05; // subtract 0.05 from score (gentle nudge, not a hard rule)
    }
    return 0;
  }

    // Ranking wrapper that applies the sanity penalty to the base ranking
  _rankWithSanity() {
    const base = rankEmotions(this.state) || [];
    const adjusted = base.map(it => ({
      ...it,
      score: Math.max(0, (it.score ?? 0) - this._penaltyFor(it.key)),
    }));
    // Ensure ordering after adjustment
    adjusted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return adjusted;
  }

  get snapshot() {
    const ranking = this._rankWithSanity();
    return {
      step: this.step,
      vector: this.state,
      ranking,
      top: ranking[0],
      confidence: ranking[0]?.score ?? 0,
    };
  }

  apply(tags, label) {
    console.log("[ProbeEngine] apply ->", { tags, label });

    // Allow both a single vector and an array of vectors
    if (Array.isArray(tags)) {
      this.state = tags.reduce(
        (state, t) => accumulate(state, t),
        this.state
      );
    } else {
      this.state = accumulate(this.state, tags);
    }

    if (label) this.usedLabels.add(label);
    this.history.push({ step: this.step, label, tags });
    this.step += 1;
    return this.snapshot;
  }
  
  shouldStop() {
    const { confidence, step } = this.snapshot;
    const stop = confidence >= this.confidence || step >= this.maxSteps;
    console.log("[ProbeEngine] shouldStop?", { confidence, step, stop });
    return stop;
  }

nextProbeType(prevType) {
    const snap = this.snapshot;
    const topKey = snap?.top?.key;
    const conf   = snap?.confidence ?? 0;
    const next = nextProbeAdaptive(prevType, topKey, conf, this.confidence);
    console.log("[ProbeEngine] nextProbeType(adaptive)", { prevType, topKey, conf, pick: next });
    return next;
  }

  // Expose exclude list so UI probes can avoid repeating already used labels
  getExcludeLabels() {
    return Array.from(this.usedLabels);
  }

}
