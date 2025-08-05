import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme  } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainTabNavigator';
import ResultScreen from './screens/ResultScreen';
import EmotionSummaryScreen from './screens/EmotionSummaryScreen';
import ReflectionFlowScreen from './screens/ReflectionFlowScreen';
import useStore from './store/useStore';

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
        </Stack.Navigator>
    </NavigationContainer>
  );
}
