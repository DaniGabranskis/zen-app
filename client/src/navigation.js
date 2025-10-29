import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme  } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainTabNavigator';
import ReflectionFlowScreen from './screens/ReflectionFlowScreen';
import useStore from './store/useStore';
import L4DeepenScreen from './screens/L4DeepenScreen';
import L5SummaryScreen from './screens/L5SummaryScreen';
import L6ActionsScreen from './screens/L6ActionsScreen';
import ExercisePlaceholder from './screens/ExercisePlaceholder';
import NavigationLogger from '../scripts/NavigationLogger';
import HistoryResultModal from './screens/HistoryResultModal';

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
    <NavigationLogger>
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none', }}>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />

        {/* Экран вне табов */}
        <Stack.Screen name="ReflectionFlow" component={ReflectionFlowScreen} />
        <Stack.Screen name="L4Deepen" component={L4DeepenScreen} options={{ headerShown: false }} />
        <Stack.Screen name="L5Summary" component={L5SummaryScreen} options={{ headerShown: false }} />
        <Stack.Screen name="L6Actions" component={L6ActionsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ExercisePlaceholder" component={ExercisePlaceholder} options={{ headerShown: false }} />
        <Stack.Screen name="ResultModal" component={L5SummaryScreen} options={{ presentation: 'modal', headerShown: true, title: 'Session details' }} />
        </Stack.Navigator>
    </NavigationContainer>
    </NavigationLogger>
  );
}
