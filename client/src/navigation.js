import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainTabNavigator';
import ReflectionModeChoiceScreen from './screens/ReflectionModeChoiceScreen';
import useStore from './store/useStore';
import L4DeepenScreen from './screens/L4DeepenScreen';
import L5SummaryScreen from './screens/L5SummaryScreen';
import BaselineCheckInScreen from './screens/BaselineCheckInScreen';
import DiagnosticFlowScreen from './screens/DiagnosticFlowScreen';
import NavigationLogger from '../scripts/NavigationLogger';
import SessionTypeChoiceScreen from './screens/SessionTypeChoiceScreen';
import PlansForDayScreen from './screens/PlansForDayScreen';
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
        <Stack.Navigator
          screenOptions={{ headerShown: false, animation: 'none' }}
        >
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />

          {/* Экраны вне табов */}
          <Stack.Screen name="ReflectionFlow" component={ReflectionModeChoiceScreen} />
          <Stack.Screen name="SessionTypeChoice" component={SessionTypeChoiceScreen} />
          <Stack.Screen name="BaselineCheckIn" component={BaselineCheckInScreen} />
          <Stack.Screen name="PlansForDay" component={PlansForDayScreen} />
          <Stack.Screen name="DiagnosticFlow" component={DiagnosticFlowScreen} />
          <Stack.Screen name="L4Deepen" component={L4DeepenScreen} options={{ headerShown: false }} />
          <Stack.Screen name="L5Summary" component={L5SummaryScreen} options={{ headerShown: false }} />
          {/* История: модалка только для просмотра */}
          <Stack.Screen
            name="ResultModal"
            component={HistoryResultModal}
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Session details',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationLogger>
  );
}
