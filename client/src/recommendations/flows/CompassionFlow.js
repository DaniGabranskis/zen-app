// src/recommendations/flows/CompassionFlow.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// English-only comments as requested.

export function CompassionStep({ step, theme }) {
  const s = makeStyles(theme);
  const variant = step?.variant || 'phrase';

  if (variant === 'breath') {
    return (
      <View>
        <Text style={[s.body, { color: theme.textSub }]}>
          Place a hand on your chest. Take one slow breath in, and a slow breath out.
        </Text>
        <Text style={[s.body, { color: theme.textSub, marginTop: 10 }]}>
          You can keep it simple: no need to “fix” anything right now.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={[s.body, { color: theme.textSub }]}>
        Read this slowly (once or twice):
      </Text>

      <View style={[s.quoteBox, { borderColor: theme.border }]}>
        <Text style={[s.quote, { color: theme.textMain }]}>
          “This is a hard moment.”
        </Text>
        <Text style={[s.quote, { color: theme.textMain }]}>
          “It makes sense that I feel this way.”
        </Text>
        <Text style={[s.quote, { color: theme.textMain }]}>
          “I can take one small step.”
        </Text>
      </View>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    body: { fontSize: 13, lineHeight: 18 },
    quoteBox: {
      marginTop: 12,
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
    },
    quote: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 8,
    },
  });
}
