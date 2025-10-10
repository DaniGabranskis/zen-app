import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import useStore from '../store/useStore';
import emotions from '../data/emotions20.json';
import { getEmotionMeta } from '../utils/evidenceEngine';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';

export default function L3EmotionScreen({ navigation, route }) {
  const pickEmotion = useStore(s => s.pickEmotion);
  const decision = useStore(s => s.sessionDraft.decision);

  const initial = decision?.top?.[0] || null;

  const onSelect = (key) => {
    pickEmotion(key);
    navigation.navigate('L4Deepen');
  };

  const { bgcolor, textMain, textSub, button, cardBg } = useThemeVars();

  return (
  <ScreenWrapper useFlexHeight style={{ backgroundColor: bgcolor }}>
    <View style={[styles.wrap, { backgroundColor: bgcolor }]}>
      <Text style={styles.title}>Pick what feels most accurate now</Text>
      <FlatList
        data={emotions}
        keyExtractor={(item) => item.key}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity style={[
              styles.card,
              item.key === initial && styles.cardPrimary
            ]}
            onPress={() => onSelect(item.key)}
          >
            <Text style={styles.emoji}>{item.emoji || '🙂'}</Text>
            <Text style={styles.name}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { flex: 1, margin: 6, padding: 16, borderRadius: 16, backgroundColor: '#1F2937' },
  cardPrimary: { borderWidth: 2, borderColor: '#60A5FA' },
  emoji: { fontSize: 24, marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '600' },
});
