// src/components/DotScale.js
// Comments in English only.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

// Baseline scale changed to 9 for better balance
const BASELINE_SCALE = 9;

export default function DotScale({
  value = 5, // Default to middle of 9-point scale (5)
  onChange,
  count = BASELINE_SCALE, // Default to 9 instead of 7
  activeColor = '#A78BFA',
  inactiveColor = '#CFCFCF',
}) {
  const v = Number.isFinite(value) ? value : 5; // Default to 5 (middle of 9-point scale)

  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => {
        const level = i + 1;
        const active = level === v;

        return (
          <Pressable
            key={level}
            onPress={() => onChange?.(level)}
            hitSlop={8}
            style={[
              styles.dot,
              {
                borderColor: active ? activeColor : inactiveColor,
                backgroundColor: active ? activeColor : 'transparent',
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
});
