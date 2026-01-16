# Macro Flip Policy (AL1)

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Approved (policy definition)

## Overview

This document defines the expected macro flip rate and policy for deep dive state classification.

## Policy Options

### Option 1: Conservative (Current Default)

**Expected flip rate:** ≤1%

**Philosophy:**
- Deep dive primarily refines micro states within baseline macro
- Macro flip is extremely rare, only for "impossible" semantic conflicts
- Baseline macro is treated as strong prior

**When flip is allowed:**
- Baseline macro is semantically incompatible with strong evidence
- Evidence weight > 0.7 AND baseline confidence is low
- Alternative macro is in neighboring cluster
- All semantic blockers are respected

**Acceptance criteria:**
- Macro flip rate ≤ 1% in simulation
- Flip only occurs when baseline macro is clearly wrong
- No semantic violations after flip

### Option 2: Moderate (Alternative)

**Expected flip rate:** 1–5%

**Philosophy:**
- Deep dive can correct baseline when evidence strongly contradicts
- Macro flip is rare but real, not just theoretical
- Baseline macro is treated as prior, but evidence can override

**When flip is allowed:**
- Evidence weight > 0.5 AND baseline confidence is not high
- Alternative macro score > baseline macro score + 0.1
- Alternative macro is in neighboring cluster
- All semantic blockers are respected

**Acceptance criteria:**
- Macro flip rate 1–5% in simulation
- Flip occurs on strong evidence contradictions
- No semantic violations after flip

## Current Status

**Selected policy:** Conservative (Option 1)

**Current flip rate:** 0.00% (from `BALANCE_DEEP_GOLDEN_V1.md`)

**Reason:**
- Macro flip logic is implemented but conditions are very strict
- This aligns with conservative policy (flip almost never)
- If flip rate needs to increase, use Option 2 with targeted adjustments

## Implementation Notes

Macro flip is controlled by:
1. `shouldFlipMacro()` in `client/src/utils/macroFlip.js`
2. Evidence weight threshold (currently 0.5)
3. Score difference threshold (currently 0.1)
4. Cluster neighbor check
5. Semantic compatibility check

To adjust flip rate:
- Lower evidence weight threshold (e.g., 0.5 → 0.3) for more flips
- Lower score difference threshold (e.g., 0.1 → 0.05) for more flips
- Relax cluster neighbor check (allow cross-cluster flips) for more flips
- **Never** relax semantic blockers (connected, engaged, grounded rules)

## Related Documents

- `DEEP_ROUTING_CONTRACT.md` — Deep routing contract
- `BALANCE_DEEP_GOLDEN_V1.md` — Current golden metrics
- `client/src/utils/macroFlip.js` — Flip implementation
