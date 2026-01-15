# AK3-POST-1.1, 1.2, 1.4: Диагностика Fallback и Новые KPI

**Date:** 2024-12-XX  
**Status:** ✅ Реализовано  
**Sample run:** 1,000 baseline combinations (seed: 42)

---

## ✅ РЕАЛИЗОВАНО

### AK3-POST-1.1 — Диагностика причин fallback

**Файлы изменены:**
- ✅ `client/src/utils/microSelector.js` — добавлен `scoreMicros()` и `selectMicroDebug()`
- ✅ `client/src/utils/deepEngine.js` — использует `selectMicroDebug()` и добавляет `microReason` + `microTopCandidate`

**Изменения:**
1. ✅ Вынесен `scoreMicros()` для переиспользования
2. ✅ Добавлен `selectMicroDebug()` который возвращает:
   - `selected`: выбранный micro или null
   - `topCandidate`: лучший кандидат даже если не выбран
   - `effectiveThreshold`: эффективный порог
   - `reason`: причина (no_micros | no_evidence | no_matches_zero_score | below_threshold_nonzero | selected)
3. ✅ `deepEngine.js` теперь записывает `microReason` и `microTopCandidate` в результат

### AK3-POST-1.2 — Обновлен checkDeepBalance.js

**Файл изменен:**
- ✅ `client/scripts/checkDeepBalance.js` — добавлены метрики для диагностики fallback

**Новые метрики:**
1. ✅ `fallbackReasonBreakdown` — breakdown причин fallback (overall + per-macro)
2. ✅ `topTagsInFallback` — топ-10 тегов в fallback случаях (overall + per-macro)
3. ✅ `topCandidateScoreHistogram` — гистограмма score topCandidate (0, (0..0.1], (0.1..0.2], (0.2..0.3], 0.3+)
4. ✅ Секция "Why Fallback Happens" в MD отчете

### AK3-POST-1.4 — Новые KPI (micro_specific_rate)

**Файл изменен:**
- ✅ `client/scripts/checkDeepBalance.js` — добавлены метрики специфичности

**Новые KPI:**
1. ✅ `micro_specific_rate` — доля selected micro с non-axis tags (новый главный KPI)
2. ✅ `axis_only_selected_rate` — доля selected micro только с axis tags
3. ✅ Per-macro breakdown для specificity

**Логика:**
- Axis tags: `sig.tension.*`, `sig.fatigue.*`, `sig.valence.*`, `sig.agency.*`, `sig.arousal.*`
- Specific = matchedTags содержит хотя бы один non-axis tag
- Axis-only = matchedTags содержит только axis tags

---

## 📊 РЕЗУЛЬТАТЫ (1,000 прогонов)

### Top-Level Metrics

| Метрика | Значение | Статус |
|---------|----------|--------|
| **Micro none rate** | 0.00% | ✅ Достигнуто |
| **Micro fallback rate** | 13.30% | ❌ Превышен (цель: ≤5%) |
| **Micro selected rate** | 86.70% | ✅ Хорошо |
| **Micro specific rate** | **95.39% of selected** | ✅ **Новый KPI** |
| **Micro axis-only rate** | 0.00% of selected | ✅ Хорошо |
| **Weak evidence share** | 2.30% | ✅ Приемлемо |

### Why Fallback Happens

#### Fallback Reason Breakdown (Overall)

| Причина | Процент | Интерпретация |
|---------|---------|---------------|
| **no_matches_zero_score** | **95.49%** | ❌ **Доминирует** — topCandidate имеет score = 0 |
| **no_evidence** | 4.51% | ✅ Минимально |

**Вывод:** Подавляющее большинство fallback (95.49%) происходит из-за `no_matches_zero_score` — это означает, что теги не совпадают с evidence tags для micros, и score = 0.

#### TopCandidate Score Histogram

| Score Range | Count | Percentage |
|------------|-------|------------|
| **0 (exact)** | **133** | **100.00%** |
| (0, 0.1] | 0 | 0.00% |
| (0.1, 0.2] | 0 | 0.00% |
| (0.2, 0.3] | 0 | 0.00% |
| 0.3+ | 0 | 0.00% |

**Вывод:** Все fallback случаи имеют topCandidate score = 0. Это подтверждает, что проблема в отсутствии совпадений тегов.

