import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import useStore from '../store/useStore';
import { generateInsight } from '../utils/aiService';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import EmotionRing from '../components/EmotionRing';
import { logEvent } from '../utils/telemetry';

export default function L6SummaryScreen({ navigation }) {
  const draft = useStore(s => s.sessionDraft);
  const setAi = useStore(s => s.setL6AiPayload);
  const setAcc = useStore(s => s.setL6Accuracy);
  const finalize = useStore(s => s.finalizeAndSave);

  const [loading, setLoading] = useState(false);

  const theme = useThemeVars();
  const s = makeStyles(theme);

  useEffect(() => {
    const answers = [
      ...(draft.l1l2Accepted || []).map(c => ({
        questionId: c.id,
        answerText: c.selectedLabel || '',
        tags: Array.isArray(c.selectedTags) ? c.selectedTags : [],
      })),
      { questionId: 'L3_emotion', answerText: draft.l3.emotionKey },
      { questionId: 'L4_triggers', answerText: draft.l4.triggers.join(', ') },
      { questionId: 'L4_bodyMind', answerText: draft.l4.bodyMind.join(', ') },
      { questionId: 'L4_intensity', answerText: String(draft.l4.intensity) },
      { questionId: 'L5_action', answerText: draft.l5.tinyActionKey, tags: ['action_planned'] },
    ];
    
    const run = async () => {
      console.log('[L6] start generateInsight, payload:', answers);
      logEvent('l6_ai_start', { answers }, 'L6: start generateInsight');
      setLoading(true);
      try {
        // timeout race: whichever finishes first
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 15s')), 15000));
        const { result } = await Promise.race([generateInsight(answers), timeout]);
        console.log('[L6] AI result:', result);
        setAi(result);
        logEvent('l6_ai_success', { result }, 'L6: AI result received');
      } catch (err) {
        console.error('[L6] AI failed, using fallback:', err?.message || err);
        // minimal safe fallback
        setAi({
          insight: 'Based on your inputs, try one small step and re-check how you feel in 1 hour.',
          tips: ['Keep it simple', 'Be kind to yourself', 'Review your triggers later'],
          encouragement: 'You’re doing the right thing by reflecting.',
        });
        logEvent('l6_ai_fail', { reason: String(err?.message || err) }, 'L6: AI failed, fallback used');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const onSave = () => {
    logEvent('l6_save', {
      emotion: draft.l3.emotionKey,
      intensity: draft.l4.intensity,
      action: draft.l5.tinyActionKey,
      accuracy: draft.l6.accuracy,
    }, `Saved session. Emotion=${draft.l3.emotionKey}, action=${draft.l5.tinyActionKey || '-'}`);
    finalize();
    navigation.replace('Result');
  };

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: theme.bgcolor }}>
      <View style={s.wrap}>
        <Text style={s.title}>Summary</Text>
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <EmotionRing emotion={draft.l3.emotionKey} intensity={draft.l4.intensity} />
        </View>

        {loading ? (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <Section theme={theme} title="Key emotion">{draft.l3.emotionKey || '—'}</Section>
            <Section theme={theme} title="Triggers">{draft.l4.triggers.join(', ') || '—'}</Section>
            <Section theme={theme} title="Body & Mind">{draft.l4.bodyMind.join(', ') || '—'}</Section>
            <Section theme={theme} title="Intensity">{String(draft.l4.intensity)}</Section>
            <Section theme={theme} title="Tiny action">{draft.l5.tinyActionKey || '—'}</Section>

            <Section theme={theme} title="Insight">{draft.l6.insight || '—'}</Section>
            {(draft.l6.tips || []).map((t, i) => (
              <Text key={i} style={s.tip}>• {t}</Text>
            ))}
            {!!draft.l6.encouragement && (
              <Text style={s.encouragement}>{draft.l6.encouragement}</Text>
            )}

            <Text style={s.rate}>How accurate was this? (1–5)</Text>
            <Stars theme={theme} onChange={setAcc} />

            <TouchableOpacity style={s.btn} onPress={onSave}>
              <Text style={s.btnText}>Save</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

function Section({ theme, title, children }) {
  const s = sectionStyles(theme);
  return (
    <View style={s.box}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.text}>{children}</Text>
    </View>
  );
}

function Stars({ theme, onChange }) {
  const star = { fontSize: 20, color: theme.textMain };
  return (
    <View style={{ flexDirection: 'row', marginVertical: 8 }}>
      {[1,2,3,4,5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} style={{ marginRight: 6 }}>
          <Text style={star}>⭐</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    wrap: { flex: 1, padding: 16, backgroundColor: t.bgcolor },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: t.textMain },
    tip: { marginLeft: 8, marginBottom: 4, color: t.textMain },
    encouragement: { marginTop: 8, fontStyle: 'italic', color: t.textSub },
    rate: { marginTop: 16, marginBottom: 6, color: t.textMain },
    btn: { marginTop: 12, padding: 14, backgroundColor: t.button, borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#FFFFFF', fontWeight: '700' },
  });

const sectionStyles = (t) =>
  StyleSheet.create({
    box: { marginBottom: 12, backgroundColor: t.cardBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#00000022' },
    title: { fontWeight: '700', color: t.textMain, marginBottom: 4 },
    text: { color: t.textSub },
  });
