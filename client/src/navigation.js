import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme  } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainTabNavigator';
import ResultScreen from './screens/ResultScreen';
import EmotionSummaryScreen from './screens/EmotionSummaryScreen';
import ReflectionFlowScreen from './screens/ReflectionFlowScreen';
import useStore from './store/useStore';
import L3EmotionScreen from './screens/L3EmotionScreen';
import L4DeepenScreen from './screens/L4DeepenScreen';
import L5TinyActionScreen from './screens/L5TinyActionScreen';
import L6SummaryScreen from './screens/L6SummaryScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const theme = useStore(state => state.theme);

  const navigationTheme = theme === 'dark'
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: '#222224',
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: '#FAFAFB',
        },
      };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none', }}>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />

        {/* Экран вне табов */}
        <Stack.Screen name="ReflectionFlow" component={ReflectionFlowScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen
          name="ResultModal"
          component={ResultScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="EmotionSummary" component={EmotionSummaryScreen} />
        <Stack.Screen name="L3Emotion" component={L3EmotionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="L4Deepen" component={L4DeepenScreen} options={{ headerShown: false }} />
        <Stack.Screen name="L5TinyAction" component={L5TinyActionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="L6Summary" component={L6SummaryScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    </NavigationContainer>
  );
}
