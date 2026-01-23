# Runtime Smoke Tests - Deep Dive (AK3-POST-4c.2)

**Generated:** 2026-01-18  
**Goal:** Проверить Deep Dive в приложении, не в симуляции  
**Instructions:** 
1. Запустите Deep Dive flow в приложении
2. Для каждой сессии скопируйте JSON из консоли (префикс `[DEEP_SMOKE_SESSION]`)
3. Заполните секцию ниже на основе JSON-лога
4. Оцените: "попали" / "частично" / "мимо" + 1 строка почему

## Test Scenarios

### Scenario 1: Overloaded — "слишком много задач"
**Type:** Overloaded/Exhausted (A1)  
**Baseline Snapshot:** (из JSON: `baseline`)
- Valence: [из JSON]
- Energy: [из JSON]
- Tension: [из JSON]
- Clarity: [из JSON]
- Control: [из JSON]
- Social: [из JSON]

**Ожидание до прохождения:** "жду overloaded.rushed" или "overloaded.cognitive"

**L1 Steps:** (из JSON: `steps`)
- Step 0: `cardId` → `response` (selectedBecause: `reason`, gatesState: `{...}`)
- Step 1: ...
- [Копируйте из JSON]

**Output:** (из JSON: `output`)
- macroBase: [из JSON]
- macroFinal: [из JSON]
- microKey: [из JSON]
- microSource: [из JSON]
- confidenceBand: [из JSON]
- clarityFlag: [из JSON]
- needsRefine: [из JSON]
- endedBy: [из JSON]
- finalEvidenceTagsCount: [из JSON]

**Оценка:** 
- ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**

**Почему:** [1 строка объяснения]

**Notes:**

---

### Scenario 2: Overloaded — "много стимулов/хаос/переключения"
**Type:** Overloaded/Exhausted (A2) — конфликтный (1 конфликтный шаг)  
**Baseline Snapshot:** (из JSON: `baseline`)

**Ожидание до прохождения:** "жду overloaded.overstimulated" или "overloaded.cognitive"

**L1 Steps:** (из JSON: `steps`)

**Output:** (из JSON: `output`)

**Оценка:** ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**

**Почему:** [1 строка объяснения]

**Notes:**

---

### Scenario 3: Exhausted — "низкая энергия, но без высокого напряжения"
**Type:** Overloaded/Exhausted (A3) — чистые ответы  
**Baseline Snapshot:** (из JSON: `baseline`)

**Ожидание до прохождения:** "жду exhausted.drained" или "exhausted.sleepy_fog"

**L1 Steps:** (из JSON: `steps`)

**Output:** (из JSON: `output`)

**Оценка:** ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**

**Почему:** [1 строка объяснения]

**Notes:**

---

### Scenario 4: Exhausted vs Overloaded конфликт — "устал + напряжён + срочно"
**Type:** Overloaded/Exhausted (A4) — конфликтный (2 конфликтных шага)  
**Baseline Snapshot:** (из JSON: `baseline`)

**Ожидание до прохождения:** "жду exhausted.* или overloaded.*, но не уверен"

**L1 Steps:** (из JSON: `steps`)

**Output:** (из JSON: `output`)

**Оценка:** ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**

**Почему:** [1 строка объяснения]

**Notes:**

---

### Scenario 5: Connected — "поддержка, контакт, энергия норм"
**Type:** Connected/Detached (B1)  
**Baseline Snapshot:** (из JSON: `baseline`)

**Ожидание до прохождения:** "жду connected.*"

**L1 Steps:** (из JSON: `steps`)

**Output:** (из JSON: `output`)

**Оценка:** ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**

**Почему:** [1 строка объяснения]

**Notes:**

---

### Scenario 6: Detached — "отстранённость, как будто не со мной, мало эмоций"
**Type:** Connected/Detached (B2)  
**Baseline Snapshot:** (из JSON: `baseline`)

**Ожидание до прохождения:** "жду detached.numb" или "detached.disconnected"

**L1 Steps:** (из JSON: `steps`)

**Output:** (из JSON: `output`)

**Оценка:** ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**

**Почему:** [1 строка объяснения]

**Notes:**

---

