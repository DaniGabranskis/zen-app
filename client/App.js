import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar'; // ← добавили
import AppNavigator from './src/navigation';
import useStore from './src/store/useStore';
import { runDevSeedIfAny } from './src/dev/runDevSeed';
import FirstRunConsentModal from './src/components/legal/FirstRunConsentModal';
import { loadConsent } from './src/utils/consent/consentStorage';
import { needsConsent } from './src/utils/consent/consentConfig';

export default function App() {
  const theme = useStore(state => state.theme); // light/dark
  const statusBarStyle = theme === 'dark' ? 'light' : 'dark';
  const backgroundColor = theme === 'dark' ? '#18181B' : '#ffffff';
  const [consent, setConsent] = useState(null);
  const [shouldShowConsent, setShouldShowConsent] = useState(false);

  useEffect(() => {
    runDevSeedIfAny();
  }, []);

  // Load consent on app start
  useEffect(() => {
    let isMounted = true;

    async function checkConsent() {
      try {
        const loadedConsent = await loadConsent();
        if (isMounted) {
          setConsent(loadedConsent);
          setShouldShowConsent(needsConsent(loadedConsent));
        }
      } catch (error) {
        console.warn('[App] Failed to load consent:', error);
        // Fail-safe: show modal if we can't load consent
        if (isMounted) {
          setShouldShowConsent(true);
        }
      }
    }

    checkConsent();

    return () => {
      isMounted = false;
    };
  }, []);

  // NEW: keep Android navigation bar in sync with theme
  useEffect(() => {
    // This controls the bottom system navigation bar
    NavigationBar.setBackgroundColorAsync(backgroundColor).catch(() => {});
    NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark').catch(() => {});
  }, [theme, backgroundColor]);

  const handleConsentAccepted = (newConsent) => {
    setConsent(newConsent);
    setShouldShowConsent(false);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor }}>
        {/* Better to use solid background instead of transparent+translucent */}
        <StatusBar style={statusBarStyle} backgroundColor={backgroundColor} />
        <AppNavigator />
        
        {/* Consent modal overlay - shown on first run or version change */}
        <FirstRunConsentModal
          visible={shouldShowConsent}
          onAccepted={handleConsentAccepted}
        />
      </View>
    </GestureHandlerRootView>
  );
}
