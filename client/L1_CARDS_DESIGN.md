# L1 Cards Design (Deep Dive Evidence Layer)

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Approved (design artifact)

## Overview

L1 cards are the **evidence layer** in deep dive flows. They provide semantic signals that refine macro states into micro states and, when necessary, trigger macro flips.

## Role of L1 Cards

### In Simplified Flow (Baseline-Only)
- **No L1 cards**: Simplified flow uses only baseline metrics (6 dimensions)
- **Result**: Macro state only (no micro refinement)

### In Deep Dive Flow
- **L1 cards provide evidence**: Each card yields 1-3 micro/context tags
- **Purpose 1**: Select micro within current macro cluster
- **Purpose 2**: (Rarely) Trigger macro flip if evidence strongly contradicts baseline

## Design Principles

### 1. Not a Duplicate of Baseline

**Problem to avoid:** L1 cards should NOT be "baseline questions in different words."

**Solution:** L1 cards focus on **semantic distinctions** between micro states and close macro neighbors, not on re-measuring baseline axes.

### 2. Evidence-Driven

**Each card should:**
- Yield 1-3 specific tags (micro, context, trigger, body, or cognition)
- Provide semantic proof, not just axis measurements
- Have "Not sure / both" as valid uncertainty data (not skip)

### 3. Cluster-Focused

**Cards are designed for specific macro clusters:**
- **Stress cluster:** `pressured`, `blocked`, `overloaded`
- **Low energy cluster:** `exhausted`, `down`, `averse`, `detached`
- **Positive cluster:** `grounded`, `engaged`, `connected`, `capable`

**Within each cluster, cards distinguish:**
- Micro states within the same macro
- Close macro neighbors (e.g., `pressured` vs `blocked` vs `overloaded`)

## Card Design Template

### Structure

```
Card ID: L1-{cluster}-{number}
Title: [User-facing question/statement]
Options:
  - Option A → [Tag 1, Tag 2, ...]
  - Option B → [Tag 1, Tag 2, ...]
  - Option C → [Tag 1, Tag 2, ...]
  - "Not sure / both" → [uncertainty_note.*]
```

### Example Cards

#### Stress Cluster (Pressured/Blocked/Overloaded)

**Card L1-STRESS-01:**
```
Title: "Я двигаюсь, но ощущение, что меня давит"
Options:
  - "Да, именно так" → sig.micro.pressured.tense_functional, sig.context.work.deadline
  - "Скорее да" → sig.micro.pressured.tense_functional
  - "Не совсем" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

**Card L1-STRESS-02:**
```
Title: "Я знаю, что надо сделать, но не могу начать"
Options:
  - "Точно про меня" → sig.micro.blocked.stuck, sig.cognition.rumination
  - "Отчасти" → sig.micro.blocked.stuck
  - "Нет, я могу начать" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

**Card L1-STRESS-03:**
```
Title: "Слишком много задач, не понимаю за что хвататься"
Options:
  - "Именно так" → sig.micro.overloaded.too_many_tasks, sig.context.work.overcommit
  - "Скорее да" → sig.micro.overloaded.too_many_tasks
  - "Нет, у меня есть приоритет" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

**Card L1-STRESS-04:**
```
Title: "Голова перегружена, слишком много мыслей одновременно"
Options:
  - "Да, именно" → sig.micro.overloaded.cognitive, sig.cognition.racing
  - "Скорее да" → sig.micro.overloaded.cognitive
  - "Нет, мысли ясные" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

**Card L1-STRESS-05:**
```
Title: "Я избегаю делать то, что нужно"
Options:
  - "Да, откладываю" → sig.micro.blocked.avoidant, sig.trigger.uncertainty
  - "Скорее да" → sig.micro.blocked.avoidant
  - "Нет, я делаю" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

#### Low Energy Cluster (Exhausted/Down/Averse/Detached)

**Card L1-LOW-01:**
```
Title: "Я чувствую себя выжатым, пустым"
Options:
  - "Точно" → sig.micro.exhausted.drained, sig.body.heavy_limbs
  - "Скорее да" → sig.micro.exhausted.drained
  - "Нет, есть энергия" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

