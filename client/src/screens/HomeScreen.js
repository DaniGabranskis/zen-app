import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useStore from '../store/useStore';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';

// Get screen dimensions for responsive layout
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Main emotion circle size
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.75;

/**
 * HomeScreen — main entry point of the app.
 * Shows app name, main "emotion of the day", and button to start reflection flow.
 * Uses theming and adaptive layout.
 */
export default function HomeScreen({ navigation }) {

  // Theme variables from hook
  const { bgcolor, textMain, textSub, button } = useThemeVars();

  // Example default emotion for demo (can be dynamic later)
  const emotion = {
    name: 'Grateful',
    description: "You are grateful for life's gifts",
    color: ['#fbc2eb', '#a6c1ee'],
  };

  return (
    <KeyboardAvoidingView
    // This ensures input fields do not get covered by keyboard on iOS/Android
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={60}
    >
      {/* Custom wrapper for safe area and styling */}
    <ScreenWrapper style={[styles.container, { backgroundColor: bgcolor }]}>

      {/* Title row with big "Zen?" brand */}
      <View style={styles.titleRow}>
        <Text style={[styles.zen, { color: textMain }]}>Zen</Text>
        <View style={styles.questionWrapper}>
        <Text style={[styles.question, { color: textMain }]}>?</Text>
      </View>
      </View>
      {/* Short subtitle */}
      <Text style={[styles.subtitle, { color: textSub }]}>Cultivate mindfulness dally</Text>

      {/* Main emotion circle with gradient, title, and description */}
      <View style={styles.circleWrapper}>
      <LinearGradient colors={emotion.color} style={styles.circle}>
        <Text style={styles.emotionTitle}>{emotion.name}</Text>
        <Text style={styles.emotionDesc}>{emotion.description}</Text>
      </LinearGradient>

      {/* Main action button — starts the reflection flow */}
      <TouchableOpacity
        style={[styles.mainButton, { backgroundColor: button }]}
        onPress={() => navigation.navigate('ReflectionFlow')}
      >
        <Text style={styles.mainButtonText}>Reflect Now</Text>
      </TouchableOpacity>
      </View>
      
    </ScreenWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  titleRow: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: Math.round(SCREEN_WIDTH * 0.06),
  },
  zen: {
    fontSize: Math.round(SCREEN_WIDTH * 0.15),
    fontWeight: '900',
  },
  questionWrapper: {
    position: 'absolute',
    right: -Math.round(SCREEN_WIDTH * 0.065),
    bottom: 0,
  },
  question: {
    fontSize: Math.round(SCREEN_WIDTH * 0.15),
    fontWeight: '900',
  },
  subtitle: {
    fontSize: Math.round(SCREEN_WIDTH * 0.042),
  },
  circleWrapper: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  emotionTitle: {
    fontSize: SCREEN_WIDTH * 0.1,
    fontWeight: '700',
    color: 'white',
    marginBottom: 6,
  },
  emotionDesc: {
    fontSize: SCREEN_WIDTH * 0.055,
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  mainButton: {
  width: '60%',
  alignItems: 'center',
  backgroundColor: '#A78BFA',
  paddingVertical: SCREEN_HEIGHT * 0.018,
  borderRadius: 14,
  marginTop: SCREEN_HEIGHT * 0.12,
  marginBottom: SCREEN_HEIGHT * 0.01,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 8,
  elevation: 5,
},
  mainButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  BottomNavBar: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
  }
});