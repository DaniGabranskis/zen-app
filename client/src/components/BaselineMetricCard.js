// src/components/BaselineMetricCard.js
// Comments in English only.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import useThemeVars from '../hooks/useThemeVars';
import DotScale from './DotScale';

// Baseline scale changed to 9 for better balance
const BASELINE_SCALE = 9;

export default function BaselineMetricCard({
  title,
  leftLabel,
  rightLabel,
  value,
  notSure,
  onChangeValue,
  onToggleNotSure,
}) {
  const t = useThemeVars();

  return (
    <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.divider }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>

        <Pressable
          onPress={() => onToggleNotSure?.(!notSure)}
          style={[
            styles.chip,
            {
              borderColor: notSure ? t.button : t.divider,
              backgroundColor: notSure ? t.presscardBg : 'transparent',
            },
          ]}
        >
          <Text style={[styles.chipText, { color: notSure ? t.textPrimary : t.textSecondary }]}>
            Not sure
          </Text>
        </Pressable>
      </View>

      <View style={styles.labelsRow}>
        <Text style={[styles.label, { color: t.textSecondary }]}>{leftLabel}</Text>
        <Text style={[styles.label, { color: t.textSecondary }]}>{rightLabel}</Text>
      </View>

      <DotScale
        value={value}
        onChange={(v) => {
          onChangeValue?.(v);
          if (notSure) onToggleNotSure?.(false);
        }}
        count={BASELINE_SCALE}
        activeColor={t.button}
        inactiveColor={t.divider}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
