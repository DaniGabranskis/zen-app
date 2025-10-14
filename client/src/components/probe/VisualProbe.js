// src/components/probe/VisualProbe.js
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

// All comments in English only.

export default function VisualProbe({ dominant, onChoose, onSkip, getScenes, theme }) {
  const scenes = getScenes(dominant);

  const chooseA = () => onChoose(scenes[0].tags, scenes[0].label);
  const chooseB = () => onChoose(scenes[1].tags, scenes[1].label);

  return (
    <View style={[styles.container, { backgroundColor: theme?.bg }]}>
      <Text style={[styles.title, { color: theme?.textMain }]}>
        Pick what fits your vibe
      </Text>
      <Text style={[styles.subtitle, { color: theme?.textSub }]}>
        No right or wrong, just a quick feel
      </Text>

      <View style={styles.cards}>
        <Pressable style={[styles.card]} onPress={chooseA}>
          <Text style={[styles.cardText, { color: theme?.textMain}]}>{scenes[0].label}</Text>
        </Pressable>

        <Pressable style={[styles.card]} onPress={chooseB}>
          <Text style={[styles.cardText, { color: theme?.textMain}]}>{scenes[1].label}</Text>
        </Pressable>
      </View>

      <Pressable onPress={onSkip} style={styles.skip}>
        <Text style={[styles.skipText, { color: theme?.textSub}]}>
          Skip
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60, // Push all content down from top a bit
    backgroundColor: 'transparent',
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, opacity: 0.9, marginBottom: 28 },
  cards: { width: '100%', gap: 14 },
  card: {
    backgroundColor: '#151A22',
    borderWidth: 1,
    borderColor: '#2A3340',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  cardText: { fontSize: 16, fontWeight: '600' },
  skip: { marginTop: 18 },
  skipText: { fontSize: 13, opacity: 0.8 },
});
