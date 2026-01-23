// src/screens/BaselineCheckInScreen.js
// Comments in English only.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StackActions } from '@react-navigation/native';

import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import useStore from '../store/useStore';
import BaselineMetricCard from '../components/BaselineMetricCard';
import { routeStateFromBaseline } from '../utils/baselineEngine';

// Scale changed to 9 for better balance and simpler calculations
const BASELINE_SCALE = 9;
const BASELINE_MID = Math.round(BASELINE_SCALE / 2); // 5 for 9-point scale
const DEFAULTS = { 
  valence: BASELINE_MID, 
  energy: BASELINE_MID, 
  tension: BASELINE_MID, 
  clarity: BASELINE_MID, 
  control: BASELINE_MID, 
  social: BASELINE_MID 
};

function applyNotSureToMetrics(metrics, notSureMap) {
  const out = { ...metrics };
  Object.keys(notSureMap || {}).forEach((k) => {
    if (notSureMap[k]) out[k] = BASELINE_MID; // Default to middle of scale
  });
  return out;
}

export default function BaselineCheckInScreen({ navigation }) {
  const t = useThemeVars();

  const metrics = useStore((s) => s.sessionDraft?.baseline?.metrics) || DEFAULTS;
  const notSureMap = useStore((s) => s.sessionDraft?.baseline?.notSureMap) || {};

  const setBaselineMetric = useStore((s) => s.setBaselineMetric);
  const setBaselineNotSure = useStore((s) => s.setBaselineNotSure);
  const finalizeBaseline = useStore((s) => s.finalizeBaseline);

  const onContinue = () => {
    finalizeBaseline();

    const sanitized = applyNotSureToMetrics(metrics, notSureMap);
    const decision = routeStateFromBaseline(sanitized);
    
    try {
      useStore.getState().setDecision?.(decision);
      // Save stateKey (emotionKey is 'mixed' for baseline-only, which is fine)
      useStore.getState().pickState?.(decision.stateKey, decision.emotionKey);
      // Save macro state (if setMacroMicroStates exists)
      if (typeof useStore.getState().setMacroMicroStates === 'function') {
        useStore.getState().setMacroMicroStates?.(decision.stateKey, null);
      }
    } catch (e) {
      // no-op
    }

    // EPIC A1: After baseline, navigate based on sessionType and flowMode
    const sessionType = useStore.getState().sessionDraft?.sessionType || 'morning';
    const flowMode = useStore.getState().sessionDraft?.flowMode || 'simplified';

    if (sessionType === 'morning') {
      // Morning: Baseline -> Plans (already done) -> DiagnosticFlow/L5Summary
      if (flowMode === 'simplified') {
        navigation.dispatch(StackActions.replace('L5Summary', { mode: 'simplified' }));
      } else {
        navigation.dispatch(StackActions.replace('DiagnosticFlow'));
      }
    } else {
      // Evening: Baseline -> Plans -> DiagnosticFlow/L5Summary
      navigation.navigate('PlansForDay');
    }
  };

  const cards = useMemo(
    () => ([

        {
        key: 'valence',
        title: 'Mood',
        left: 'Low',
        right: 'Good',
        },
      {
        key: 'energy',
        title: 'Energy',
        left: 'Drained',
        right: 'Wired',
      },
      {
        key: 'tension',
        title: 'Tension',
        left: 'Loose',
        right: 'Tight',
      },
      {
        key: 'clarity',
        title: 'Clarity',
        left: 'Foggy',
        right: 'Clear',
      },
      {
        key: 'control',
        title: 'Control',
        left: 'Reactive',
        right: 'In charge',
      },
      {
        key: 'social',
        title: 'Social capacity',
        left: 'Need space',
        right: 'Want connection',
      },
    ]),
    []
  );

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: t.bgcolor }]}>
        <Text style={[styles.title, { color: t.textPrimary }]}>Baseline check-in</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>
          Set quick levels. You can choose “Not sure” if it’s unclear.
        </Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {cards.map((c) => (
              <BaselineMetricCard
                key={c.key}
                title={c.title}
                leftLabel={c.left}
                rightLabel={c.right}
                value={metrics?.[c.key] ?? BASELINE_MID}
                notSure={Boolean(notSureMap?.[c.key])}
                onChangeValue={(v) => setBaselineMetric(c.key, v)}
                onToggleNotSure={(v) => setBaselineNotSure(c.key, v)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: t.button }]}
            onPress={onContinue}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
          >
            <Text style={[styles.secondaryText, { color: t.textSecondary }]}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  scroll: {
    paddingTop: 14,
    paddingBottom: 12,
  },
  grid: {
    gap: 12,
  },
  bottomRow: {
    gap: 10,
    paddingBottom: 10,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
