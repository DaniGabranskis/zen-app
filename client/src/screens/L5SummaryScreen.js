// src/screens/L5SummaryScreen.js
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '../components/ScreenWrapper';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';
import rawProbes from '../data/probes.v1.json';
import { estimateIntensity } from '../utils/intensity';
import { getEmotionMeta } from '../utils/evidenceEngine';
import { makeHeaderStyles, makeBarStyles, computeBar, BAR_BTN_H } from '../ui/screenChrome';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const EMPTY_ARR = Object.freeze([]);
const EMPTY_STR = '';

// --- AI summary (hoisted helper) ---
function aiSummaryFromState(dominant) {
  if (!dominant) return 'We analyzed your answers. Here is a short actionable suggestion.';
  return `Current state leans toward “${dominant}”. Try a short, concrete action below to consolidate progress.`;
}

// --- Mini Insight (placeholder; later will be AI-driven)
function getMiniInsight(emotionKey) {
  const bank = {
    tiredness: [
      'Notice how your body asks for stillness before the mind does.',
      'Rest is not a reward — it is a need.',
      'Even a short pause can reset your energy curve.'
    ],
    anxiety: [
      'Breathing brings the body back where the mind can follow.',
      'Name what you fear — clarity shrinks uncertainty.',
      'A slower exhale is a faster way to calm.'
    ],
    anger: [
      'Intensity is energy — let it move without harm.',
      'Space before words can protect what matters.',
      'Notice where the heat lives in your body.'
    ],
    sadness: [
      'Gentleness is not weakness — it helps you move again.',
      'Let your feelings sit beside you, not on you.',
      'Small warmths add up: light, tea, soft music.'
    ],
    overwhelm: [
      'Do one tiny thing — completion is a powerful signal.',
      'Reduce inputs before you increase effort.',
      'Boundaries create oxygen for focus.'
    ],
    frustration: [
      'Expectations are heavy; reality is lighter to carry.',
      'Channel the stuck energy into a 60-second reset.',
      'Name one thing you can influence right now.'
    ],
    disconnection: [
      'Text one person: “thinking of you”. Connection starts small.',
      'Step outside for 60 seconds — let the world touch you.',
      'Humans regulate humans — ask for a micro-moment.'
    ],
    tension: [
      'Drop your shoulders; unclench your jaw — it counts.',
      'Exhale longer than you inhale; tension follows the breath out.',
      'Scan for tight points; soften by 5%.'
    ],
    clarity: [
      'Write three bullet points. Clarity grows when seen.',
      'If it’s obvious — act. If not — observe.',
      'Keep it small, keep it true.'
    ],
    calm: [
      'Protect this state: short, often, simple.',
      'Let quiet be productive by itself.',
      'Anchor calm with one breath you can recall later.'
    ],
    joy: [
      'Savor: name three pleasant details right now.',
      'Share the moment — joy multiplies when voiced.',
      'Store a micro-memory for later.'
    ],
    gratitude: [
      'Turn gratitude into action: one thank-you today.',
      'Name what supported you, not just what happened.',
      'Gratitude stabilizes — let it land in the body.'
    ],
    default: [
      'Notice the smallest helpful signal — amplify that.',
      'Name it to tame it. Clarity reduces spin.',
      'One tiny step beats perfect timing.'
    ],
  };

  const list = bank[emotionKey] || bank.default;
  // стабильный выбор: по длине ключа (чтобы не “прыгало” на каждом рендере)
  const idx = Math.abs(String(emotionKey || '').length) % list.length;
  return list[idx];
}


