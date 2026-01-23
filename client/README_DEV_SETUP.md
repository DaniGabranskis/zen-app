# Development Setup & Architecture Notes

## L1 Cards: Purpose and Design Philosophy

### Baseline vs L1: Different Roles

**Baseline (BaselineCheckInScreen):**
- **Purpose:** "Срез по шкалам" — quick measurement of 6 core dimensions
- **What it captures:** Current state on scales (valence, energy, tension, clarity, control, social)
- **When:** First step in the flow, before any contextual questions
- **Output:** 6 numeric values (1-9 scale) that determine `macroBase` (initial macro state classification)

**L1 Cards (DiagnosticFlowScreen):**
- **Purpose:** "Причинные/контекстные признаки" — causal and contextual signals
- **What it captures:** Why the user feels this way, what's happening in their life, contextual triggers
- **When:** After baseline, to refine and contextualize the initial classification
- **Output:** Evidence tags (e.g., `sig.context.work.deadline`, `sig.agency.low`, `sig.clarity.high`)

### Key Principle: L1 Should Not Repeat Baseline

**If L1 repeats baseline → this reduces value.**

L1 questions should:
- ✅ Provide context (work deadlines, social situations, health stress)
- ✅ Capture triggers (what caused the current state)
- ✅ Refine understanding (agency/clarity nuances beyond simple scales)
- ✅ Add specificity (why "overloaded" vs "exhausted", why "connected" vs "detached")

L1 questions should NOT:
- ❌ Simply re-ask "How is your energy?" (baseline already measured this)
- ❌ Re-measure the same 6 dimensions (baseline already did this)
- ❌ Ask generic questions that don't add context

### Example: Good vs Bad L1 Questions

**Bad (repeats baseline):**
- "How is your energy level?" → Baseline already asked this
- "Rate your tension" → Baseline already measured tension

**Good (adds context):**
- "What's driving your day right now?" → Captures context (work deadline, social event, etc.)
- "How clear do you feel about what to do next?" → Refines clarity beyond baseline scale
- "What's your sense of control over today?" → Adds agency context, not just a number

### Implementation Notes

- **L1 cards** are defined in `client/src/data/flow/L1.json`
- **L1 selector** (`l1CardSelector.js`) uses adaptive logic to:
  - Prioritize "minimum gates" (agency, clarity, load, social) based on `macroBase`
  - Select macro-specific cards when available
  - Skip baseline-redundant cards (see `shouldSkipBaselineCard` in `l1CardSelector.js`)
- **Evidence tags** from L1 responses are canonicalized and used by:
  - `microSelector.js` — to choose specific micro states
  - `deepEngine.js` — to refine macro classification and determine `needsRefine`
  - Gate logic — to determine if minimum information is collected

### Future Improvements (EPIC C2)

- Add macro-specific L1 cards that provide targeted clarification
- Expand card pool to reduce reliance on fallback micro states
- Improve baseline redundancy detection to avoid asking redundant questions
