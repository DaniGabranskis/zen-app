// src/screens/L5SummaryScreen.js
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '../components/ScreenWrapper';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';
import rawProbes from '../data/probes.v1.json';
import { estimateIntensity } from '../utils/intensity';
import { getEmotionMeta } from '../utils/evidenceEngine'; // same as ResultScreen uses
// ResultScreen gradient circle reference: uses LinearGradient with meta.color. :contentReference[oaicite:1]{index=1}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const EMPTY_ARR = Object.freeze([]);
const EMPTY_STR = '';

export default function L5SummaryScreen({ navigation }) {
  const t = useThemeVars();
  const insets = useSafeAreaInsets();
  const { height: WIN_H, width: WIN_W } = useWindowDimensions();

  // ---- Read snapshot-like values from store, with stable fallbacks
  const _evidenceTags = useStore(s => s.sessionDraft?.evidenceTags);
  const evidenceTags  = _evidenceTags ?? EMPTY_ARR;

  const _pickedEmotionTop = useStore(s => s.decision?.top?.[0]);
  const _pickedEmotion    = useStore(s => s.sessionDraft?.l3?.emotionKey) || useStore(s => s.emotion);
  const emotionKey        = _pickedEmotionTop ?? _pickedEmotion ?? EMPTY_STR;

  const _storeTriggers = useStore(s => s.sessionDraft?.l4?.triggers);
  const _storeBM       = useStore(s => s.sessionDraft?.l4?.bodyMind);
  const storeTriggers  = _storeTriggers ?? EMPTY_ARR;
  const storeBM        = _storeBM ?? EMPTY_ARR;

  // ---- Store setters (persist on Continue)
  const setL4Triggers  = useStore(s => s.setL4Triggers);
  const setL4BodyMind  = useStore(s => s.setL4BodyMind);
  const setL4Intensity = useStore(s => s.setL4Intensity);

  // ---- Local editable copies (сейчас показываем только выбранные; при желании включим Edit)
  const [editTrig] = useState(storeTriggers);
  const [editBM]   = useState(storeBM);
  const [intAdj, setIntAdj] = useState(0); // manual fine-tune: -2..+2

  // ---- Probes (для будущего Edit режима; тут мы не рендерим полный список)
  const probes = useMemo(() => ({
    triggers: Array.isArray(rawProbes?.triggers)
      ? rawProbes.triggers
      : Array.isArray(rawProbes?.L4_triggers)
        ? rawProbes.L4_triggers
        : ['Work', 'Conflict', 'Uncertainty', 'Deadlines', 'Fatigue'],
    bodyMind: Array.isArray(rawProbes?.bodyMind)
      ? rawProbes.bodyMind
      : Array.isArray(rawProbes?.L4_bodyMind)
        ? rawProbes.L4_bodyMind
        : ['Tight chest', 'Racing thoughts', 'Shallow breathing', 'Low energy', 'Irritable'],
  }), []);

  // ---- Auto-intensity live (по текущим selections)
  const { intensity: autoIntensity, confidence } = estimateIntensity({
    tags: evidenceTags,
    bodyMind: editBM,
    triggers: editTrig,
  });
  const previewIntensity = clamp(autoIntensity + intAdj, 0, 10);

  // ---- Emotion meta for gradient circle (как в ResultScreen/Home)
  const meta = emotionKey ? getEmotionMeta(emotionKey) : null; // meta.color: [start, end], meta.name
  const toTitle = (s) => (s || '').replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase()).trim();
  const emotionTitle = meta?.name || toTitle(emotionKey) || 'Emotion';
  const CIRCLE = Math.min(WIN_W * 0.8, 360);

  const s = makeStyles(t, insets, CIRCLE);

  const onContinue = () => {
    // persist finalized values (we keep read-only pills here, but still write back to be safe)
    setL4Triggers(editTrig);
    setL4BodyMind(editBM);
    setL4Intensity(previewIntensity);
    navigation.navigate('L6Actions');
  };

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: t.bgcolor }}>
      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator
      >
        <Text style={s.title}>Summary</Text>
        <Text style={s.subtitle}>
          Here’s a quick recap. If it doesn’t feel right, adjust intensity below. Your recommendations will use this.
        </Text>

        {/* Emotion circle (gradient), same visual language as Home/Result */}
        <View style={s.circleWrap}>
          <LinearGradient
            colors={Array.isArray(meta?.color) ? meta.color : ['#777', '#444']}
            style={s.circle}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
          >
            <Text style={s.circleTitle} numberOfLines={1} adjustsFontSizeToFit>
                {emotionTitle}
            </Text>
            <Text style={s.circleHint}>
              Dominant emotion
            </Text>
          </LinearGradient>

          {/* Intensity under the circle, large number */}
          <Text style={s.intensityBig}>
            {previewIntensity}/10
          </Text>
          <Text style={s.confNote}>
            {confidence >= 0.7 ? 'Auto • accurate' : 'Auto • check'}
          </Text>

          {/* Quick fine-tune controls */}
          <View style={s.row}>
            <SmallBtn label="-1" onPress={() => setIntAdj(a => Math.max(-2, a - 1))} />
            <SmallBtn label="Reset" onPress={() => setIntAdj(0)} />
            <SmallBtn label="+1" onPress={() => setIntAdj(a => Math.min( 2, a + 1))} />
          </View>
        </View>

        {/* Selected Triggers (read-only chips) */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Triggers (selected)</Text>
          <SelectedChips data={editTrig} emptyText="No triggers selected." theme={t} />
        </View>

        {/* Selected Body & Mind (read-only chips) */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Body & Mind (selected)</Text>
          <SelectedChips data={editBM} emptyText="No body & mind patterns selected." theme={t} />
        </View>

        {/* bottom spacer to keep CTA visible */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Continue button (sticky to bottom) */}
      <TouchableOpacity style={s.cta} onPress={onContinue}>
        <Text style={s.ctaText}>Continue</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

function SelectedChips({ data = EMPTY_ARR, emptyText = '—', theme }) {
  if (!data.length) {
    return <Text style={{ color: theme.textSub }}>{emptyText}</Text>;
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
      {data.map((t) => (
        <View key={t} style={{
          paddingVertical: 8, paddingHorizontal: 12,
          borderRadius: 999, backgroundColor: theme.cardBg,
          margin: 6, borderWidth: 1, borderColor: '#00000022',
        }}>
          <Text style={{ color: theme.textMain }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function SmallBtn({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{
      paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#00000010', marginHorizontal: 6,
    }}>
      <Text style={{ fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (t, insets, CIRCLE) => StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: (insets?.bottom ?? 0) + 120,
  },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', color: t.textMain },
  subtitle: { fontSize: 14, fontWeight: '400', textAlign: 'center', color: t.card_choice_text, marginTop: 6, marginBottom: 16 },

  circleWrap: { alignItems: 'center', marginTop: 8, marginBottom: 8 },
  circle: {
    width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  circleTitle: { color: 'white', fontWeight: '900', fontSize: 26, letterSpacing: 0.2 },
  circleHint: { color: '#FFFFFFCC', fontSize: 12, marginTop: 6 },

  intensityBig: { fontSize: 34, fontWeight: '800', color: t.textMain, marginTop: 14, textAlign: 'center' },
  confNote: { fontSize: 12, fontWeight: '400', color: t.textSub, textAlign: 'center', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },

  card: { backgroundColor: t.cardBg, borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#00000012' },

  cta: {
    position: 'absolute', left: 16, right: 16,
    bottom: Math.max(8, (insets?.bottom ?? 0) + 8),
    padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: t.button,
  },
  ctaText: { color: '#fff', fontWeight: '800' },
});
