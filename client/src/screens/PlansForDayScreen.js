// src/screens/PlansForDayScreen.js
// Comments in English only.

import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { StackActions } from '@react-navigation/native';

import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import useStore from '../store/useStore';

const FOCUS_TAGS = [
  { key: 'plan_focus_work', label: 'Work' },
  { key: 'plan_focus_social', label: 'Social' },
  { key: 'plan_focus_health', label: 'Health' },
  { key: 'plan_focus_rest', label: 'Rest' },
  { key: 'plan_focus_admin', label: 'Admin' },
  { key: 'plan_focus_learning', label: 'Learning' },
];

const INTENSITIES = [
  { key: 'low', label: 'Low' },
  { key: 'med', label: 'Medium' },
  { key: 'high', label: 'High' },
];

function Chip({ label, active, onPress, t }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? t.presscardBg : t.cardBg,
          borderColor: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? t.textMain : t.textSub }]}>{label}</Text>
    </Pressable>
  );
}

export default function PlansForDayScreen({ navigation }) {
  const t = useThemeVars();

  const flowMode = useStore((s) => s.sessionDraft?.flowMode) || 'simplified';
  const sessionType = useStore((s) => s.sessionDraft?.sessionType) || 'morning';

  const focusTags = useStore((s) => s.sessionDraft?.plans?.focusTags) || [];
  const intensity = useStore((s) => s.sessionDraft?.plans?.intensity) || 'med';

  const toggleFocusTag = useStore((s) => s.togglePlanFocusTag);
  const setIntensity = useStore((s) => s.setPlanIntensity);

  const title = sessionType === 'evening' ? 'Day context' : 'Plans for today';
  const subtitle =
    sessionType === 'evening'
      ? 'Pick what your day was mostly about. This helps the questions feel relevant.'
      : 'Pick what you plan to focus on today. This helps the questions feel relevant.';

  const onContinue = () => {
    // EPIC A1: For morning, Plans comes before Baseline, so navigate to BaselineCheckIn
    // For evening, Plans comes after Baseline, so go directly to DiagnosticFlow/L5Summary
    if (sessionType === 'morning') {
      navigation.dispatch(StackActions.replace('BaselineCheckIn'));
      return;
    }

    // Evening: Simplified: Baseline + Plans -> L5 short (NO diagnostics in simplified, morning or evening).
    if (flowMode === 'simplified') {
      navigation.dispatch(StackActions.replace('L5Summary', { mode: 'simplified' }));
      return;
    }

    // Evening: Deep Dive: go to diagnostics
    navigation.dispatch(StackActions.replace('DiagnosticFlow'));
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: t.bgcolor }]}>
        <Text style={[styles.title, { color: t.textMain }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: t.textSub }]}>{subtitle}</Text>

        <View style={[styles.section, { backgroundColor: t.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: t.textMain }]}>Focus</Text>
          <View style={styles.chipGrid}>
            {FOCUS_TAGS.map((x) => (
              <Chip
                key={x.key}
                label={x.label}
                active={focusTags.includes(x.key)}
                onPress={() => toggleFocusTag?.(x.key)}
                t={t}
              />
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: t.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: t.textMain }]}>Intensity</Text>
          <View style={styles.chipRow}>
            {INTENSITIES.map((x) => (
              <Chip
                key={x.key}
                label={x.label}
                active={intensity === x.key}
                onPress={() => setIntensity?.(x.key)}
                t={t}
              />
            ))}
          </View>
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: t.button }]}
            onPress={onContinue}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Text style={[styles.secondaryText, { color: t.textSub }]}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 26, fontWeight: '900', marginTop: 10 },
  subtitle: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 16 },

  section: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginBottom: 10 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '800' },

  bottomRow: { marginTop: 'auto', paddingTop: 10 },
  primaryBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontWeight: '800', fontSize: 14 },
});
