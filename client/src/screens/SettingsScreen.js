import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';
import ScreenWrapper from '../components/ScreenWrapper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const P = Math.round(SCREEN_WIDTH * 0.05);
const P_SMALL = Math.round(SCREEN_WIDTH * 0.02);
const P_LARGE = Math.round(SCREEN_WIDTH * 0.08);
const PAD = Math.round(SCREEN_WIDTH * 0.045);
const PAD_SMALL = Math.round(SCREEN_WIDTH * 0.02);

/**
 * SettingsScreen — app settings and options.
 * Allows changing theme, clearing all history, and some stubs for future features.
 */
export default function SettingsScreen() {
  // Theme colors for this screen
  const { bgcolor, textMain, divider } = useThemeVars();

  // Store methods: reset history, current theme, and theme setter
  const reset = useStore((state) => state.resetHistory);
  const theme = useStore(state => state.theme);
  const setTheme = useStore(state => state.setTheme);

  // Switches app theme between light and dark
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // Shows alert confirmation before clearing all data
  const confirmReset = () => {
    Alert.alert(
      'Clear all history',
      'This will delete all your reflections permanently. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: reset },
      ]
    );
  };

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: bgcolor }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: textMain }]}>Settings</Text>
        <View style={[styles.divider, { backgroundColor: divider }]} />
      </View>
      <View style={styles.content}>
         {/* Switch between Light and Dark theme */}
        <TouchableOpacity
          style={[styles.option, { borderTopWidth: 1, borderTopColor: '#eee' }]}
          onPress={toggleTheme}
        >
          <Text style={styles.optionText}>
            Theme: {theme === 'light' ? 'Light' : 'Dark'}
          </Text>
        </TouchableOpacity>
        {/* Notifications option (disabled for now) */}
        <TouchableOpacity style={styles.option} disabled>
          <Text style={[styles.optionText, { color: '#bbb' }]}>Notifications (coming soon)</Text>
        </TouchableOpacity>
        {/* Privacy Policy stub (no action yet) */}
        <TouchableOpacity style={styles.option} onPress={() => {/* TODO: Show privacy policy */}}>
          <Text style={styles.optionText}>Privacy Policy</Text>
        </TouchableOpacity>
        {/* Feedback stub (no action yet) */}
        <TouchableOpacity style={styles.option} onPress={() => {/* TODO: Send feedback */}}>
          <Text style={styles.optionText}>Send Feedback</Text>
        </TouchableOpacity>
        {/* Upgrade to Pro stub (disabled for now) */}
        <TouchableOpacity style={styles.option} disabled>
          <Text style={[styles.optionText, { color: '#bbb' }]}>Upgrade to Pro (coming soon)</Text>
        </TouchableOpacity>
        {/* Divider and version number */}
        <View style={styles.divider} />
        <Text style={styles.version}>
          Version 1.0.0
        </Text>
        {/* Button to clear all history, with confirmation */}
        <TouchableOpacity style={styles.clearButton} onPress={confirmReset}>
          <Text style={styles.clearText}>🗑 Clear reflection history</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

// ======= АДАПТИВНЫЕ СТИЛИ =======
const styles = StyleSheet.create({
  container: {
    minHeight: '100%',
    flex: 1,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: P_LARGE,
    marginTop: P_LARGE,
  },
  title: {
    fontSize: Math.round(SCREEN_WIDTH * 0.08),
    fontWeight: '800',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: P,
  },
  divider: {
    height: 1.5,
    width: Math.round(SCREEN_WIDTH * 0.5),
    alignSelf: 'center',
    opacity: 0.15,
    marginBottom: P_LARGE,
    borderRadius: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    paddingHorizontal: P_LARGE,
    paddingBottom: P_LARGE,
  },
  option: {
    paddingVertical: Math.round(SCREEN_WIDTH * 0.048),
    borderBottomWidth: 1,
    borderColor: '#eee',
    minHeight: Math.round(SCREEN_WIDTH * 0.12),
    justifyContent: 'center',
  },
  optionText: {
    fontSize: Math.round(SCREEN_WIDTH * 0.042),
    color: '#333',
  },
  clearButton: {
    marginTop: P_LARGE,
    padding: Math.round(SCREEN_WIDTH * 0.04),
    backgroundColor: '#FFEBEE',
    borderRadius: Math.round(SCREEN_WIDTH * 0.03),
    alignItems: 'center',
  },
  clearText: {
    color: '#C62828',
    fontWeight: '700',
    fontSize: Math.round(SCREEN_WIDTH * 0.045),
  },
  version: {
    color: '#aaa',
    fontSize: Math.round(SCREEN_WIDTH * 0.037),
    textAlign: 'center',
    marginTop: Math.round(P_LARGE * 0.7),
    marginBottom: 6,
    letterSpacing: 0.2,
  },
});
