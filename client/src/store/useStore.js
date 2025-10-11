// src/store/useStore.js
// State + actions for the reflection flow with full telemetry logs.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { canonicalizeTags } from '../utils/tagCanon';
import { logEvent } from '../utils/telemetry';

const initialDraft = () => ({
  l1l2Accepted: [],                       // cards accepted from L1-L2
  evidenceTags: [],                       // canonical tags from accepted cards
  decision: null,                         // { mode, top, probs }
  l3: { emotionKey: null },               // dominant emotion (auto-picked)
  l4: { triggers: [], bodyMind: [], intensity: 0 },
  l5: { context: '', tinyActionKey: null },
  l6: { insight: '', tips: [], encouragement: '', accuracy: 3 },
});

const useStore = create(
  persist(
    (set, get) => ({
      // -------- Core state
      history: [],            // saved sessions (latest first)
      aiOnline: false,        // ping status for AI backend
      hasHydrated: false,     // set true after rehydrate callback

      // -------- Draft state for current multi-layer run
      sessionDraft: initialDraft(),

      // -------- Actions (with telemetry) --------

      addHistory: (entry) => {
        set((state) => {
          const next = [entry, ...state.history].slice(0, 500);
          logEvent('store_history_add', { id: entry?.id, createdAt: entry?.createdAt, size: next.length },
            `Store: history +1 (total=${next.length})`);
          return { history: next };
        });
      },

      clearHistory: () => {
        logEvent('store_history_clear', {}, 'Store: history cleared');
        set({ history: [] });
      },

      setAiOnline: (value) => {
        logEvent('store_ai_online', { value }, `Store: aiOnline=${value}`);
        set({ aiOnline: !!value });
      },

      // -------- L1-L2 ingestion

      appendAccepted(card) {
        // card: { id, selectedKey, selectedLabel, selectedTags[] }
        const draft = get().sessionDraft;
        const arr = Array.isArray(draft.l1l2Accepted) ? draft.l1l2Accepted.slice() : [];
        const safe = {
          id: String(card?.id || ''),
          selectedKey: String(card?.selectedKey || ''),
          selectedLabel: String(card?.selectedLabel || ''),
          selectedTags: Array.isArray(card?.selectedTags) ? card.selectedTags : [],
        };
        arr.push(safe);
        logEvent(
          'store_l1l2_append',
          { id: safe.id, selectedKey: safe.selectedKey, selectedLabel: safe.selectedLabel, tags: safe.selectedTags, count: arr.length },
          `Store: L1/L2 accepted "${safe.id}" -> "${safe.selectedLabel}" (tags=${safe.selectedTags.length}, count=${arr.length})`
        );
        set({ sessionDraft: { ...draft, l1l2Accepted: arr } });
      },

      rebuildEvidence() {
        const { sessionDraft } = get();
        const raw = [];
        for (const c of (sessionDraft.l1l2Accepted || [])) {
          const tags = Array.isArray(c?.selectedTags) ? c.selectedTags : [];
          for (const t of tags) raw.push(t);
        }
        const clean = canonicalizeTags(raw || []);
        logEvent(
          'store_evidence_rebuild',
          { rawCount: raw.length, cleanCount: clean.length, clean },
          `Store: evidence rebuilt (${raw.length} → ${clean.length})`
        );
        set({ sessionDraft: { ...sessionDraft, evidenceTags: clean } });
      },

      setDecision(decision) {
        // decision: { mode, top, probs }
        logEvent(
          'store_decision',
          {
            mode: decision?.mode,
            top: decision?.top,
            p1: decision?.probs?.[decision?.top?.[0]] ?? null,
            p2: decision?.probs?.[decision?.top?.[1]] ?? null,
          },
          `Store: decision set (mode=${decision?.mode}, dom=${decision?.top?.[0] || '-'})`
        );
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, decision } });
      },

      // -------- L3

      pickEmotion(key) {
        logEvent('store_pick_emotion', { key }, `Store: emotion=${key}`);
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l3: { emotionKey: key } } });
      },

      // -------- L4

      setL4Triggers(list) {
        logEvent('store_l4_triggers', { list }, `Store: L4 triggers (${list.length})`);
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l4: { ...draft.l4, triggers: list } } });
      },

      setL4BodyMind(list) {
        logEvent('store_l4_bodymind', { list }, `Store: L4 bodyMind (${list.length})`);
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l4: { ...draft.l4, bodyMind: list } } });
      },

      setL4Intensity(value) {
        const v = Math.max(0, Math.min(10, Number(value) || 0));
        logEvent('store_l4_intensity', { value: v }, `Store: L4 intensity=${v}`);
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l4: { ...draft.l4, intensity: v } } });
      },

      // -------- L5

      setL5Context(text) {
        const val = String(text || '');
        logEvent('store_l5_context', { len: val.length }, `Store: L5 context len=${val.length}`);
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l5: { ...draft.l5, context: val } } });
      },

      setL5TinyAction(key) {
        logEvent('store_l5_action', { key }, `Store: L5 action="${key}"`);
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l5: { ...draft.l5, tinyActionKey: key } } });
      },

      // -------- L6

      setL6AiPayload({ insight, tips, encouragement }) {
        const payload = {
          insight: String(insight || ''),
          tips: Array.isArray(tips) ? tips : [],
          encouragement: String(encouragement || ''),
        };
        logEvent('store_l6_ai', payload, 'Store: L6 AI payload set');
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l6: { ...draft.l6, ...payload } } });
      },

      setL6Accuracy(v) {
        const acc = Math.max(1, Math.min(5, Number(v) || 3));
        logEvent('store_l6_accuracy', { accuracy: acc }, `Store: L6 accuracy=${acc}`);
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l6: { ...draft.l6, accuracy: acc } } });
      },

      // -------- Persist & reset

      finalizeAndSave() {
        const { sessionDraft, history } = get();
        const entry = {
          id: Date.now(),
          createdAt: new Date().toISOString(),
          ...sessionDraft,
        };
        const next = [entry, ...history].slice(0, 500);
        logEvent(
          'store_finalize',
          { id: entry.id, createdAt: entry.createdAt, history: next.length },
          `Store: session saved (history=${next.length})`
        );
        set({ history: next });
        get().resetSession();
      },

      resetSession() {
        logEvent('store_reset_session', {}, 'Store: sessionDraft reset');
        set({ sessionDraft: initialDraft() });
      },
    }),
    {
      name: 'zen-store',
      storage: createJSONStorage(() => {
        if (!AsyncStorage) {
          console.warn('[store] AsyncStorage is not available, using in-memory storage');
          if (!global.__ZEN_MEM__) global.__ZEN_MEM__ = {};
          return {
            getItem: async (k) => {
              console.log('[store] mem.get', k);
              return global.__ZEN_MEM__[k] ?? null;
            },
            setItem: async (k, v) => {
              console.log('[store] mem.set', k);
              global.__ZEN_MEM__[k] = v;
            },
            removeItem: async (k) => {
              console.log('[store] mem.remove', k);
              delete global.__ZEN_MEM__[k];
            },
          };
        }
        console.log('[store] using AsyncStorage');
        return AsyncStorage;
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[store] rehydrate error:', error);
          logEvent('store_rehydrate_error', { error: String(error) }, 'Store: rehydrate error');
        } else {
          console.log('[store] rehydrated OK');
          logEvent('store_rehydrated', {}, 'Store: rehydrated OK');
          // mark flag so UI/components can wait for hydration if needed
          useStore.setState({ hasHydrated: true });
        }
      },
    }
  )
);

// ---- One-time post-rehydrate migration (safety) ----
try {
  const { history } = useStore.getState();
  if (Array.isArray(history) && history.length > 0) {
    const migrated = history.map((day) => {
      const answers = Array.isArray(day?.answers)
        ? day.answers.map((a) => {
            const rawTags = a?.canonicalTags ?? a?.rawTags ?? a?.tags ?? [];
            return { ...a, canonicalTags: canonicalizeTags(rawTags) };
          })
        : day?.answers;
      return { ...day, answers };
    });
    const same = JSON.stringify(history) === JSON.stringify(migrated);
    if (!same) {
      useStore.setState({ history: migrated });
      console.log('🧭 Migrated history to canonical tags (post-rehydrate).');
      logEvent('store_migration', { changed: true }, 'Store: migrated history → canonical tags');
    }
  }
} catch (e) {
  console.warn('[MIGRATION] post-rehydrate failed:', e?.message);
  logEvent('store_migration_fail', { reason: String(e?.message || e) }, 'Store: migration failed');
}

export default useStore;
