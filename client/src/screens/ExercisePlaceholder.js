// src/screens/ExercisePlaceholder.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ExercisePlaceholder({ route }) {
  const { dominant, recommendation } = route.params || {};
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Exercise placeholder</Text>
      <Text>Dominant: {String(dominant || '—')}</Text>
      <Text>Recommendation: {recommendation?.title || '—'}</Text>
      <Text>Details: {recommendation?.detail || '—'}</Text>
      <Text style={{ marginTop: 16, opacity: 0.7 }}>
        (Here will be the real exercise flow later)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
});
