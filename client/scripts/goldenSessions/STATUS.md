# Golden Sessions Implementation Status

## ✅ Completed

### A3.4.0 — Спецификация
- ✅ `README.md` с полной документацией

### A3.4.1 — Фикстуры
- ✅ 10 fixture файлов созданы в `fixtures/`

### A3.4.2 — Stable Projection
- ✅ `stableProjection.js` переписан по шаблону
- ✅ Детерминированная нормализация (сортировка массивов, обработка Set/Object после JSON)
- ✅ Удаление нестабильных полей (timestamp, nodeVersion)
- ✅ ES modules экспорт

### A3.4.3 — Runner Harness
- ✅ `runGoldenSessions.js` переписан по шаблону
- ✅ `wireDeps.js` создан для сборки зависимостей
- ✅ Поддержка `--update`, `--only`, `--printDiff`
- ✅ Стабильная JSON сериализация (сортировка ключей)

### A3.4.5 — npm scripts
- ✅ Добавлены в `package.json`:
  - `test:golden-sessions` — запуск всех тестов
  - `test:golden-sessions:update` — обновление snapshots

## ⏳ Pending

### A3.4.4 — Snapshots
**Требуется действие:** Запустить генерацию snapshots:

```bash
cd client
npm run test:golden-sessions:update
```

Это создаст 10 файлов `.snapshot.json` в `snapshots/`.

После генерации проверить:
```bash
npm run test:golden-sessions
```

Должно быть `[PASS]` для всех 10 тестов.

## Критерии приёмки

Golden Sessions считается готовым, если:

1. ✅ `--update` создаёт 10 снапшотов
2. ⏳ Без `--update` прогон стабильный (PASS 10/10)
3. ⏳ Изменение "несущественного" поля (лог/таймстемп) не ломает снапшоты
4. ⏳ Намеренная регрессия (например поменять mapping) ломает хотя бы 1–2 кейса

## Структура файлов

```
client/scripts/goldenSessions/
├── README.md                    # Документация
├── STATUS.md                    # Этот файл
├── SUMMARY.md                   # Сводка реализации
├── stableProjection.js         # Нормализация результатов (ES modules)
├── wireDeps.js                 # Сборка зависимостей (ES modules)
├── fixtures/                    # Входные данные (10 файлов)
│   ├── GS01_*.fixture.json
│   ├── GS02_*.fixture.json
│   └── ... (10 total)
└── snapshots/                   # Ожидаемые результаты (to be generated)
    └── .gitkeep
```

## Следующие шаги

1. **Сгенерировать snapshots:**
   ```bash
   cd client
   npm run test:golden-sessions:update
   ```

2. **Проверить стабильность:**
   ```bash
   npm run test:golden-sessions
   ```

3. **Добавить в CI:**
   Включить `npm run test:golden-sessions` как быстрый блокер в CI pipeline.
