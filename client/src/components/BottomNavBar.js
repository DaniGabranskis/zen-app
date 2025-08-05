import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';

/**
 * BottomNavBar — persistent navigation bar for 4 main screens.
 * Highlights the active tab, uses theme, and triggers navigation.
 * Props:
 *   - navigation: React Navigation prop
 *   - active: current screen name (string)
 */
export default function BottomNavBar({ navigation, active }) {
  // Theme colors for the nav bar and icons
  const { navBar, navBorder, navText, navActive } = useThemeVars();
  const theme = useStore(state => state.theme);
  console.log('theme:', theme, 'navBar:', navBar);

  // Define available tabs and icons
  const tabs = [
    { name: 'Home', icon: 'home-outline' },
    { name: 'History', icon: 'calendar-outline' },
    { name: 'Stats', icon: 'stats-chart-outline' },
    { name: 'Settings', icon: 'settings-outline' },
  ];

  return (
    <View style={{ backgroundColor: navBar }}>
    <View style={[styles.wrapper, { backgroundColor: navBar, borderColor: navBorder }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.tab}
          onPress={() => navigation.navigate(tab.name)}
        >
          {/* Icon */}
          <Ionicons
            name={tab.icon}
            size={22}
            color={active === tab.name ? navActive : navText}
          />
          {/* Label */}
          <Text style={[
          styles.label,
          { color: active === tab.name ? navActive : navText }
        ]}>
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 7,
    borderTopWidth: 1,
    width: '100%',
  },
  tab: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: '600',
  },
});
