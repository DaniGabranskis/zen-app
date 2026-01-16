// src/components/QuestionBlock.js
// Comments in English only.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import useThemeVars from '../hooks/useThemeVars';

/**
 * Lightweight multiple-choice block used inside the flow.
 *
 * Props:
 * - title: string
 * - options: Array<{ label?: string, text?: string, tags?: string[] }>
 * - onChoose: (opt) => void
 * - onNotSure?: () => void
 * - notSureLabel?: string
 */
export default function QuestionBlock({
  title,
  options,
  onChoose,
  onNotSure,
  notSureLabel = 'Not sure / Both / Depends',
}) {
  const t = useThemeVars();
  const opts = Array.isArray(options) ? options : [];

  return (
    <View style={[styles.wrap, { backgroundColor: t.cardBg, borderColor: t.divider }]}>
      <Text style={[styles.title, { color: t.textMain }]}>{String(title || '')}</Text>

      <View style={styles.options}>
        {opts.map((o, idx) => {
          const label = String(o?.label ?? o?.text ?? '');
          if (!label) return null;

          return (
            <TouchableOpacity
              key={`${label}-${idx}`}
              onPress={() => onChoose && onChoose(o)}
              style={[styles.optionBtn, { borderColor: t.divider }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.optionText, { color: t.textMain }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!!onNotSure && (
        <TouchableOpacity
          onPress={onNotSure}
          style={[styles.notSureBtn, { borderColor: t.divider }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.notSureText, { color: t.textSub }]}>{notSureLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  options: {
    gap: 10,
  },
  optionBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  optionText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  notSureBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'center',
  },
  notSureText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
