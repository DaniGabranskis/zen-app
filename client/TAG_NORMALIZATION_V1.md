# Tag Normalization v1

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Approved (design artifact)

## Overview

This document defines the normalized tag schema for the state classification system. Tags are organized into categories: **axis tags** (baseline measurements), **attribution tags** (semantic markers), **micro tags** (deep refinements), and **context/trigger/body-mind tags** (deep evidence).

## Design Principles

1. **Baseline axes remain stable**: Axis tags represent stable measurements, not semantic interpretations
2. **Deep tags are semantic evidence**: Deep tags provide semantic proof, not "renamed axes"
3. **Readable and hierarchical**: Tag structure is human-readable and logically organized
4. **Backward compatibility**: Legacy tags are mapped to new schema during migration period

## Tag Categories

### 1. Axis Tags (Baseline → Levels)

**Purpose:** Represent quantized levels of baseline dimensions.

**Schema:** `sig.{axis}.{level}`

#### Valence
- `sig.valence.neg` — Negative valence (V < -0.8)
- `sig.valence.neutral` — Neutral valence (-0.8 ≤ V ≤ 0.8)
- `sig.valence.pos` — Positive valence (V > 0.8)
- `sig.valence.strong` — Strong valence (|V| > threshold, applies with neg/pos)

#### Arousal
- `sig.arousal.low` — Low arousal (Ar < 0.35)
- `sig.arousal.mid` — Mid arousal (0.35 ≤ Ar < 1.7)
- `sig.arousal.high` — High arousal (Ar ≥ 1.7)

#### Tension
- `sig.tension.low` — Low tension (T < 0.6)
- `sig.tension.mid` — Mid tension (0.6 ≤ T < 1.8)
- `sig.tension.high` — High tension (T ≥ 1.8)

#### Agency
- `sig.agency.low` — Low agency (Ag < 0.5)
- `sig.agency.mid` — Mid agency (0.5 ≤ Ag < 1.5)
- `sig.agency.high` — High agency (Ag ≥ 1.5)

#### Clarity (from Certainty)
- `sig.clarity.low` — Low clarity (C < 0.5)
- `sig.clarity.mid` — Mid clarity (0.5 ≤ C < 1.5)
- `sig.clarity.high` — High clarity (C ≥ 1.5)

#### Social (from Socialness)
- `sig.social.low` — Low socialness (S < 0.5)
- `sig.social.mid` — Mid socialness (0.5 ≤ S < 1.5)
- `sig.social.high` — High socialness (S ≥ 1.5)

#### Fatigue
- `sig.fatigue.low` — Low fatigue (F < 0.5)
- `sig.fatigue.mid` — Mid fatigue (0.5 ≤ F < 1.5)
- `sig.fatigue.high` — High fatigue (F ≥ 1.5)

#### Threat (from Fear Bias)
- `sig.threat.low` — Low threat perception (fear_bias < threshold)
- `sig.threat.mid` — Mid threat perception
- `sig.threat.high` — High threat perception (fear_bias > threshold)

### 2. Attribution Tags (Semantic Markers)

**Purpose:** Represent attribution patterns (not axes, but semantic markers).

**Schema:** `sig.attribution.{type}`

- `sig.attribution.self` — Self-blame pattern (replaces `self_blame` as axis)
- `sig.attribution.other` — Other-blame pattern (replaces `other_blame` as axis)

**Note:** These are semantic markers, not continuous axes. They indicate "presence of attribution pattern" rather than a quantized level.

### 3. Micro Tags (Deep-Only)

**Purpose:** Represent micro state refinements (see `MICRO_TAXONOMY_V1.md`).

**Schema:** `sig.micro.{macro}.{micro}`

**Examples:**
- `sig.micro.pressured.rushed`
- `sig.micro.blocked.stuck`
- `sig.micro.overloaded.cognitive`
- `sig.micro.exhausted.drained`
- `sig.micro.down.sad_heavy`
- `sig.micro.averse.irritated`
- `sig.micro.detached.numb`
- `sig.micro.grounded.steady`
- `sig.micro.engaged.focused`
- `sig.micro.connected.warm`
- `sig.micro.capable.deciding`

**Full list:** See `MICRO_TAXONOMY_V1.md` for complete micro taxonomy.

### 4. Context Tags (Deep-Only)

**Purpose:** Represent situational context from L1 cards.

**Schema:** `sig.context.{domain}.{specific}`

