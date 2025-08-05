import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation';
import useStore from './src/store/useStore';

export default function App() {
  const theme = useStore(state => state.theme); // light/dark
  const statusBarStyle = theme === 'dark' ? 'light' : 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Корневой View с фоном по теме */}
      <View style={{ flex: 1, backgroundColor: theme === 'dark' ? '#18181B' : '#fff' }}>
        <StatusBar style={statusBarStyle} backgroundColor="transparent" translucent />
        <AppNavigator />
      </View>
    </GestureHandlerRootView>
  );
}
