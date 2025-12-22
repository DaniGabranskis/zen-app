// src/recommendations/flows/MicroPlanFlow.js
import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';

// English-only comments as requested.

export function MicroPlanStep({ step, theme, state, setState }) {
  const s = makeStyles(theme);
  const field = step?.field || 'action';

  const plan = state?.plan || { action: '', obstacle: '', when: '' };
  const value = String(plan[field] || '');

  const prompt =
    field === 'action'
      ? 'Pick one tiny, doable action (2 minutes or less).'
      : field === 'obstacle'
      ? 'What might block you? Name one likely obstacle.'
      : 'When will you do it? (e.g., “after lunch”, “at 19:00”).';

  const label =
    field === 'action'
      ? 'Tiny action (required)'
      : field === 'obstacle'
      ? 'Likely obstacle (optional)'
      : 'When (optional)';

  return (
    <View>
      <Text style={[s.body, { color: theme.textSub }]}>{prompt}</Text>

      <Text style={[s.label, { color: theme.textMain }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(txt) => {
          setState((prev) => ({
            ...prev,
            plan: { ...(prev?.plan || {}), [field]: txt },
          }));
        }}
        placeholder="Type here…"
        placeholderTextColor={theme.textSub}
        style={[s.input, { color: theme.textMain, borderColor: theme.border }]}
        multiline
      />
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    body: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
    label: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      minHeight: 44,
    },
  });
}
