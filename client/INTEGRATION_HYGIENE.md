# Integration Hygiene (AI)

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Enforced (prevent regressions)

## Overview

This document enforces integration hygiene to prevent the "duplicate engine logic" problem that occurred with baseline simulation.

## Rules

### 1. No Local Copies of Engine Logic

**Rule:** Scripts must **never** contain local copies of:
- `routeStateFromBaseline`
- `routeStateFromDeep`
- `rankStates`
- `selectMicro`
- `shouldFlipMacro`
- `accumulateEvidence`
- `shouldReturnUncertainBaseline`
- `levelizeStateVec`
- `getEligibility`
- Any other core classification logic

**Enforcement:**
- Scripts must use dynamic imports or `createRequire` to load canonical modules
- Example: `checkSimplifiedBalance.js` uses `routeStateFromBaselineCanonical` from `baselineEngine.js`
- Example: `checkDeepBalance.js` uses `routeStateFromDeepCanonical` from `deepEngine.js`

**Acceptance:** Any script that contains local copies of engine logic will fail code review.

### 2. Single Source of Truth

**Rule:** All classification logic lives in:
- `client/src/utils/baselineEngine.js` — Baseline routing
- `client/src/utils/deepEngine.js` — Deep routing
- `client/src/utils/stateSpace.js` — State ranking
- `client/src/utils/microSelector.js` — Micro selection
- `client/src/utils/macroFlip.js` — Macro flip logic
- `client/src/utils/evidenceAccumulator.js` — Evidence accumulation

**Scripts are "thin":**
- Generate test data
- Call canonical functions
- Aggregate metrics
- **Never** reimplement logic

### 3. Unified Path Structure

**Rule:** All paths use `client/src/...` structure (not `src/...`).

**Enforcement:**
- Imports: `import { ... } from '../src/utils/baselineEngine.js'`
- Scripts: Located in `client/scripts/`
- Data: Located in `client/src/data/`

**Acceptance:** No paths like `src/utils/...` or `./utils/...` (relative to wrong root).

### 4. Canonical Result Format

**Rule:** All engines return compatible result formats.

**Baseline result:**
```typescript
{
  stateKey: string,
  confidenceBand: 'high' | 'medium' | 'low',
  clarityFlag: 'low' | 'medium' | null,
  needsRefine: boolean,
  // ... other fields
}
```

**Deep result (extends baseline):**
```typescript
{
  stateKey: string,        // Same as macroKey (for L5 compatibility)
  macroKey: string,
  microKey: string | null,
  macroFlipApplied: boolean,
  macroFlipReason: string | null,
  // ... baseline fields
}
```

**Acceptance:** L5 can read both formats without special handling.

### 5. Runtime Validation

**Rule:** Scripts validate that canonical imports are loaded.

**Example:**
```javascript
if (!routeStateFromBaselineCanonical) {
  throw new Error('routeStateFromBaselineCanonical not initialized. Ensure main() is async and imports baselineEngine.');
}
```

**Acceptance:** Scripts fail fast if imports are missing.

## File Structure

```
client/
├── src/
│   ├── utils/
│   │   ├── baselineEngine.js      ← Canonical baseline engine
│   │   ├── deepEngine.js          ← Canonical deep engine
│   │   ├── stateSpace.js          ← Canonical state ranking
│   │   ├── microSelector.js       ← Canonical micro selection
│   │   ├── macroFlip.js           ← Canonical macro flip
│   │   └── evidenceAccumulator.js ← Canonical evidence accumulation
│   ├── data/
│   │   ├── microTaxonomy.js       ← Micro taxonomy data
│   │   └── tagAliasMap.js         ← Tag normalization data
│   └── screens/
│       ├── DiagnosticFlowScreen.js ← Uses deepEngine
│       └── L5SummaryScreen.js      ← Reads decision object
├── scripts/
│   ├── checkSimplifiedBalance.js  ← Baseline simulation (uses canonical imports)
│   ├── checkDeepBalance.js        ← Deep simulation (uses canonical imports)
│   └── deepSpotChecks.js          ← Spot checks (uses canonical imports)
└── *.md                            ← Documentation
```

## Checklist for New Scripts

Before creating a new simulation/validation script:

- [ ] Script uses dynamic imports or `createRequire` for ES modules
- [ ] Script imports canonical functions (no local copies)
- [ ] Script validates imports are loaded before use
- [ ] Script uses `client/src/...` paths (not `src/...`)
- [ ] Script is located in `client/scripts/`
- [ ] Script documents which canonical functions it uses

## Related Documents

- `BASELINE_MACRO_CONTRACT.md` — Baseline contract
- `DEEP_ROUTING_CONTRACT.md` — Deep routing contract
- `client/scripts/checkSimplifiedBalance.js` — Example of correct integration
