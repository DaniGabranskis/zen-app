# Baseline Macro Contract

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Frozen (stable contract)

## Overview

The Baseline (simplified) layer is the **primary state classification engine** for simplified user flows. It operates on 6 baseline metrics (Valence, Energy, Tension, Clarity, Control, Social) and returns a **macro state** along with quality signals.

## Contract Guarantees

### 1. Always Returns a Macro State

**Guarantee:** `routeStateFromBaseline()` **always** returns a valid `stateKey` (never `null` or `undefined`).

**Macro States (12 total):**
- **Positive/Engaged:** `grounded`, `engaged`, `connected`, `capable`
- **Stress/Overload:** `pressured`, `blocked`, `overloaded`
- **Low Energy/Negative:** `exhausted`, `down`, `averse`, `detached`
- **Uncertainty:** `uncertain` (extreme-only, rare)

**Selection Path:**
- `strict` — Primary eligibility pass (most common)
- `hard` — Rescue pass when strict filters all candidates
- `final_fallback` — Macro-only selection with semantic hard-blocks (rare)
- `last_resort` — Top-1 macro by similarity without eligibility (extremely rare, should be ≈ 0)

### 2. Quality Signals

Every result includes quality indicators:

**`confidenceBand`** (`high` | `medium` | `low`):
- `high`: Strong match, clear signals
- `medium`: Moderate confidence, acceptable match
- `low`: Weak match or low clarity

**`clarityFlag`** (`low` | `medium` | `null`):
- `low`: User signals don't strongly match any state (low clarity)
- `medium`: Moderate clarity
- `null`: High clarity

**`needsRefine`** (boolean):
- `true`: System recommends "Refine (Deep Dive)" CTA
- Trigger: `needsRefine === true` AND (`clarityFlag === 'low'` OR `confidenceBand === 'low'`)
- Cooldown: Always show if `lowConfidenceStreak >= 2`

### 3. Forced Uncertain (Extreme-Only)

**Rule:** `stateKey === 'uncertain'` is **only** allowed for "extreme uncertainty".

**Conditions (ALL must be true):**
- `certaintyRaw <= CERTAINTY_EXTREME_LOW` (≤ 0.35)
- `score1 < SCORE_FLOOR_EXTREME` (< 0.04)
- No strong-signal state matches

**Result:**
- `forcedUncertain === true`
- `uncertainReason === 'extreme_uncertainty'`
- `clarityFlag` is NOT set to `'low'` (extreme uncertainty is a state, not a quality flag)

**Note:** Low clarity alone does **NOT** force uncertain. It becomes `clarityFlag: 'low'` instead.

### 4. Semantic Invariants (Hard Blockers)

**Guarantee:** Certain states **never** appear under invalid conditions:

- **`connected`** NEVER if `F_high || T_high || Vneg`
- **`engaged`** NEVER if `!Vpos || F_high || T_high`
- **`grounded`** NEVER if `T_high || Ag_low`

**Enforcement:**
- Semantic hard-blocks applied in `final_fallback` and `last_resort` paths
- Runtime guard in `baselineEngine.js` (fail-fast)
- Simulation sanity checks (fail-fast)

### 5. Pipeline Coverage

**Guarantee:** Every baseline vector (15,625 combinations) receives a valid `stateKey`.

**Fallback Chain:**
1. **Strict eligibility** → filter ranked states
2. **Hard eligibility** → rescue pass (if strict empty)
3. **Final fallback** → macro-only + semantic hard-blocks (if hard empty)
4. **Last resort** → top-1 macro by similarity (if final fallback empty, extremely rare)

**Expected Distribution:**
- `strict`: ~78% (primary path)
- `hard`: ~22% (rescue path)
- `final_fallback`: ~0% (should be rare or 0)
- `last_resort`: ~0% (should be 0)

## Input Contract

### Baseline Metrics (6 dimensions)

**Range:** 1-7 (discrete, quantized)

