import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';
import StatsScreen from './screens/StatsScreen';
import SettingsScreen from './screens/SettingsScreen';
import { Ionicons } from '@expo/vector-icons';
import useStore from './store/useStore';
import { themes } from './utils/theme';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const theme = useStore(state => state.theme);
  const navBarColor = themes[theme]?.navBar || '#fff';

  const tabBarButton = (props) => (
      <TouchableOpacity
    {...props}
    activeOpacity={1}
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    {props.children}
  </TouchableOpacity>
);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarButton,
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home-outline';
          if (route.name === 'History') iconName = 'calendar-outline';
          if (route.name === 'Stats') iconName = 'stats-chart-outline';
          if (route.name === 'Settings') iconName = 'settings-outline';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: navBarColor },
        tabBarLabelStyle: { fontSize: 12 },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
