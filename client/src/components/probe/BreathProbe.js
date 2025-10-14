// src/components/probe/VisualProbe.js
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
// Pull scenes factory directly, no prop needed
import { getVisualScenesFor } from '../../utils/emotionProbe';

export default function VisualProbe({ dominant, onChoose, onSkip, theme }) {
  const scenes = getVisualScenesFor(dominant) || [];
  const a = scenes[0] || { label: 'Option A', tags: [] };
  const b = scenes[1] || { label: 'Option B', tags: [] };

  const chooseA = () => onChoose(a.tags, a.label);
  const chooseB = () => onChoose(b.tags, b.label);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgcolor }]}>
      <Text style={[styles.title, { color: theme.textMain }]}>
        Pick what fits your vibe
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSub }]}>
        No right or wrong, just a quick feel
      </Text>

      <View style={styles.cards}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.navBorder }]}
          onPress={chooseA}
        >
          <Text style={[styles.cardText, { color: theme.textMain }]}>{a.label}</Text>
        </Pressable>

        <Pressable
          style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.navBorder }]}
          onPress={chooseB}
        >
          <Text style={[styles.cardText, { color: theme.textMain }]}>{b.label}</Text>
        </Pressable>
      </View>

      <Pressable onPress={onSkip} style={styles.skip}>
        <Text style={[styles.skipText, { color: theme.textSub }]}>Skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, opacity: 0.9, marginBottom: 28, textAlign: 'center' },
  cards: { width: '100%', gap: 14 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardText: { fontSize: 16, fontWeight: '600' },
  skip: { marginTop: 18 },
  skipText: { fontSize: 13, opacity: 0.8 },
});
