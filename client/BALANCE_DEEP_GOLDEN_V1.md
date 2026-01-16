# Deep Golden Metrics V1

**Generated:** 2026-01-13T21:31:54.639Z
**Total paths:** 235298 (117649 baselines × 2 modes)

## Micro Coverage

- **Total micro states in taxonomy:** 33
- **Reachable micro states:** 33
- **Unreachable micro states:** 0
✅ All micro states are reachable

## Micro Distribution (by macro)

### down
- down.discouraged: 13304 (5.65%)
- down.sad_heavy: 5716 (2.43%)
- down.lonely_low: 4022 (1.71%)

### exhausted
- exhausted.drained: 63851 (27.14%)
- exhausted.sleepy_fog: 7964 (3.38%)
- exhausted.burnout: 1160 (0.49%)

### overloaded
- overloaded.cognitive: 1395 (0.59%)
- overloaded.too_many_tasks: 181 (0.08%)
- overloaded.overstimulated: 29 (0.01%)

### detached
- detached.numb: 17533 (7.45%)
- detached.disconnected: 8894 (3.78%)
- detached.autopilot: 416 (0.18%)

### averse
- averse.irritated: 21750 (9.24%)
- averse.angry: 2760 (1.17%)
- averse.disgust_avoid: 386 (0.16%)

### blocked
- blocked.stuck: 11727 (4.98%)
- blocked.avoidant: 1482 (0.63%)
- blocked.frozen: 216 (0.09%)

### pressured
- pressured.rushed: 16197 (6.88%)
- pressured.performance: 1992 (0.85%)
- pressured.tense_functional: 269 (0.11%)

### connected
- connected.warm: 17240 (7.33%)
- connected.social_flow: 2113 (0.90%)
- connected.seen: 324 (0.14%)

### capable
- capable.deciding: 8297 (3.53%)
- capable.executing: 1016 (0.43%)
- capable.structured: 155 (0.07%)

### grounded
- grounded.steady: 4511 (1.92%)
- grounded.recovered: 4375 (1.86%)
- grounded.present: 653 (0.28%)

### engaged
- engaged.focused: 6400 (2.72%)
- engaged.inspired: 2868 (1.22%)
- engaged.curious: 1141 (0.48%)

## Macro Flip

- **Macro flip rate:** 0.00% (0 cases)
- **Flip reasons:**
  - (none)
- **Top flip paths:**
  - (none)

## Quality Improvement

### Confidence Distribution

- **Before:** High=88674, Medium=15638, Low=13337
- **After:** High=68271, Medium=32420, Low=16958
- **Improvement:** -17.34%

### Clarity Distribution

- **Before:** Low=136, Medium=50, Null=117463
- **After:** Low=136, Medium=50, Null=117463
- **Improvement:** 0.00%

## Micro Null Rate

- **Micro null rate:** 2.11% (4961 cases)

## Semantic Violations

- **Connected invalid violations:** 0
✅ No semantic violations

## Sanity Checks

✅ Macro flip rate: 0.00% (threshold: ≤10%)
✅ Semantic violations: 0 (threshold: 0)
✅ Micro coverage: 33/33 (all reachable)
✅ Micro null rate: 2.11% (threshold: ≤20%)

## Notes

- Simulation runs in two modes: cluster-aligned (optimistic) and noisy-mixed (realistic)
- Cluster-aligned mode: L1 responses align with baseline macro cluster
- Noisy-mixed mode: 30% of L1 responses contain conflicting tags, 20% uncertainty signals
