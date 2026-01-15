# AK3-POST-1 P0+P1 Final Report: Fallback Micro Implementation

**Date:** 2024-12-XX  
**Status:** ✅ P0 и P1 реализованы  
**Sample size:** 10,000 baseline combinations  
**Seed:** 42 (reproducible)

---

## ✅ РЕАЛИЗОВАНО

### P0 — Deep: убрать micro=null в runtime (fallback micro + microSource)

**Файлы изменены:**
- ✅ `client/src/utils/deepEngine.js` — добавлен fallback micro и microSource
- ✅ `client/src/utils/microSelector.js` — исправлен optionalWeights

**Изменения:**
1. ✅ Добавлен `getFallbackMicroKey()` helper
2. ✅ Вычисляется `microKeyFinal` и `microSource` (selected | fallback | fallback_sanity | none)
3. ✅ При fallback качество честно падает: `confidenceBand='low'`, `clarityFlag='low'`, `needsRefine=true`
4. ✅ Sanity check использует fallback вместо null
5. ✅ Исправлен optionalWeights (теперь не штрафует при weight < 1.0)

### P1 — Обновлен баланс-скрипт: fallback вместо null

**Файл изменен:**
- ✅ `client/scripts/checkDeepBalance.js` — отслеживает fallback вместо null

**Изменения:**
1. ✅ `microNullCount` → `microNoneCount` + `microFallbackCount` + `microSelectedCount`
2. ✅ Метрики: `micro_none_rate`, `micro_fallback_rate`, `micro_selected_rate`
3. ✅ Per-macro breakdown для fallback

---

## 📊 ФИНАЛЬНЫЕ МЕТРИКИ (после P0+P1)

### Top-Level Metrics

| Метрика | Значение | Цель | Статус |
|---------|----------|------|--------|
| **Micro none rate** | **0.00%** | ≈0% | ✅ **Достигнуто!** |
| **Micro fallback rate** | **10.61%** | ≤5% | ❌ Превышен в 2.1 раза |
| **Micro selected rate** | 89.39% | - | ✅ Хорошо |
| **Weak evidence share** | 2.39% | 2-6% | ✅ Приемлемо |
| **Macro flip rate** | 0.00% | ≤10% | ✅ Отлично |
| **Illegal flip rate** | 0.00% | 0% | ✅ Отлично |
| **Avg tags per run** | 6.04 | - | ✅ Хорошо |
| **Must-have hit rate** | 73.31% | - | ✅ Хорошо |

### Per-Macro Analysis

#### Micro Fallback Rate (Per Macro)

| Macro | Fallback Rate | Cases | Статус |
|-------|---------------|-------|--------|
| **overloaded** | **14.40%** | 211/1465 | ❌ **Критично** (цель: ≤8%) |
| **exhausted** | **13.79%** | 392/2842 | ❌ **Критично** (цель: ≤8%) |
| **detached** | 6.90% | 133/1927 | ⚠️ Выше цели |
| **down** | 6.73% | 325/4827 | ⚠️ Выше цели |

**Worst macro by micro fallback:** `overloaded` (14.40%)

#### Micro None Rate (Per Macro)

- ✅ **Все макросы имеют fallback** — micro none rate = 0.00%

#### Weak Evidence Share (Per Macro)

| Macro | Weak Evidence | Статус |
|-------|---------------|--------|
| **exhausted** | 2.46% | ✅ Приемлемо |
| **down** | 2.30% | ✅ Приемлемо |
| **overloaded** | 1.71% | ✅ Приемлемо |
| **detached** | 1.71% | ✅ Приемлемо |

---

## 🎯 ДОСТИЖЕНИЯ

### ✅ Успехи

1. **Micro none rate = 0.00%** — полностью устранен micro=null в runtime
2. **Fallback работает** — все макросы получают fallback micro
3. **Качество честное** — при fallback `confidenceBand='low'`, `clarityFlag='low'`, `needsRefine=true`
4. **OptionalWeights исправлен** — context tags больше не штрафуют
5. **Illegal flip rate = 0.00%** — нет семантических нарушений

### ⚠️ Проблемы

1. **Micro fallback rate = 10.61%** (цель: ≤5%)
   - Превышен в 2.1 раза
   - Worst macro: `overloaded` (14.40%) и `exhausted` (13.79%)

2. **Причины высокого fallback rate:**
   - Случаи с 0-1 тегами (239 случаев = 2.39%)
   - Только context tags без evidence
   - Слишком строгая логика `shouldMicroBeNull` или `selectMicro` threshold

---

## 🔧 РЕКОМЕНДАЦИИ ДЛЯ СНИЖЕНИЯ FALLBACK RATE

### 1. Критично: Ослабить `shouldMicroBeNull` ✅ ВЫСОКИЙ ПРИОРИТЕТ