### Scenario 7: Social conflict — "контакт есть, но неприятно/раздражает"
**Type:** Connected/Detached (B3) — конфликтный  
**Baseline Snapshot:** (из JSON: `baseline`)

**Ожидание до прохождения:** "жду connected.* или detached.*, но с конфликтом"

**L1 Steps:** (из JSON: `steps`)

**Output:** (из JSON: `output`)

**Оценка:** ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**

**Почему:** [1 строка объяснения]

**Notes:**

---

### Scenario 8: Размытое состояние — много NS (минимум 3 NS)
**Type:** Размытые/Not sure (C1)  
**Baseline Snapshot:** (из JSON: `baseline`)

**Ожидание до прохождения:** "не уверен, возможно grounded.* или fallback"

**L1 Steps:** (из JSON: `steps` — должно быть минимум 3 NS)

**Output:** (из JSON: `output`)

**Оценка:** ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**

**Почему:** [1 строка объяснения]

**Notes:**

---

### Scenario 9: Смешанное — "чуть вниз, но и немного контроля" (2 NS + 1 конфликт)
**Type:** Размытые/Not sure (C2)  
**Baseline Snapshot:** (из JSON: `baseline`)

**Ожидание до прохождения:** "не уверен, возможно down.* или grounded.*"

**L1 Steps:** (из JSON: `steps` — должно быть 2 NS + 1 конфликтный шаг)

**Output:** (из JSON: `output`)

**Оценка:** ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**

**Почему:** [1 строка объяснения]

**Notes:**

---

### Scenario 10: Высокая неопределённость — "почти все NS"
**Type:** Размытые/Not sure (C3)  
**Baseline Snapshot:** (из JSON: `baseline`)

**Ожидание до прохождения:** "не уверен, возможно fallback или grounded.steady"

**L1 Steps:** (из JSON: `steps` — должно быть почти все NS)

**Output:** (из JSON: `output`)

**Оценка:** ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**

**Почему:** [1 строка объяснения]

**Notes:**

---

## Summary

### Test Results

| Scenario | Type | Assessment | Issues |
|----------|------|------------|--------|
| 1 | Obvious | ⏳ Pending | - |
| 2 | Obvious | ⏳ Pending | - |
| 3 | Obvious | ⏳ Pending | - |
| 4 | Conflicting | ⏳ Pending | - |
| 5 | Conflicting | ⏳ Pending | - |
| 6 | Conflicting | ⏳ Pending | - |
| 7 | Conflicting | ⏳ Pending | - |
| 8 | Ambiguous | ⏳ Pending | - |
| 9 | Ambiguous | ⏳ Pending | - |
| 10 | Ambiguous | ⏳ Pending | - |

### Strange Cases (for AJ4)

1. [Case description]
2. [Case description]
3. [Case description]
4. [Case description]
5. [Case description]

---

## Instructions

### Как заполнять

1. **Запустите Deep Dive flow в приложении** для каждого сценария
2. **Скопируйте JSON из консоли** (префикс `[DEEP_SMOKE_SESSION]`)
3. **Заполните секцию сценария:**
   - `Baseline Snapshot` — из JSON поля `baseline`
   - `Ожидание до прохождения` — что вы ожидали получить
   - `L1 Steps` — из JSON поля `steps` (можно кратко: cardId → response, selectedBecause)
   - `Output` — из JSON поля `output`
   - `Оценка` — ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**
   - `Почему` — 1 строка объяснения

### Что смотреть в JSON

- `baseline` — 6 метрик (valence, energy, tension, clarity, control, social)
- `macroBase` — начальный macro из baseline
- `steps[]` — массив шагов:
  - `cardId` — какая карточка
  - `response` — A/B/NS
  - `selectedBecause` — почему выбрана (gate:*, macro_specific:*, fallback)
  - `gatesState` — состояние gates на этом шаге
  - `addedTags` — какие теги добавились
- `output` — финальный результат:
  - `microKey`, `microSource`, `confidenceBand`, `clarityFlag`, `needsRefine`
  - `finalEvidenceTagsSample` — итоговые теги (до 40)
- `endedBy` — как завершилось (early_exit, no_card, normal)

### После всех тестов

Вынести 5 странных кейсов для AJ4 (False Positives Analysis)
