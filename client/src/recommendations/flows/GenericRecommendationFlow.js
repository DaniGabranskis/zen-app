// src/recommendations/flows/GenericRecommendationFlow.js
import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';

// English-only comments as requested.

export function GenericRecommendationStep({ recommendation, theme, state, setState, step }) {
  const s = makeStyles(theme);
  const kind = String(step?.variant || recommendation?.kind || 'generic');

  const getCopy = () => {
    if (kind === 'body') {
      return [
        'Unclench your jaw. Drop your shoulders.',
        'Do 3 slow breaths. On each exhale, relax one muscle group.',
        'Stand up and stretch gently for 20 seconds.',
      ].join('\n\n');
    }

    if (kind === 'journal') {
      return 'Complete one sentence:\n\n“I feel ___ because ___.”\n\nOptional: “What I need right now is ___.”';
    }

    if (kind === 'social') {
      return 'Optional reach-out message template:\n\n“Hey — quick check-in. I’ve had a heavy moment. No need to fix it, but could you talk for 5 minutes?”';
    }

    if (kind === 'reframe') {
      return 'Quick reframe:\n\n1) Write the thought that’s looping.\n2) Write one alternative that is more balanced.\n\nExample: “I failed” → “I struggled today, but I can try one small step.”';
    }

    if (kind === 'savor') {
      return 'Savor (60s):\n\nName 3 pleasant details you notice.\nThen pick 1 and stay with it for 3 slow breaths.';
    }

    return 'Follow the prompt. Keep it small and doable.';
  };

  const value = String(state?.input?.text || '');

  return (
    <View>
      <Text style={[s.body, { color: theme.textSub }]}>{getCopy()}</Text>

      <Text style={[s.label, { color: theme.textMain }]}>Optional note</Text>
      <TextInput
        value={value}
        onChangeText={(txt) => setState((prev) => ({ ...prev, input: { ...(prev?.input || {}), text: txt } }))}
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
    label: { fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 12 },
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
