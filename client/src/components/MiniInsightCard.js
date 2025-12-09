// src/components/MiniInsightCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MiniInsightCard({
  theme,
  text,
  title = 'Mini insight',
}) {
  if (!text) {
    return null;
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardBackground,
          borderColor: '#00000012',
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.textPrimary,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.text,
          {
            color: theme.textSecondary,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