#### Work Context
- `sig.context.work.deadline` — Deadline pressure
- `sig.context.work.performance` — Performance evaluation
- `sig.context.work.overcommit` — Overcommitment
- `sig.context.work.conflict` — Workplace conflict

#### Social Context
- `sig.context.social.conflict` — Social conflict
- `sig.context.social.isolation` — Social isolation
- `sig.context.social.support` — Social support available
- `sig.context.social.expectation` — Social expectations

#### Health Context
- `sig.context.health.pain` — Physical pain
- `sig.context.health.fatigue` — Health-related fatigue
- `sig.context.health.sleep` — Sleep issues

### 5. Trigger Tags (Deep-Only)

**Purpose:** Represent immediate triggers or events.

**Schema:** `sig.trigger.{type}`

- `sig.trigger.interruption` — Interruption, disruption
- `sig.trigger.uncertainty` — Uncertainty, ambiguity
- `sig.trigger.overcommit` — Overcommitment, too many obligations
- `sig.trigger.rejection` — Rejection, exclusion
- `sig.trigger.criticism` — Criticism, judgment
- `sig.trigger.loss` — Loss, grief

### 6. Body Tags (Deep-Only)

**Purpose:** Represent physical sensations.

**Schema:** `sig.body.{sensation}`

- `sig.body.racing_heart` — Racing heart, palpitations
- `sig.body.tight_chest` — Tight chest, constriction
- `sig.body.headache` — Headache, head pressure
- `sig.body.tension_shoulders` — Shoulder tension
- `sig.body.heavy_limbs` — Heavy limbs, fatigue
- `sig.body.nausea` — Nausea, stomach discomfort

### 7. Cognition Tags (Deep-Only)

**Purpose:** Represent cognitive patterns.

**Schema:** `sig.cognition.{pattern}`

- `sig.cognition.rumination` — Rumination, repetitive thoughts
- `sig.cognition.scattered` — Scattered thoughts, difficulty focusing
- `sig.cognition.tunnel` — Tunnel vision, narrow focus
- `sig.cognition.racing` — Racing thoughts, mental speed
- `sig.cognition.fog` — Mental fog, unclear thinking
- `sig.cognition.blank` — Mental blank, no thoughts

## Legacy Tag Mapping

**Migration period:** Legacy tags are mapped to new schema for backward compatibility.

### Legacy → New Mapping

| Legacy Tag | New Tag | Notes |
|------------|---------|-------|
| `self_blame` | `sig.attribution.self` | Attribution marker, not axis |
| `other_blame` | `sig.attribution.other` | Attribution marker, not axis |
| `fear_bias` | `sig.threat.high` / `sig.threat.mid` / `sig.threat.low` | Converted to threat level |
| `certainty` | `sig.clarity.{level}` | Renamed for clarity |
| `socialness` | `sig.social.{level}` | Renamed for consistency |
| `fatigue` | `sig.fatigue.{level}` | Already normalized |
| `arousal` | `sig.arousal.{level}` | Already normalized |
| `tension` | `sig.tension.{level}` | Already normalized |
| `agency` | `sig.agency.{level}` | Already normalized |
| `valence` | `sig.valence.{level}` | Already normalized |

## Tag Usage Rules

### Baseline Flow (Simplified)
- **Allowed:** Axis tags only (`sig.valence.*`, `sig.arousal.*`, `sig.tension.*`, etc.)
- **Not allowed:** Micro tags, context tags, trigger tags, body tags, cognition tags

### Deep Flow
- **Allowed:** All tag categories
- **Primary:** Micro tags, context tags, trigger tags, body tags, cognition tags
- **Secondary:** Axis tags (for reference, not primary classification)

## Implementation Notes

1. **Tag validation:**
   - Baseline engine: Only accepts axis tags
   - Deep engine: Accepts all tag categories

2. **Tag scoring:**
   - Micro tags: High weight for micro state selection
   - Context/trigger/body/cognition tags: Medium weight for macro/micro refinement
   - Axis tags: Low weight in deep (already captured in baseline)

3. **Tag aliasing:**
   - Legacy tags are automatically converted to new schema
   - Conversion happens at tag ingestion point
   - Both old and new tags are stored during migration period

## Related Documents

- `MICRO_TAXONOMY_V1.md` — Micro state taxonomy
- `L1_CARDS_DESIGN.md` — L1 card design principles
- `BASELINE_MACRO_CONTRACT.md` — Baseline macro contract