#### Top Tags in Fallback Cases (Overall - Top 10)

1. **sig.context.health.stress:** 69 (51.88%)
2. **sig.context.social.isolation:** 67 (50.38%)
3. **sig.context.work.deadline:** 64 (48.12%)
4. **sig.context.family.tension:** 27 (20.30%)
5. **sig.micro.averse.disgust_avoid:** 11 (8.27%)
6. **sig.micro.averse.angry:** 11 (8.27%)
7. **sig.micro.averse.irritated:** 10 (7.52%)
8. **sig.micro.pressured.tense_functional:** 10 (7.52%)
9. **sig.micro.detached.disconnected:** 9 (6.77%)
10. **sig.micro.overloaded.cognitive:** 9 (6.77%)

**Вывод:** 
- **Context tags доминируют** (51.88%, 50.38%, 48.12%) — это теги, которые не дают достаточной информации для micro selection
- **Conflicting micro tags** (8-9%) — теги из других макросов, которые не совпадают с текущим macro

---

## 🎯 РЕКОМЕНДАЦИИ (AK3-POST-1.3)

### Вариант 1: Расширить mapping evidenceTags → microEvidenceTags (РЕКОМЕНДУЕТСЯ)

**Проблема:** 95.49% fallback из-за `no_matches_zero_score` — теги не совпадают с evidence tags.

**Решение:**
1. **Добавить context tags как supporting** в релевантные micros:
   - `sig.context.health.stress` → добавить в `exhausted.*`, `overloaded.*`, `down.*`
   - `sig.context.social.isolation` → добавить в `down.lonely_low`, `detached.*`
   - `sig.context.work.deadline` → добавить в `overloaded.*`, `pressured.*`

2. **Добавить alias в tagAliasMap** (если приходят "почти-синонимы"):
   - Например, если `sig.context.health.stress` должен маппиться на `sig.micro.exhausted.burnout`

3. **Усилить optionalWeights** для context tags:
   - Увеличить weight для context tags в релевантных micros

**Ожидаемый эффект:** Fallback rate снизится с 13.30% до ~5-7% без роста illegal/flip

### Вариант 2: Снизить threshold условно (если доминирует below_threshold_nonzero)

**Текущая ситуация:** `below_threshold_nonzero` = 0% (не доминирует)

**Если бы доминировал:**
- Снизить threshold условно:
  - Только если `topCandidate.matchedTags.length >= 1`
  - И `topCandidate.score > 0`
  - И `baselineConfidence !== 'high'`

**Статус:** Не требуется (не доминирует)

---

## 📈 НОВЫЕ KPI (AK3-POST-1.4)

### Micro Specificity

| Метрика | Значение | Интерпретация |
|---------|----------|---------------|
| **Micro specific rate** | **95.39% of selected** | ✅ **Отлично** — большинство selected micro имеют non-axis tags |
| **Micro axis-only rate** | 0.00% of selected | ✅ Хорошо — нет selected micro только с axis tags |

**Вывод:** Система успешно выбирает specific micro на основе реальных evidence tags, а не только axis tags.

---

## 🔧 СЛЕДУЮЩИЕ ШАГИ

1. ✅ AK3-POST-1.1, 1.2, 1.4 реализованы
2. ⏳ **AK3-POST-1.3** — Реализовать Вариант 1 (расширить mapping evidenceTags → microEvidenceTags)
   - Добавить context tags как supporting в релевантные micros
   - Усилить optionalWeights для context tags
   - Перезапустить noisy-mixed и проверить снижение fallback rate

---

## 📁 ФАЙЛЫ

- **JSON:** `scripts/out/deep_balance_noisy_mixed.json`
- **MD:** `scripts/out/deep_balance_noisy_mixed.md`
- **Config:** mode=noisy-mixed, seed=42, runs=1000

---

## ✅ ВЫВОДЫ

1. **Диагностика работает:** Теперь видно, что 95.49% fallback из-за `no_matches_zero_score`
2. **Проблема идентифицирована:** Context tags не маппятся на micro evidence tags
3. **Решение ясно:** Расширить mapping evidenceTags → microEvidenceTags (Вариант 1)
4. **Новый KPI работает:** Micro specific rate = 95.39% — отлично!

**Статус:** ✅ Готово к реализации AK3-POST-1.3 (Вариант 1).
