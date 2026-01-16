# Анализ: Влияние PlansForDayScreen.js на состояние пользователя

## Краткий ответ: НЕ влияет напрямую

**PlansForDayScreen.js НЕ влияет на финальное состояние (stateKey)**, которое получает пользователь.

## Детальное объяснение

### 1. Что делает PlansForDayScreen.js

```javascript
// Строки 50-54: Сохранение данных в store
const focusTags = useStore((s) => s.sessionDraft?.plans?.focusTags) || [];
const intensity = useStore((s) => s.sessionDraft?.plans?.intensity) || 'med';

const toggleFocusTag = useStore((s) => s.togglePlanFocusTag);
const setIntensity = useStore((s) => s.setPlanIntensity);
```

Экран **только сохраняет**:
- `focusTags`: массив тегов фокуса дня (work, social, health, rest, admin, learning)
- `intensity`: интенсивность дня (low, med, high)

### 2. Куда эти данные идут

**Используются в `diagnosticPlanner.js`:**

```javascript
// diagnosticPlanner.js, строки 45-54
function pickPlanQuestion(focusTags) {
  const tags = focusTags || [];
  if (tags.includes('plan_focus_work')) return 'L2_focus';
  if (tags.includes('plan_focus_social')) return 'L2_social_pain';
  if (tags.includes('plan_focus_health')) return 'L2_regulation';
  if (tags.includes('plan_focus_rest')) return 'L2_numb';
  if (tags.includes('plan_focus_admin')) return 'L2_uncertainty';
  if (tags.includes('plan_focus_learning')) return 'L2_meaning';
  return null;
}
```

**Влияние:**
- `focusTags` влияют на **какие диагностические вопросы будут заданы** (L1/L2 карты)
- НО они НЕ влияют на **финальное состояние**

### 3. Как определяется состояние

**Для Simplified режима (Morning):**
```javascript
// PlansForDayScreen.js, строки 63-67
if (flowMode === 'simplified' && sessionType === 'morning') {
  navigation.dispatch(StackActions.replace('L5Summary', { mode: 'simplified' }));
  return; // Сразу переходит к L5Summary, пропуская диагностику
}
```

**Состояние определяется только baseline метриками:**
1. BaselineCheckInScreen → `routeStateFromBaseline(sanitized)` → состояние из 6 метрик
2. PlansForDayScreen → переход к L5Summary (состояние уже определено)

**Для Simplified режима (Evening):**
1. BaselineCheckInScreen → состояние из baseline
2. PlansForDayScreen → переход к DiagnosticFlow
3. DiagnosticFlow → 1-2 вопроса (влияют на состояние через `mergeBaselineAndEvidence`)
4. L5Summary → финальное состояние (baseline + evidence от вопросов)

**В этом случае:**
- `focusTags` влияют на **какие вопросы будут заданы** (через `diagnosticPlanner.js`)
- Ответы на эти вопросы **влияют на состояние** через `mergeBaselineAndEvidence`
- Но сами `focusTags` напрямую НЕ влияют на состояние

### 4. Вывод

**PlansForDayScreen влияет на состояние косвенно:**

✅ **Влияет:**
- Для Evening Simplified: выбор `focusTags` влияет на какие вопросы будут заданы
- Ответы на эти вопросы влияют на финальное состояние (через `mergeBaselineAndEvidence`)

❌ **НЕ влияет:**
- Для Morning Simplified: экран вообще пропускает диагностику, состояние определено только baseline
- `focusTags` и `intensity` не используются в расчете состояния напрямую
- Они используются только для планирования вопросов в `diagnosticPlanner.js`

### 5. Пример потока

**Morning Simplified:**
```
BaselineCheckInScreen (6 метрик) 
  → routeStateFromBaseline() 
  → stateKey = "balanced" (например)
  
PlansForDayScreen (выбор focus/intensity) 
  → НЕ влияет на состояние
  
L5Summary 
  → показывает stateKey = "balanced"
```

**Evening Simplified:**
```
BaselineCheckInScreen (6 метрик)
  → routeStateFromBaseline()
  → промежуточное состояние = "low" (например)
  
PlansForDayScreen (focusTags = ["work", "health"])
  → влияет на выбор вопросов: L2_focus, L2_regulation
  
DiagnosticFlow (2 вопроса)
  → ответы генерируют теги → buildStateFromTags()
  → mergeBaselineAndEvidence(baseline, evidence, 0.25)
  → финальное состояние = "down" (например)
  
L5Summary
  → показывает stateKey = "down"
```

**Вывод:** В Evening Simplified режиме `focusTags` влияют на состояние **косвенно** через выбор вопросов, но не напрямую.