- **Valence** (V): -3 to +3 (continuous, no quantization)
- **Energy** (E): 1-7 → maps to Arousal (if ≥ 0.5) or Fatigue (if < 0.5)
- **Tension** (T): 1-7 → discrete levels {0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4}
- **Clarity** (C): 1-7 → maps to Certainty {0, 0.333, 0.667, 1.0, 1.333, 1.667, 2.0}
- **Control** (Ag): 1-7 → maps to Agency {0, 0.333, 0.667, 1.0, 1.333, 1.667, 2.0}
- **Social** (S): 1-7 → maps to Socialness {0, 0.333, 0.667, 1.0, 1.333, 1.667, 2.0}

### Evidence Vector (optional)

- **Weight:** 0.25 (default)
- **Merging:** `merged[k] = baseline[k] + delta[k] * weight`
- **Clamping:** All dimensions clamped to valid ranges

## Output Contract

### Result Object

```typescript
{
  stateKey: string,              // Macro state (always present)
  dominant: string,              // Same as stateKey (canonical)
  secondary: string | null,     // Secondary candidate (if applicable)
  
  // Quality signals
  confidenceBand: 'high' | 'medium' | 'low',
  clarityFlag: 'low' | 'medium' | null,
  needsRefine: boolean,
  matchWarning: string | null,   // e.g., 'weak_match_extreme'
  
  // Selection diagnostics
  selectionPath: 'strict' | 'hard' | 'final_fallback' | 'last_resort',
  selectionDiagnostics: {
    strictCount: number,         // Candidates after strict pass
    hardCount: number,           // Candidates after hard pass
    fallbackUsed: boolean,
    lastResortUsed: boolean,
  },
  
  // Forced uncertain (extreme-only)
  forcedUncertain: boolean,     // true only for extreme_uncertainty
  uncertainReason: string | null, // 'extreme_uncertainty' | 'all_filtered' | null
  
  // Scores
  score1: number,               // Top-1 similarity score
  score2: number,               // Top-2 similarity score
  delta: number,                // score1 - score2
  
  // Vector
  vector: Object,                // Final merged state vector
}
```

## Sanity Checks (Invariants)

### Required (Fail-Fast)

1. **Pipeline Coverage:** `stateKey` always present (never `null`/`undefined`)
2. **Semantic Invariants:** `connected`/`engaged`/`grounded` never violate hard-blocks
3. **Forced Uncertain Invariant:** `stateKey === 'uncertain'` → `forcedUncertain === true`
4. **Selection Path Consistency:** `selectionPath === 'hard'` → `hardCount > 0`

### Expected Thresholds

- **`uncertain_state_rate`** ≤ 12% (hard threshold)
- **`forced_uncertain_rate`** == `uncertain_state_rate` (invariant)
- **`all_filtered` count** == 0 (or extremely rare)
- **`connected invalid violations`** == 0
- **`finalFallbackRate`** ≈ 0% (should be rare or 0)
- **`lastResortRate`** == 0% (should be 0)

## Usage

### Simplified Flow (Baseline-Only)

```javascript
import { routeStateFromBaseline } from './utils/baselineEngine.js';

const result = routeStateFromBaseline(baselineMetrics, {
  evidenceVector: null,      // Simplified: no evidence
  evidenceWeight: 0.25,      // Default weight
});

// Always has stateKey
console.log(result.stateKey);        // e.g., 'grounded'
console.log(result.confidenceBand);  // e.g., 'high'
console.log(result.clarityFlag);     // e.g., null
console.log(result.needsRefine);    // e.g., false
```

### Deep Dive Flow (Baseline + Evidence)

```javascript
const result = routeStateFromBaseline(baselineMetrics, {
  evidenceVector: evidenceVec,  // From L1 cards
  evidenceWeight: 0.35,         // Higher weight for evidence
});

// Same contract: always has stateKey
// Evidence refines the macro state but doesn't break the contract
```

## Breaking Changes Policy

**This contract is FROZEN.** Any changes that break these guarantees require:

1. **Explicit approval** and version bump
2. **Migration guide** for consumers
3. **Updated golden metrics** and sanity checks
4. **Regression tests** to prevent future breaks

## Related Documents

- `BALANCE_BASELINE_GOLDEN.md` — Golden metrics and expected distributions
- `DEEP_DIVE_RECOMMENDATION_RULE.md` — Product rule for "Refine (Deep Dive)" CTA
- `client/src/utils/baselineEngine.js` — Implementation
- `client/scripts/checkSimplifiedBalance.js` — Simulation and sanity checks
