// src/screens/ReflectionModeChoiceScreen.js
// Comments in English only.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackActions } from '@react-navigation/native';

import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import useStore from '../store/useStore';

function Bullet({ children, color }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletDot, { color }]}>•</Text>
      <Text style={[styles.bulletText, { color }]}>{children}</Text>
    </View>
  );
}

export default function ReflectionModeChoiceScreen({ navigation }) {
  const t = useThemeVars();

  const start = (mode) => {
    try {
      const { resetSession, setFlowMode } = useStore.getState();
      resetSession();               // Ensures clean run even if user came not from HomeScreen
      setFlowMode(mode);            // "simplified" | "deep"
    } catch (e) {
      // no-op
    }

    // Replace this screen with the actual flow so Back returns to MainTabs/Home.
    navigation.dispatch(StackActions.replace('SessionTypeChoice'));
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: t.bgcolor }]}>
        <Text style={[styles.title, { color: t.textPrimary }]}>Choose your reflection</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>
          Pick a quick check-in or a deeper dive. You can always switch next time.
        </Text>

        {/* Simplified */}
        <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.divider }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary }]}>Simplified</Text>

          <View style={styles.bullets}>
            <Bullet color={t.textSecondary}>Baseline questions only</Bullet>
            <Bullet color={t.textSecondary}>Gives you a short summary (no recommendations)</Bullet>
            <Bullet color={t.textSecondary}>Fast: ~1 minute</Bullet>
          </View>

          <TouchableOpacity
            style={[styles.chooseBtn, { backgroundColor: t.button }]}
            onPress={() => start('simplified')}
            activeOpacity={0.9}
          >
            <Text style={styles.chooseText}>Choose</Text>
          </TouchableOpacity>
        </View>

        {/* Deep Dive */}
        <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.divider }]}>
          <Text style={[styles.cardTitle, { color: t.textPrimary }]}>Deep Dive</Text>

          <View style={styles.bullets}>
            <Bullet color={t.textSecondary}>Baseline + deeper questions</Bullet>
            <Bullet color={t.textSecondary}>Includes triggers/body-mind and recommendations</Bullet>
            <Bullet color={t.textSecondary}>Longer: ~3–5 minutes</Bullet>
          </View>

          <TouchableOpacity
            style={[styles.chooseBtn, { backgroundColor: t.button }]}
            onPress={() => start('deep')}
            activeOpacity={0.9}
          >
            <Text style={styles.chooseText}>Choose</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancel} activeOpacity={0.85}>
          <Text style={[styles.cancelText, { color: t.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  bullets: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  chooseBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  chooseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  cancel: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 2,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
