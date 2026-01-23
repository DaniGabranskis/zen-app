import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useThemeVars from '../hooks/useThemeVars';

export default function SwipeHeaderHint({ hint = '', top = 8 }) {
  const t = useThemeVars();

  return (
    <View pointerEvents="none" style={[styles.wrap, { top }]}>
      <Text style={[styles.swipe, { color: t.textSecondary }]}>
        {'< Swipe >'}
      </Text>

      {!!hint && (
        <Text
          style={[styles.hint, { color: t.textSecondary }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
    paddingHorizontal: 16,
  },
  swipe: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
    opacity: 0.9,
  },
  hint: {
    marginTop: 6,
    fontSize: 14,
    opacity: 0.85,
    textAlign: 'center',
    maxWidth: 320,
  },
});

