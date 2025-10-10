import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import useStore from '../store/useStore';
import { generateInsight } from '../utils/aiService';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';

export default function L6SummaryScreen({ navigation }) {
  const draft = useStore(s => s.sessionDraft);
  const setAi = useStore(s => s.setL6AiPayload);
  const setAcc = useStore(s => s.setL6Accuracy);
  const finalize = useStore(s => s.finalizeAndSave);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Build compact answer payload for AI
    const answers = [
      ...draft.l1l2Accepted.map(c => ({
        questionId: c.id,
        answerText: c.options?.[c.selectedOption]?.label || '',
        tags: c.options?.[c.selectedOption]?.tags || []
      })),
      { questionId: 'L3_emotion', answerText: draft.l3.emotionKey },
      { questionId: 'L4_triggers', answerText: draft.l4.triggers.join(', ') },
      { questionId: 'L4_bodyMind', answerText: draft.l4.bodyMind.join(', ') },
      { questionId: 'L4_intensity', answerText: String(draft.l4.intensity) },
      { questionId: 'L5_action', answerText: draft.l5.tinyActionKey, tags: ['action_planned'] },
    ];

    (async () => {
      setLoading(true);
      const { result } = await generateInsight(answers);
      setAi(result); // normalize happens inside aiService/aiSchema
      setLoading(false);
    })();
  }, []);

  const onSave = () => {
    finalize();
    navigation.replace('Result'); // or History, or Home — your choice
  };

  const { bgcolor, textMain, textSub, button, cardBg } = useThemeVars();

  return (
   <ScreenWrapper useFlexHeight style={{ backgroundColor: bgcolor }}>
    <View style={[styles.wrap, { backgroundColor: bgcolor }]}>
      <Text style={styles.title}>Summary</Text>
      {loading ? (
        <View style={{ paddingVertical: 20 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <Section title="Key emotion">{draft.l3.emotionKey || '—'}</Section>
          <Section title="Triggers">{draft.l4.triggers.join(', ') || '—'}</Section>
          <Section title="Body & Mind">{draft.l4.bodyMind.join(', ') || '—'}</Section>
          <Section title="Intensity">{String(draft.l4.intensity)}</Section>
          <Section title="Tiny action">{draft.l5.tinyActionKey || '—'}</Section>

          <Section title="Insight">{draft.l6.insight || '—'}</Section>
          {(draft.l6.tips || []).map((t, i) => (
            <Text key={i} style={styles.tip}>• {t}</Text>
          ))}
          {!!draft.l6.encouragement && (
            <Text style={styles.encouragement}>{draft.l6.encouragement}</Text>
          )}

          <Text style={styles.rate}>How accurate was this? (1–5)</Text>
          <Stars onChange={setAcc} />

          <TouchableOpacity style={styles.btn} onPress={onSave}>
            <Text style={styles.btnText}>Save</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  </ScreenWrapper>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontWeight: '700' }}>{title}</Text>
      <Text>{children}</Text>
    </View>
  );
}

function Stars({ onChange }) {
  return (
    <View style={{ flexDirection: 'row', marginVertical: 8 }}>
      {[1,2,3,4,5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} style={{ marginRight: 6 }}>
          <Text style={{ fontSize: 20 }}>⭐</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  tip: { marginLeft: 8, marginBottom: 4 },
  encouragement: { marginTop: 8, fontStyle: 'italic' },
  rate: { marginTop: 16, marginBottom: 6 },
  btn: { marginTop: 12, padding: 14, backgroundColor: '#2563EB', borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700' },
});
