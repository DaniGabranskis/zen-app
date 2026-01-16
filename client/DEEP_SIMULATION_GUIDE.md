# Deep Simulation Guide (AE5)

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Design document (implementation pending)

## Overview

Deep simulation validates deep dive engine behavior across all baseline combinations, similar to baseline simulation but for deep flows.

## Simulation Structure

### Input Generation

1. **Baseline vectors:** Same as baseline simulation (15,625 combinations)
2. **L1 responses:** Generate synthetic L1 card responses based on:
   - Baseline macro cluster (stress, low energy, positive)
   - Random selection of 2-3 L1 cards from cluster
   - Response options (including "Not sure / both" with probability)

### Simulation Flow

```
For each baseline vector:
  1. Run baseline engine → get baselineMacro
  2. Generate synthetic L1 responses (2-3 cards)
  3. Run deep engine → get deepResult
  4. Collect metrics:
     - microKey (or null)
     - macroFlipApplied
     - confidenceBand (baseline vs deep)
     - clarityFlag (baseline vs deep)
```

## Metrics to Collect

### Micro Coverage

- **Micro reachability:** Count how many micro states are reachable
- **Micro distribution:** Distribution of micro states within each macro
- **Micro null rate:** Percentage of cases where `microKey === null`

### Macro Flip

- **Macro flip rate:** Percentage of cases where `macroFlipApplied === true`
- **Macro flip reasons:** Distribution of `macroFlipReason`
- **Macro flip paths:** Which macro → macro transitions occur

### Quality Improvement

- **Confidence improvement:** How often deep increases confidence vs baseline
- **Clarity improvement:** How often deep removes `clarityFlag: 'low'`
- **NeedsRefine reduction:** How often deep reduces `needsRefine`

### Semantic Correctness

- **Micro belongs to macro:** All micro states belong to their macro
- **Connected invariant:** `connected` never with `F_high || T_high || Vneg` (even after flip)
- **Hard blockers respected:** All semantic invariants maintained

## Sanity Checks

### Required (Fail-Fast)

1. **Micro belongs to macro:** `microKey` always starts with `macroKey.`
2. **Macro flip reason present:** If `macroFlipApplied === true`, then `macroFlipReason !== null`
3. **Semantic invariants:** Hard blockers respected even after macro flip
4. **Macro always present:** `macroKey` never `null` or `undefined`

### Expected Thresholds

- **Macro flip rate:** < 10% (if > 10%, red flag)
- **Micro null rate:** < 20% (most deep dives should return micro)
- **Micro coverage:** All micro states reachable (or explicitly documented as unreachable)
- **Confidence improvement:** > 30% of cases show confidence improvement
- **Clarity improvement:** > 20% of cases show clarity improvement

## Report Format

Similar to `BALANCE_BASELINE_GOLDEN_V2.md`, but for deep:

```
# Deep Golden Metrics

## Micro Coverage
- Total micro states: 33
- Reachable micro states: TBD
- Unreachable micro states: TBD (with explanation)

## Micro Distribution (by macro)
- pressured: rushed (X%), performance (Y%), tense_functional (Z%)
- blocked: stuck (X%), avoidant (Y%), frozen (Z%)
- ...

## Macro Flip
- Macro flip rate: X%
- Flip reasons: strong_evidence (X%), cluster_conflict (Y%), ...
- Flip paths: pressured → blocked (X%), pressured → overloaded (Y%), ...

## Quality Improvement
- Confidence improvement: X% of cases
- Clarity improvement: Y% of cases
- NeedsRefine reduction: Z% of cases

## Sanity Checks
- ✅ Micro belongs to macro: 100%
- ✅ Macro flip reason present: 100%
- ✅ Semantic invariants: 0 violations
- ✅ Macro always present: 100%
```

## Implementation Notes

1. **Synthetic L1 responses:**
   - Generate based on baseline macro cluster
   - Include "Not sure / both" with probability (e.g., 10%)
   - Ensure coverage of all micro states

2. **Performance:**
   - Deep simulation is slower than baseline (requires L1 response generation)
   - Consider sampling if full simulation is too slow

3. **Comparison with baseline:**
   - Always compare deep results with baseline results
   - Track improvements and regressions

## Related Documents

- `DEEP_ROUTING_CONTRACT.md` — Deep routing contract
- `BALANCE_BASELINE_GOLDEN_V2.md` — Baseline golden metrics
- `client/scripts/checkSimplifiedBalance.js` — Baseline simulation script