**Card L1-LOW-02:**
```
Title: "Мне грустно, тяжело на душе"
Options:
  - "Именно так" → sig.micro.down.sad_heavy, sig.context.social.isolation
  - "Скорее да" → sig.micro.down.sad_heavy
  - "Нет, настроение нормальное" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

**Card L1-LOW-03:**
```
Title: "Я раздражён, всё бесит"
Options:
  - "Да, именно" → sig.micro.averse.irritated, sig.trigger.interruption
  - "Скорее да" → sig.micro.averse.irritated
  - "Нет, я спокоен" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

**Card L1-LOW-04:**
```
Title: "Я ничего не чувствую, онемение"
Options:
  - "Точно про меня" → sig.micro.detached.numb, sig.cognition.blank
  - "Скорее да" → sig.micro.detached.numb
  - "Нет, я чувствую" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

#### Positive Cluster (Grounded/Engaged/Connected/Capable)

**Card L1-POS-01:**
```
Title: "Я чувствую себя устойчиво, ровно"
Options:
  - "Именно так" → sig.micro.grounded.steady, sig.clarity.high
  - "Скорее да" → sig.micro.grounded.steady
  - "Нет, нестабильно" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

**Card L1-POS-02:**
```
Title: "Мне интересно, хочется исследовать"
Options:
  - "Да, именно" → sig.micro.engaged.curious, sig.context.work.performance
  - "Скорее да" → sig.micro.engaged.curious
  - "Нет, не интересно" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

**Card L1-POS-03:**
```
Title: "Я чувствую тепло и поддержку от других"
Options:
  - "Точно" → sig.micro.connected.warm, sig.context.social.support
  - "Скорее да" → sig.micro.connected.warm
  - "Нет, чувствую одиночество" → [skip to next card]
  - "Не уверен" → uncertainty_note.low_clarity
```

## Card Selection Logic

### For Macro Refinement (Within Cluster)

1. **Start with baseline macro** (from baseline engine)
2. **Identify macro cluster** (stress, low energy, positive)
3. **Select cluster-specific cards** (e.g., L1-STRESS-* for stress cluster)
4. **Ask 2-3 cards** from the cluster
5. **Collect evidence tags**
6. **Score micro states** within macro cluster
7. **Select top micro** (or remain at macro level if no strong match)

### For Macro Flip (Rare)

1. **Baseline macro** = `pressured`
2. **Evidence tags** strongly suggest `blocked` (e.g., `sig.micro.blocked.stuck`, `sig.micro.blocked.frozen`)
3. **Score difference** > threshold (e.g., `blocked` score > `pressured` score + 0.1)
4. **Macro flip** to `blocked` with micro refinement

**Macro flip criteria:**
- Evidence weight > 0.5
- Score difference > 0.1
- Presence of "hard blocker" tags (e.g., `sig.micro.blocked.frozen` incompatible with `pressured`)

## Card Bank Requirements

### Minimum Coverage

- **3 cards per macro cluster** (stress, low energy, positive)
- **Total: ~9-12 cards** for full coverage
- **Each card distinguishes 2-3 micro states or close macros**

### Card Quality Criteria

1. **Semantic clarity:** User understands the question/statement
2. **Distinctive tags:** Each option yields unique tag combinations
3. **Uncertainty handling:** "Not sure / both" is a valid option
4. **No baseline duplication:** Card doesn't re-measure baseline axes

## Implementation Notes

1. **Card sequencing:**
   - Cards are selected based on baseline macro cluster
   - Not all cards are asked (2-3 cards per deep dive)
   - Cards can be skipped if user selects "No" option

2. **Tag collection:**
   - Each card response yields 1-3 tags
   - Tags are accumulated across cards
   - Tags are weighted by card confidence (e.g., "Exactly" > "Rather yes")

3. **Micro selection:**
   - Micro states are scored based on accumulated tags
   - Top micro is selected if score > threshold
   - Otherwise, remain at macro level

## Related Documents

- `MICRO_TAXONOMY_V1.md` — Micro state taxonomy
- `TAG_NORMALIZATION_V1.md` — Tag schema
- `BASELINE_MACRO_CONTRACT.md` — Baseline macro contract
