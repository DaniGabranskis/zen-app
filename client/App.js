import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar'; // ← добавили
import AppNavigator from './src/navigation';
import useStore from './src/store/useStore';
import { runDevSeedIfAny } from './src/dev/runDevSeed';

export default function App() {
  const theme = useStore(state => state.theme); // light/dark
  const statusBarStyle = theme === 'dark' ? 'light' : 'dark';
  const backgroundColor = theme === 'dark' ? '#18181B' : '#ffffff';

  useEffect(() => {
    runDevSeedIfAny();
  }, []);

  // NEW: keep Android navigation bar in sync with theme
  useEffect(() => {
    // This controls the bottom system navigation bar
    NavigationBar.setBackgroundColorAsync(backgroundColor).catch(() => {});
    NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark').catch(() => {});
  }, [theme, backgroundColor]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor }}>
        {/* Better to use solid background instead of transparent+translucent */}
        <StatusBar style={statusBarStyle} backgroundColor={backgroundColor} />
        <AppNavigator />
      </View>
    </GestureHandlerRootView>
  );
}
