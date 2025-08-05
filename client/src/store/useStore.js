import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

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
        const updated = [...get().history, day];
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
      onRehydrateStorage: (persistedState) => (set) => {
      console.log('✅ Zustand rehydrated!');
      set({ hasHydrated: true });
      },
    }
  )
);

export default useStore;
