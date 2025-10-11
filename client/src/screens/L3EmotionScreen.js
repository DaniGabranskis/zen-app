import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import useStore from '../store/useStore';
import emotions from '../data/emotions20.json';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';

export default function L3EmotionScreen({ navigation }) {
  const pickEmotion = useStore(s => s.pickEmotion);
  const decision = useStore(s => s.sessionDraft.decision);
  const initial = decision?.top?.[0] || null;

  const theme = useThemeVars();
  const s = makeStyles(theme);

  const onSelect = (key) => {
    pickEmotion(key);
    navigation.navigate('L4Deepen');
  };

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: theme.bgcolor }}>
      <View style={s.wrap}>
        <Text style={s.title}>Pick what feels most accurate now</Text>
        <FlatList
          data={emotions}
          keyExtractor={(item) => item.key}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.card, item.key === initial && s.cardPrimary]}
              onPress={() => onSelect(item.key)}
            >
              <Text style={s.emoji}>{item.emoji || '🙂'}</Text>
              <Text style={s.name}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </ScreenWrapper>
  );
}

// styles factory (uses theme safely)
const makeStyles = (t) =>
  StyleSheet.create({
    wrap: { flex: 1, padding: 16, backgroundColor: t.bgcolor },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: t.textMain },
    card: {
      flex: 1,
      margin: 6,
      padding: 16,
      borderRadius: 16,
      backgroundColor: t.cardBg,
      borderWidth: 1,
      borderColor: '#00000022',
    },
    cardPrimary: { borderWidth: 2, borderColor: t.button },
    emoji: { fontSize: 24, marginBottom: 8, color: t.textMain },
    name: { fontSize: 16, fontWeight: '600', color: t.textMain },
  });
