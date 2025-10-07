import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';
import { canonicalizeTags } from '../utils/tagCanon';

/**
 * Zustand global store for all major app state:
 * - Reflection history
 * - Current theme
 * - AI-generated text
 * - Emotion group info
 * - State for "why" chain, answers, selected group, loading, etc.
 * Store is persisted to AsyncStorage (local device storage).
 */
const useStore = create(
  persist(
    (set, get) => ({
      history: [], // All days (array of day objects)
      setWhyAnswers: (answers) => set({ whyAnswers: answers }),

      generatedText: '',    // Last AI-generated reflection result
      setGeneratedText: (text) => set({ generatedText: text }),

      emotionInfo: null,    // Meta about the last emotion group (color, label, etc)
      setEmotionInfo: (info) => set({ emotionInfo: info }),

      selectedGroup: '',    // Current group for adaptive question chain
      setSelectedGroup: (group) => set({ selectedGroup: group }),

      isGenerating: false,  // For showing AI loader spinner
      setIsGenerating: (value) => set({ isGenerating: value }),

      setPrimaryEmotion: (emotion) => set({ primaryEmotion: emotion }),
      setWhyChain: (chain) => set({ whyChain: chain }),
      emotion: null,
      setEmotion: (emotion) => set({ emotion }),

      // Theme controls
      theme: 'light',
      setTheme: async (theme) => {
        set({ theme });
        await AsyncStorage.setItem('theme', theme);
      },

      rehydrateTheme: async () => {
        const theme = await AsyncStorage.getItem('theme');
        if (theme) set({ theme });
      },

      // Add new reflection day (object) to history
      addDay: (day) => {
        // Canonicalize tags in answers before persisting
        const safeDay = {
          ...day,
          answers: Array.isArray(day?.answers)
            ? day.answers.map((a) => ({
                ...a,
                tags: canonicalizeTags(a?.tags || []),
                emotionTags: canonicalizeTags(a?.emotionTags || a?.tags || []),
              }))
            : day?.answers,
        };

        const updated = [...get().history, safeDay];
        console.log('💾 Persisted history:', updated);
        set({ history: updated });
      },

      // Clears all reflection history
      resetHistory: () => set({ history: [] }),
    }),
    {
      name: 'zen-storage',  // Storage key
      storage: createJSONStorage(() => AsyncStorage),
      // Only these fields are persisted
      partialize: (state) => ({
        history: state.history,
        primaryEmotion: state.primaryEmotion,
        whyChain: state.whyChain,
        whyAnswers: state.whyAnswers,
        generatedText: state.generatedText,
        theme: state.theme,
      }),
      // Log hydration event on boot
      onRehydrateStorage: (persistedState) => (set, get) => {
        console.log('✅ Zustand rehydrated!');

        // One-time migration: canonicalize tags in persisted history
        try {
          const hist = Array.isArray(get().history) ? get().history : [];
          const migrated = hist.map((day) => {
            const answers = Array.isArray(day?.answers)
              ? day.answers.map((a) => ({
                  ...a,
                  // Ensure consistent tag vocabulary
                  tags: canonicalizeTags(a?.tags || []),
                  emotionTags: canonicalizeTags(a?.emotionTags || a?.tags || []),
                }))
              : day?.answers;

            return { ...day, answers };
          });

          // Update only if actually changed
          const strA = JSON.stringify(hist);
          const strB = JSON.stringify(migrated);
          if (strA !== strB) {
            set({ history: migrated });
            console.log('🧭 Migrated history to canonical tags.');
          }
        } catch (e) {
          console.warn('[MIGRATION] tag canon failed:', e?.message);
        }

        set({ hasHydrated: true });
      },

    }
  )
);

export default useStore;
