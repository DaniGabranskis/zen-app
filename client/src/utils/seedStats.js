// src/utils/seedStats.js
// Helpers to seed realistic History entries for Stats testing.
// No business logic is changed; we only push valid entries into store.history.

import useStore from '../store/useStore';

// Canonical emotion groups used by the app (keep in sync with your meta)
const POSITIVE = ['Joy', 'Gratitude', 'Calm', 'Clarity'];
const NEGATIVE = ['Anxious', 'Anger', 'Frustration', 'Sadness', 'Overload', 'Confusion', 'Disconnected'];

// pick a random item
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// clamp helper
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// build a realistic sessionDraft snapshot that matches your store shape
function makeDraft({ emotionKey, intensity, accuracy, tags = [] }) {
  return {
    l1l2Accepted: [
      {
        id: String(Math.floor(Math.random() * 1e6)),
        selectedKey: emotionKey,
        selectedLabel: emotionKey,
        selectedTags: tags, // tags will be canonicalized by your pipeline later if needed
      },
    ],
    evidenceTags: tags.slice(),
    decision: {
      mode: 'auto',
      top: [emotionKey, pick([...POSITIVE, ...NEGATIVE].filter((e) => e !== emotionKey))],
      probs: {
        [emotionKey]: 0.62 + Math.random() * 0.25,
      },
    },
    l3: { emotionKey },
    l4: { triggers: [], bodyMind: [], intensity: clamp(intensity, 0, 10) },
    l5: { context: '', tinyActionKey: null, miniInsight: '', shortDescription: '' },
    l6: { insight: '', tips: [], encouragement: '', accuracy: clamp(accuracy, 1, 5) },
  };
}

// convert a draft to a history entry compatible with Stats/History expectations
function makeEntryFromDraft(draft, dateISO, opts = {}) {
  // Score formula mirrors finishSession’s approach in your store
  const intensity = Number(draft?.l4?.intensity ?? 0); // 0..10
  const acc = Number(draft?.l6?.accuracy ?? 3);        // 1..5
  const score = Math.round(clamp(80 - intensity * 6 + (acc - 3) * 8, 0, 100));

  const dominantGroup =
    draft?.decision?.top?.[0] ||
    draft?.l3?.emotionKey ||
    'unknown';

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    date: dateISO,         // <-- Stats/History read this field
    createdAt: dateISO,
    score,
    dominantGroup,
    reflection: '—',
    recommendation: {
      title: null,
      detail: null,
      skipped: !!opts.skip,
    },
    session: { ...draft }, // keep full snapshot for future evolution
  };
}

// public: seed quick dataset across last N days with mixed polarity
export function seedHistoryQuick({
  days = 35,             // how many days back
  perDay = [0, 3],       // min..max entries per day
  positiveBias = 0.55,   // probability of recording a positive emotion
} = {}) {
  const addHistory = useStore.getState().addHistory;
  if (typeof addHistory !== 'function') {
    console.warn('[seed] addHistory() is not available');
    return;
  }

  const now = new Date();
  // iterate from oldest to newest so the resulting history order (latest first) still looks natural
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const count = Math.floor(perDay[0] + Math.random() * (perDay[1] - perDay[0] + 1));

    for (let j = 0; j < count; j++) {
      const isPos = Math.random() < positiveBias;
      const group = isPos ? pick(POSITIVE) : pick(NEGATIVE);

      // intensity: negatives trend higher, positives lower (feels real)
      const intensity = isPos ? Math.round(2 + Math.random() * 5) : Math.round(4 + Math.random() * 6);
      const accuracy  = Math.round(2 + Math.random() * 3); // 2..5

      const draft = makeDraft({
        emotionKey: group,
        intensity,
        accuracy,
        tags: [], // you can pass synthetic tags here if you want to test tag pipelines
      });

      // jitter within the day (spread entries)
      const stamp = new Date(d);
      stamp.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

      const entry = makeEntryFromDraft(draft, stamp.toISOString());
      addHistory(entry);
    }
  }

  console.log('[seed] Done. History size =', useStore.getState().history?.length);
}

// public: deterministic custom seeding (exact control)
// example call:
// seedHistoryCustom([
//   { date: '2025-10-01', emotion: 'Joy', intensity: 3, accuracy: 4 },
//   { date: '2025-10-01', emotion: 'Anxious', intensity: 7, accuracy: 3 },
// ]);
export function seedHistoryCustom(rows = []) {
  const addHistory = useStore.getState().addHistory;
  if (typeof addHistory !== 'function') return;

  rows.forEach((row) => {
    const day = new Date(row.date);
    const draft = makeDraft({
      emotionKey: row.emotion,
      intensity: Number(row.intensity ?? 5),
      accuracy: Number(row.accuracy ?? 3),
      tags: Array.isArray(row.tags) ? row.tags : [],
    });
    const entry = makeEntryFromDraft(draft, day.toISOString());
    addHistory(entry);
  });

  console.log('[seed] Custom rows added:', rows.length);
}