**Текущая логика:**
```javascript
export function shouldMicroBeNull(macroKey, evidenceTags, baselineConfidence) {
  if (baselineConfidence === 'low' && evidenceTags.length === 0) {
    return true;
  }
  if (baselineConfidence === 'low' && evidenceTags.length < 1) {
    return true;
  }
  return false;
}
```

**Рекомендация:**
- Разрешить micro selection даже при `baselineConfidence === 'low'` если есть хотя бы 1 тег
- Полагаться на `selectMicro` threshold вместо жесткой блокировки

**Ожидаемый эффект:** Fallback rate снизится с 10.61% до ~5-7%

### 2. Средний: Снизить threshold в `selectMicro` ✅ СРЕДНИЙ ПРИОРИТЕТ

**Текущий threshold:** 0.3

**Рекомендация:**
- Снизить до 0.2 или 0.15 для случаев с weak evidence
- Или использовать динамический threshold на основе baseline confidence

**Ожидаемый эффект:** Fallback rate снизится еще на 2-3%

### 3. Низкий: Улучшить генерацию noisy-mixed ✅ НИЗКИЙ ПРИОРИТЕТ

**Проблема:** 239 случаев с 0-1 тегами (2.39%)

**Рекомендация:**
- Гарантировать минимум 1-2 тега на ответ
- Уменьшить вероятность 0 тегов до <0.1%

**Ожидаемый эффект:** Снижение случаев с weak evidence

---

## 📈 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ ПОСЛЕ ДОПОЛНИТЕЛЬНЫХ ИСПРАВЛЕНИЙ

| Метрика | Текущее | Цель | После исправлений |
|---------|---------|------|-------------------|
| Micro fallback rate | 10.61% | ≤5% | **4-6%** |
| Micro fallback (overloaded) | 14.40% | ≤8% | **6-8%** |
| Micro fallback (exhausted) | 13.79% | ≤8% | **6-8%** |
| Cases with 0-1 tags | 2.39% | <0.5% | **<0.5%** |

---

## 📋 ПРИМЕРЫ ПРОБЛЕМНЫХ КЕЙСОВ (из suspicious cases)

### Case 1: Только context tag → fallback
- **Baseline:** `{valence:1, energy:1, tension:1, clarity:2, control:1, social:2}`
- **Baseline macro:** down
- **Evidence tags:** `sig.context.work.deadline` (только context!)
- **Result:** macro=down, micro=**fallback**, confidence=low
- **Проблема:** Context tags не дают достаточной информации

### Case 2: 0 тегов → fallback
- **Baseline:** `{valence:1, energy:1, tension:2, clarity:1, control:1, social:2}`
- **Baseline macro:** down
- **Evidence tags:** (none)
- **Result:** macro=down, micro=**fallback**, confidence=low
- **Проблема:** Нет тегов вообще

### Case 3: 1 conflicting tag → fallback
- **Baseline:** `{valence:1, energy:1, tension:2, clarity:1, control:6, social:7}`
- **Baseline macro:** exhausted
- **Evidence tags:** `sig.micro.engaged.curious` (conflicting!)
- **Result:** macro=exhausted, micro=**fallback**, confidence=low
- **Проблема:** Conflicting tag из другого macro

---

## ✅ ПОЛОЖИТЕЛЬНЫЕ МОМЕНТЫ

1. **Micro none rate = 0.00%** — полностью устранен micro=null ✅
2. **Micro selected rate = 89.39%** — большинство случаев получают selected micro ✅
3. **Illegal flip rate = 0.00%** — нет семантических нарушений ✅
4. **Weak evidence share = 2.39%** — приемлемо, отражается в needsRefine ✅
5. **OptionalWeights исправлен** — context tags больше не штрафуют ✅

---

## 📁 ФАЙЛЫ

- **JSON:** `scripts/out/deep_balance_noisy_mixed.json`
- **MD:** `scripts/out/deep_balance_noisy_mixed.md`
- **Config:** mode=noisy-mixed, seed=42, runs=10000

---

## 🎯 ВЫВОДЫ

1. **P0 выполнен:** Micro=null полностью устранен через fallback ✅
2. **P1 выполнен:** Скрипт отслеживает fallback вместо null ✅
3. **Основная проблема:** Micro fallback rate 10.61% (цель ≤5%) — превышен в 2.1 раза
4. **Критичные макросы:** `overloaded` (14.40%) и `exhausted` (13.79%)
5. **Решение:** Ослабить `shouldMicroBeNull` + снизить threshold в `selectMicro`

**Статус:** ✅ P0 и P1 реализованы. Требуется дополнительная оптимизация для снижения fallback rate до целевого уровня ≤5%.

---

## 🔄 СЛЕДУЮЩИЕ ШАГИ

1. ✅ P0 и P1 реализованы
2. ⏳ Ослабить `shouldMicroBeNull` для снижения fallback rate
3. ⏳ Снизить threshold в `selectMicro` (опционально)
4. ⏳ Перезапустить noisy-mixed и зафиксировать целевые значения
5. ⏳ Создать `BALANCE_DEEP_GOLDEN_V2.md` с финальными метриками
