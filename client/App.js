import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation';
import useStore from './src/store/useStore';
import { runDevSeedIfAny } from './src/dev/runDevSeed';

export default function App() {
  const theme = useStore(state => state.theme); // light/dark
  const statusBarStyle = theme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    runDevSeedIfAny();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: theme === 'dark' ? '#18181B' : '#fff' }}>
        <StatusBar style={statusBarStyle} backgroundColor="transparent" translucent />
        <AppNavigator />
      </View>
    </GestureHandlerRootView>
  );
}
