// src/recommendations/flows/GroundingFlow.js
import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';

// English-only comments as requested.

export function GroundingPromptStep({ step, theme, state, setState }) {
  const s = makeStyles(theme);
  const key = step?.key || 'note';
  const value = String(state?.notes?.[key] || '');

  return (
    <View>
      <Text style={[s.body, { color: theme.textSub }]}>{step?.prompt || ''}</Text>

      <Text style={[s.label, { color: theme.textMain }]}>Optional note</Text>
      <TextInput
        value={value}
        onChangeText={(txt) => {
          setState((prev) => ({
            ...prev,
            notes: { ...(prev?.notes || {}), [key]: txt },
          }));
        }}
        placeholder="You can type a few words…"
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