export default function L5SummaryScreen({ navigation, route }) {
  const params = route?.params || {};
  const fromHistory = params?.fromHistory === true;
  const item = params?.item || (fromHistory ? params : null);
  const histSess = (fromHistory && item) ? (item.session || {}) : null;
  const t = useThemeVars();
  const insets = useSafeAreaInsets();
  const { width: WIN_W } = useWindowDimensions();
    // Bottom bar sizing: fixed height safe-area on iOS only.
    const BAR_VPAD = 8;                      // vertical padding inside the bar
    const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);
    const sHead = makeHeaderStyles(t);
    const sBar  = makeBarStyles(t, BAR_BASE_H);

  // ---- store (стабильные селекторы + фолбэки вне селектора)
  const _evidenceTags     = useStore(s => s.sessionDraft?.evidenceTags);
  const evidenceTags      = (histSess?.evidenceTags) ?? (_evidenceTags ?? EMPTY_ARR);

  // 1) main source - router solution
  const _dominant   = useStore(s => s.decision?.dominant);
  const _l3Emotion  = useStore(s => s.sessionDraft?.l3?.emotionKey);
  const _picked     = useStore(s => s.emotion);

  const emotionKey  = fromHistory
    ? (item?.dominantGroup || histSess?.l3?.emotionKey || EMPTY_STR)
    : (_dominant ?? _l3Emotion ?? _picked ?? EMPTY_STR);

  const aiDesc      = aiSummaryFromState(emotionKey);
  const miniInsight = useMemo(() => getMiniInsight(emotionKey), [emotionKey]);

  const _storeTriggers = useStore(s => s.sessionDraft?.l4?.triggers);
  const _storeBM       = useStore(s => s.sessionDraft?.l4?.bodyMind);

  const storeTriggers  = fromHistory
    ? (histSess?.l4?.triggers ?? EMPTY_ARR)
    : (_storeTriggers ?? EMPTY_ARR);

  const storeBM        = fromHistory
    ? (histSess?.l4?.bodyMind ?? EMPTY_ARR)
    : (_storeBM ?? EMPTY_ARR);

  const setL4Triggers     = useStore(s => s.setL4Triggers);
  const setL4BodyMind     = useStore(s => s.setL4BodyMind);
  const setL4Intensity    = useStore(s => s.setL4Intensity);

  // ---- локальные копии (сейчас read-only показ)
  const [editTrig] = useState(storeTriggers);
  const [editBM]   = useState(storeBM);
  const [intAdj]   = useState(0); // ручная подстройка будет позже в модалке

  // ---- (на будущее) полные наборы
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

  const { intensity: autoIntensity, confidence } = estimateIntensity({
    tags: evidenceTags,
    bodyMind: editBM,
    triggers: editTrig,
  });

  // из истории: intensity и confidence (accuracy 1..5 → 0..1)
  const histIntensity   = fromHistory ? Number(histSess?.l4?.intensity ?? 0) : null;
  const histAccuracy    = fromHistory ? Number(histSess?.l6?.accuracy ?? 3) : null;
  const histConfidence  = fromHistory && Number.isFinite(histAccuracy)
    ? Math.max(0, Math.min(1, (histAccuracy - 1) / 4)) // 1→0, 5→1
    : null;

  // что показывать на экране
  const previewIntensity = fromHistory
    ? clamp(histIntensity ?? 0, 0, 10)
    : clamp(autoIntensity + intAdj, 0, 10);

  const showConfidence = fromHistory
    ? (histConfidence ?? 0.7) // разумный дефолт
    : confidence;

  const intensityBucket  = previewIntensity <= 3 ? 'Low' : previewIntensity <= 6 ? 'Medium' : 'High';

  // ---- визуал круга эмоции
  const meta        = emotionKey ? getEmotionMeta(emotionKey) : null; // meta.color: [start,end], meta.name
  const toTitle     = (s) => (s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase()).trim();
  const emotionTitle= meta?.name || toTitle(emotionKey) || 'Emotion';

  // ---- параметры круга и прогресс-кольца
  const CIRCLE       = Math.min(WIN_W * 0.8, 360);
  const RING_STROKE  = 10;
  const Rpath        = (CIRCLE / 2) - RING_STROKE / 2;  // path radius
  const CIRC         = 2 * Math.PI * Rpath;
  const fillRatio    = previewIntensity / 10;      // 0..1
  const arcLen       = CIRC * fillRatio;
  const s = makeStyles(t, insets, CIRCLE, BAR_BASE_H, BAR_VPAD);

  const onContinue = () => {
    setL4Triggers(editTrig);
    setL4BodyMind(editBM);
    setL4Intensity(previewIntensity);
    navigation.navigate('L6Actions');
  };

   const onEdit = () => {
   navigation.navigate('L4Deepen'); 
 };

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: t.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator>
        <Text style={sHead.title}>Summary</Text>
        <Text style={sHead.subtitle}>
          Here’s a quick recap. Your recommendations will use this.
        </Text>

        {/* Emotion circle with thin progress ring */}
        <View style={s.circleWrap}>
          <View style={{ width: CIRCLE, height: CIRCLE }}>
            {/* градиентное «ядро» круга */}
            <LinearGradient
              colors={Array.isArray(meta?.color) ? meta.color : ['#777', '#444']}
              style={s.circle}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.9, y: 0.9 }}
            >
              <Text style={s.circleTitle} numberOfLines={1} adjustsFontSizeToFit>
                {emotionTitle}
              </Text>
              <Text style={s.circleHint}>Dominant emotion</Text>
              {/* число под подписью тем же стилем */}
              <Text style={s.circleHint}>{previewIntensity}/10</Text>
            </LinearGradient>

            {/* тонкое кольцо-прогресс поверх круга */}
            <Svg width={CIRCLE} height={CIRCLE} style={StyleSheet.absoluteFill}>
              {/* фон кольца */}
              <Circle
                cx={CIRCLE / 2}
                cy={CIRCLE / 2}
                r={Rpath}
                fill="none"
                stroke="#cacaca"
                strokeWidth={RING_STROKE}
              />
              {/* прогресс */}
              <Circle
                cx={CIRCLE / 2}
                cy={CIRCLE / 2}
                r={Rpath}
                fill="none"
                stroke="#A78BFA"
                strokeOpacity={0.9}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${arcLen} ${CIRC - arcLen}`}
                rotation={-90}
                originX={CIRCLE / 2}
                originY={CIRCLE / 2}
              />
            </Svg>
          </View>
        </View>

        {/* подпись под кругом */}
        <Text style={s.intensityBadge}>Intensity • {intensityBucket}</Text>
        <Text style={s.confNote}>{showConfidence >= 0.7 ? 'Auto • accurate' : 'Auto • check'}</Text>

        {/* Mini Insight (placeholder) */}
        <View style={[s.aiCard, { backgroundColor: t.cardBg }]}>
          <Text style={s.aiCardTitle}>Mini insight</Text>
          <Text style={[s.aiCardText, { color: t.textSub }]}>{miniInsight}</Text>
        </View>

        {/* AI Description */}
        <View style={[s.aiCard, { backgroundColor: t.cardBg }]}>
          <Text style={s.aiCardTitle}>Short description</Text>
          <Text style={[s.aiCardText, { color: t.textSub }]}>{aiDesc}</Text>
        </View>

        {/* выбранные Triggers */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Triggers (selected)</Text>
          <SelectedChips data={editTrig} emptyText="No triggers selected." theme={t} />
        </View>

        {/* выбранные Body & Mind */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Body & Mind (selected)</Text>
          <SelectedChips data={editBM} emptyText="No body & mind patterns selected." theme={t} />
        </View>

        {/** spacer no longer needed, bottom bar space is reserved via paddingBottom */}
      </ScrollView>

      {/* CTA is pushed to the bottom */}
      {/* Bottom action bar: fixed, two buttons */}
      {!fromHistory && (
        <View style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]} pointerEvents="box-none">
          <View style={sBar.bottomBarShadow} />
          <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
            <TouchableOpacity style={[sBar.btn, sBar.btnSecondary, { height: BAR_BTN_H }]} onPress={onEdit}>
              <Text style={sBar.btnSecondaryText}>Edit</Text>
            </TouchableOpacity>
            <View style={{ width: 12 }} />
            <TouchableOpacity style={[sBar.btn, sBar.btnPrimary, { height: BAR_BTN_H }]} onPress={onContinue}>
              <Text style={sBar.btnPrimaryText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}

function SelectedChips({ data = EMPTY_ARR, emptyText = '—', theme }) {
  if (!data.length) return <Text style={{ color: theme.textSub }}>{emptyText}</Text>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
      {data.map((t) => (
        <View
          key={t}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: theme.cardBg,
            margin: 6,
            borderWidth: 1,
            borderColor: '#00000022',
          }}
        >
          <Text style={{ color: theme.textMain }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

// makeStyles receives bar sizes to avoid capturing undefined locals
const makeStyles = (t, insets, CIRCLE, BAR_BASE_H, BAR_VPAD) => StyleSheet.create({
    scroll: {
        padding: 16,
        // Reserve space under the scroll so content doesn't hide behind the bar.
        // NOTE: we don't add safe-area here to avoid double inset.
        paddingBottom: BAR_BASE_H + 8,
    },

  circleWrap: { alignItems: 'center', marginTop: 8, marginBottom: 8 },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    paddingHorizontal: 16,
  },
  circleTitle: { color: 'white', fontWeight: '900', fontSize: 26, letterSpacing: 0.2, textAlign: 'center' },
  circleHint: { color: '#FFFFFFCC', fontSize: 12, marginTop: 6, textAlign: 'center' },

  intensityBadge: { fontSize: 14, fontWeight: '700', color: t.textMain, textAlign: 'center', marginTop: 12 },
  confNote: { fontSize: 12, fontWeight: '400', color: t.textSub, textAlign: 'center', marginTop: 2 },

  card: {
    backgroundColor: t.cardBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#00000012',
  },

  aiCard: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#00000012',
  },
  aiCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  aiCardText: { fontSize: 14, lineHeight: 20 },
});
