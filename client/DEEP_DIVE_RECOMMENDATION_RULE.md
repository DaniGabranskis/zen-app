# Deep Dive Recommendation Rule (EPIC Q — Q3)

**Date**: 2024-12-XX  
**Status**: ✅ Implemented

## Product Rule

### Primary Trigger

Show "Deep Dive" CTA when **ALL** of the following are true:

1. `needsRefine === true` **AND**
2. (`clarityFlag === 'low'` **OR** `confidenceBand === 'low'`)

### Cooldown Logic

To prevent aggressive CTA display:

1. **Always show** if user has **2 consecutive sessions** with low confidence (`confidenceBand === 'low'` or `needsRefine === true`)
2. **Otherwise**, show based on primary trigger (respects cooldown)

### Additional Triggers (Always Show)

These cases always show the Deep Dive CTA (no cooldown):

- `stateKey === 'uncertain'` (extreme uncertainty)
- `confidenceBand === 'medium'` **AND** `clarityFlag === 'low'` (medium confidence but low clarity)

## Implementation

**File**: `client/src/screens/L5SummaryScreen.js`

**Logic**:
```javascript
const shouldShowDeepDiveCTA = !fromHistory && (
  needsRefine === true && (clarityFlag === 'low' || confidenceBand === 'low') ||
  consecutiveLowConfidence ||
  stateKey === 'uncertain' ||
  (confidenceBand === 'medium' && clarityFlag === 'low')
);
```

## Metrics

Based on golden metrics (BALANCE_BASELINE_GOLDEN.md):

- `needs_refine_rate`: 4.79% (748 cases)
- `low_confidence_rate`: 4.79% (748 cases)
- `low_clarity_rate`: 0.00% (tracked separately, not in state counts)

## Future Enhancements

1. **"Dismiss for today"** option: Allow users to dismiss CTA once per day
2. **Session-based cooldown**: Track if user dismissed CTA in last N sessions
3. **Contextual triggers**: Show CTA more aggressively for specific states (e.g., `overloaded`, `blocked`)

## Acceptance Criteria

- ✅ CTA appears when `needsRefine === true` AND (`clarityFlag === 'low'` OR `confidenceBand === 'low'`)
- ✅ CTA always appears after 2 consecutive low confidence sessions
- ✅ CTA appears for `uncertain` state
- ✅ CTA appears for `medium` confidence + `low` clarity
- ✅ CTA does not appear for `high` confidence cases
- ✅ CTA respects cooldown (except for consecutive low confidence)
