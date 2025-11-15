// src/hooks/useBottomSystemBar.js
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

/**
 * Sync Android navigation bar background and icons with screen "Bar" color and theme.
 * On iOS this hook does nothing (no bottom navigation bar).
 */
export function useBottomSystemBar(backgroundColor, isDarkTheme) {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!backgroundColor) return;

    let isCancelled = false;

    async function applyNavBar() {
      try {
        if (isCancelled) return;

        // Set nav bar background color
        await NavigationBar.setBackgroundColorAsync(backgroundColor);

        // Choose icon style (light or dark) based on theme
        await NavigationBar.setButtonStyleAsync(isDarkTheme ? 'light' : 'dark');
      } catch (e) {
        // Fallback: just log, do not crash UI
        console.warn('[useBottomSystemBar] Failed to set nav bar color', e);
      }
    }

    applyNavBar();

    // Optional cleanup: you can restore some default color if needed
    return () => {
      isCancelled = true;
      // Example: restore to system default or app default if you want:
      // NavigationBar.setBackgroundColorAsync('#000000');
    };
  }, [backgroundColor, isDarkTheme]);
}
