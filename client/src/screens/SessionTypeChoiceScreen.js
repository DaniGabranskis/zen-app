// src/screens/SessionTypeChoiceScreen.js
// Comments in English only.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackActions } from '@react-navigation/native';

import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import useStore from '../store/useStore';

export default function SessionTypeChoiceScreen({ navigation }) {
  const t = useThemeVars();

  const setSessionType = useStore((s) => s.setSessionType);

  const options = useMemo(
    () => [
      {
        key: 'morning',
        title: 'Morning check-in',
        bullets: ['Capture baseline state', 'Set plans for the day', 'Get a short, supportive summary'],
      },
      {
        key: 'evening',
        title: 'Evening check-in',
        bullets: ['Capture current state after the day', 'Adds evening delta vs morning', 'Get a clear summary'],
      },
    ],
    []
  );

  const choose = (sessionType) => {
    try {
      setSessionType?.(sessionType);
    } catch (e) {
      // no-op
    }

    navigation.dispatch(StackActions.replace('BaselineCheckIn'));
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: t.bgcolor }]}>
        <Text style={[styles.title, { color: t.textMain }]}>Choose check-in</Text>
        <Text style={[styles.subtitle, { color: t.textSub }]}>
          Pick the type of reflection you want to do right now.
        </Text>

        <View style={styles.grid}>
          {options.map((opt) => (
            <View key={opt.key} style={[styles.card, { backgroundColor: t.cardBg }]}>
              <Text style={[styles.cardTitle, { color: t.textMain }]}>{opt.title}</Text>

              <View style={styles.bullets}>
                {opt.bullets.map((b) => (
                  <Text key={b} style={[styles.bullet, { color: t.textSub }]}>
                    • {b}
                  </Text>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.chooseBtn, { backgroundColor: t.button }]}
                onPress={() => choose(opt.key)}
                activeOpacity={0.9}
              >
                <Text style={styles.chooseText}>Choose</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
          <Text style={[styles.backText, { color: t.textSub }]}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 26, fontWeight: '900', marginTop: 10 },
  subtitle: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 16 },
  grid: { flex: 1, gap: 12 },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: { fontSize: 18, fontWeight: '900' },
  bullets: { marginTop: 10 },
  bullet: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  chooseBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  chooseText: { color: '#FFFFFF', fontWeight: '900' },
  backBtn: { paddingVertical: 14, alignItems: 'center' },
  backText: { fontSize: 14, fontWeight: '700' },
});
