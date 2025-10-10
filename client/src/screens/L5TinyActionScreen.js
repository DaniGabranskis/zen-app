import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import useStore from '../store/useStore';
import tinyActions from '../data/tinyActions.v1.json';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';

export default function L5TinyActionScreen({ navigation }) {
  const decision = useStore(s => s.sessionDraft.decision);
  const pick = useStore(s => s.setL5TinyAction);
  const setCtx = useStore(s => s.setL5Context);

  const [ctx, setLocalCtx] = useState('');

  const candidates = useMemo(() => {
    const emo = decision?.top?.[0];
    const list = tinyActions[emo] || tinyActions['generic'] || [];
    return list.slice(0, 8);
  }, [decision]);

  const onContinue = () => {
    setCtx(ctx);
    navigation.navigate('L6Summary');
  };

  const { bgcolor, textMain, textSub, button, cardBg } = useThemeVars();

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: bgcolor }}>
    <View style={[styles.wrap, { backgroundColor: bgcolor }]}>
      <Text style={styles.title}>Pick 1 tiny action for the next hour</Text>
      <FlatList
        data={candidates}
        keyExtractor={(i, idx) => String(idx)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => pick(item.key)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardText}>{item.caption}</Text>
          </TouchableOpacity>
        )}
      />
      <Text style={styles.subtitle}>Context (optional)</Text>
      <TextInput
        value={ctx}
        onChangeText={setLocalCtx}
        placeholder="Where/when/how will you do it?"
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />
      <TouchableOpacity style={styles.btn} onPress={onContinue}>
        <Text style={styles.btnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  subtitle: { marginTop: 12, fontWeight: '600' },
  card: { padding: 14, borderRadius: 12, backgroundColor: '#111827', marginVertical: 6 },
  cardTitle: { color: 'white', fontWeight: '700', marginBottom: 4 },
  cardText: { color: '#CBD5E1' },
  input: { marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: '#0B1220', color: 'white' },
  btn: { marginTop: 16, padding: 14, backgroundColor: '#2563EB', borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700' },
});
