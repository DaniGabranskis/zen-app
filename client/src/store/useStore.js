// src/store/useStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { canonicalizeTags } from '../utils/tagCanon';

// --- Store definition ---
const useStore = create(
  persist(
    (set, get) => ({
      // --- Core state ---
      history: [],            // list of reflection sessions
      aiOnline: false,        // true if AI reachable at startup
      hasHydrated: false,     // indicates Zustand rehydration complete

      // --- Session draft for multi-layer flow ---
      sessionDraft: {
        l1l2Accepted: [],     // cards accepted from L1-L2 (array of cards with selectedOption)
        evidenceTags: [],     // canonical tags accumulated from accepted cards (and probes)
        decision: null,       // { mode: 'single'|'mix'|'probe', top: [...], probs: {...} }
        l3: { emotionKey: null }, // chosen or routed dominant emotion (string from emotions20)
        l4: { triggers: [], bodyMind: [], intensity: 0 }, // deepen layer
        l5: { context: '', tinyActionKey: null }, // tiny action selection
        l6: { insight: '', tips: [], encouragement: '', accuracy: 3 }, // AI + user accuracy
      },
      isGenerating: false,    // already есть у вас в ResultScreen — на всякий случай
      aiInsight: '',          // keep for UI binding
      advice: '',             // keep for UI binding
      keyEmotions: [],        // presentation fields (optional)
      keyTopics: [],          // presentation fields (optional)

      // --- Actions ---

      addHistory: (entry) => {
        set((state) => ({
          history: [...state.history, entry],
        }));
      },

      clearHistory: () => {
        set({ history: [] });
      },

      setAiOnline: (value) => {
        set({ aiOnline: value });
      },

            // --- L1-L2 ingestion ---
      appendAccepted(card) {
        // card: { id, title, type, options[], selectedOption }
        const draft = get().sessionDraft;
        const arr = Array.isArray(draft.l1l2Accepted) ? draft.l1l2Accepted.slice() : [];
        arr.push(card);
        set({ sessionDraft: { ...draft, l1l2Accepted: arr } });
      },

      rebuildEvidence() {
        // Turn accepted cards into canonical tags
        const { sessionDraft } = get();
        const canonical = [];
        for (const c of (sessionDraft.l1l2Accepted || [])) {
          const opt = c.options?.[c.selectedOption];
          const tags = Array.isArray(opt) ? opt : (opt?.tags || []);
          for (const t of tags) canonical.push(t);
        }
        // use canonicalizeTags to dedupe + map aliases
        const clean = canonicalizeTags(canonical || []);
        set({ sessionDraft: { ...sessionDraft, evidenceTags: clean } });
      },

      setDecision(decision) {
        // decision: { mode, top, probs }
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, decision } });
      },

      // --- L3 ---
      pickEmotion(key) {
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l3: { emotionKey: key } } });
      },

      // --- L4 ---
      setL4Triggers(list) {
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l4: { ...draft.l4, triggers: list } } });
      },
      setL4BodyMind(list) {
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l4: { ...draft.l4, bodyMind: list } } });
      },
      setL4Intensity(value) {
        const draft = get().sessionDraft;
        const v = Math.max(0, Math.min(10, Number(value) || 0));
        set({ sessionDraft: { ...draft, l4: { ...draft.l4, intensity: v } } });
      },

      // --- L5 ---
      setL5Context(text) {
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l5: { ...draft.l5, context: String(text || '') } } });
      },
      setL5TinyAction(key) {
        const draft = get().sessionDraft;
        set({ sessionDraft: { ...draft, l5: { ...draft.l5, tinyActionKey: key } } });
      },

      // --- L6 ---
      setL6AiPayload({ insight, tips, encouragement }) {
        const draft = get().sessionDraft;
        set({
          sessionDraft: { 
            ...draft, 
            l6: { 
              ...draft.l6, 
              insight: String(insight || ''), 
              tips: Array.isArray(tips) ? tips : [], 
              encouragement: String(encouragement || '') 
            } 
          }
        });
      },
      setL6Accuracy(v) {
        const draft = get().sessionDraft;
        const acc = Math.max(1, Math.min(5, Number(v) || 3));
        set({ sessionDraft: { ...draft, l6: { ...draft.l6, accuracy: acc } } });
      },

      // --- Persist & reset ---
      finalizeAndSave() {
        const { sessionDraft, history } = get();
        const entry = {
          id: Date.now(),
          createdAt: new Date().toISOString(),
          ...sessionDraft,
        };
        set({ history: [entry, ...history].slice(0, 500) }); // cap history length if needed
        get().resetSession();
      },
      resetSession() {
        set({
          sessionDraft: {
            l1l2Accepted: [],
            evidenceTags: [],
            decision: null,
            l3: { emotionKey: null },
            l4: { triggers: [], bodyMind: [], intensity: 0 },
            l5: { context: '', tinyActionKey: null },
            l6: { insight: '', tips: [], encouragement: '', accuracy: 3 },
          },
        });
      },
          }),
          {
            name: 'zen-store',
            version: 2,

            // Rehydration handler (only logs now)
            onRehydrateStorage: () => (state, error) => {
              if (error) {
                console.warn('⚠ Zustand rehydrate failed:', error);
              } else {
                console.log('✅ Zustand rehydrated!');
              }
            },
          }
        )
      );

      // --- One-time post-rehydrate migration ---
      // Safely canonicalizes tags in history, only if needed
      try {
        const { history } = useStore.getState();
        if (Array.isArray(history) && history.length > 0) {
          const migrated = history.map((day) => {
            const answers = Array.isArray(day?.answers)
              ? day.answers.map((a) => {
                  const rawTags =
                    a?.canonicalTags ?? a?.rawTags ?? a?.tags ?? [];
                  return {
                    ...a,
                    canonicalTags: canonicalizeTags(rawTags),
                  };
                })
              : day?.answers;
            return { ...day, answers };
          });

    const same =
      JSON.stringify(history) === JSON.stringify(migrated);

    if (!same) {
      useStore.setState({ history: migrated });
      console.log('🧭 Migrated history to canonical tags (post-rehydrate).');
    }
  }
} catch (e) {
  console.warn('[MIGRATION] post-rehydrate failed:', e?.message);
}

// --- Export store hook ---
export default useStore;
