// src/screens/L5SummaryScreen.js
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
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
import { generateShortDescription } from '../utils/aiService';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const EMPTY_ARR = Object.freeze([]);
const EMPTY_STR = '';

// --- AI summary (hoisted helper) ---
function aiSummaryFromState(dominant) {
  if (!dominant) return 'We analyzed your answers. Here is a short actionable suggestion.';
  return `Current state leans toward “${dominant}”. Try a short, concrete action below to consolidate progress.`;
}

// --- Local stats-based mini insight (human style, 1 sentence) ---------------
function daysBetween(d1, d2) {
  const MS = 24*60*60*1000;
  return Math.floor((d2 - d1) / MS);
}

function titleCase(s) {
  return (s || '').replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, m => m.toUpperCase())
    .trim();
}

function computeMiniInsightFromHistory(history = [], emotionKey = '') {
  if (!emotionKey) {
    return 'There is no pattern at the moment, your days are very varied.';
  }

  const now = Date.now();
  const ekTitle = titleCase(emotionKey);

  const same = history.filter(it =>
    (it?.dominantGroup || '').toLowerCase() === String(emotionKey).toLowerCase()
  );

  if (same.length === 0) {
    return 'There is no pattern at the moment, your days are very varied.';
  }

  // last seen
  const latestTs = same
    .map(it => new Date(it.date || it.createdAt || 0).getTime() || 0)
    .sort((a,b) => b-a)[0];

  const lastDays = Number.isFinite(latestTs) ? daysBetween(latestTs, now) : null;

  // windows
  const last7  = now - 7  * 24*60*60*1000;
  const last30 = now - 30 * 24*60*60*1000;
  const count7  = same.filter(it => new Date(it.date || it.createdAt || 0).getTime() >= last7).length;
  const count30 = same.filter(it => new Date(it.date || it.createdAt || 0).getTime() >= last30).length;

  // humanized message (1 sentence)
  if (count7 >= 3) {
    // Пример: "Lately you've been feeling Sadness often — 3 times in the last 7 days."
    return `Lately you've been feeling ${ekTitle.toLowerCase()} often — ${count7} times in the last 7 days.`;
  }

  if (lastDays !== null && lastDays <= 3) {
    // Пример: "You've felt Sadness recently — yesterday."
    const when = lastDays === 0 ? 'today' : lastDays === 1 ? 'yesterday' : `${lastDays} days ago`;
    return `You've felt ${ekTitle.toLowerCase()} recently — ${when}.`;
  }

  if (count30 >= 4) {
    // Пример: "Sadness showed up 5 times in the last 30 days."
    return `${ekTitle} showed up ${count30} times in the last 30 days.`;
  }

  // дефолт: нет выраженного паттерна
  return 'There is no clear pattern yet — your days look varied.';
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
    : (_dominant || _l3Emotion || _picked || EMPTY_STR);

  const historyItems = useStore(s => {
    if (Array.isArray(s.history)) return s.history;
    if (Array.isArray(s.history?.items)) return s.history.items;
    return [];
  });

  const [loading, setLoading] = useState(!fromHistory);
  const [aiDesc, setAiDesc] = useState('');
  const [miniInsight, setMiniInsight] = useState('');
  const [aiSource, setAiSource] = useState(''); // 'ai' | 'local'
  
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
  const setL5Fields = useStore(s => s.setL5Fields);

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

 // Loading effect: we calculate a local mini-insight and request a short AI description
useEffect(() => {
  let isMounted = true;

  if (fromHistory) {
    // If we open from history, we take the already saved data and turn off the download
    const histMini  = (histSess?.l5?.miniInsight ?? '');
    const histShort = (histSess?.l5?.shortDescription ?? '');
    setMiniInsight(histMini);
    setAiDesc(histShort || aiSummaryFromState(emotionKey));
    setLoading(false);
    return () => { isMounted = false; };
  }

  // 1) Mini-insight locally, immediately (works offline)
  const localMini = computeMiniInsightFromHistory(historyItems, emotionKey || 'Emotion');
  setMiniInsight(localMini);

  // 2) Prepare input for AI
  const payload = {
    emotionKey,
    intensity: previewIntensity,
    triggers: Array.isArray(storeTriggers) ? storeTriggers : [],
    bodyMind: Array.isArray(storeBM) ? storeBM : [],
    evidenceTags: Array.isArray(evidenceTags) ? evidenceTags : [],
  };

  (async () => {
    try {
      const { result, source } = await generateShortDescription(payload);
      if (!isMounted) return;
      setAiDesc(result?.shortDescription || aiSummaryFromState(emotionKey));
      setAiSource(source || '');
      // Save the draft to L6 so that HistoryResultModal can see these values
      setL5Fields({
        miniInsight: localMini,
        shortDescription: (result?.shortDescription || '').trim(),
      });
    } catch (e) {
      if (!isMounted) return;
      console.warn('[L5] shortDescription error', e?.message || e);
      setAiDesc(aiSummaryFromState(emotionKey));
      setAiSource('local');
      setL5Fields({
        miniInsight: localMini,
        shortDescription: '',
      });
    } finally {
      if (isMounted) setLoading(false);
    }
  })();

  return () => { isMounted = false; };
  // Important: Only monitor key dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [fromHistory, emotionKey]);

  useEffect(() => {
    console.log('[L5] loading:', loading);
    console.time('[AI] shortDescription');
    console.timeEnd('[AI] shortDescription');
  }, [loading]);

// LOADING SCREEN
if (loading) {
  return (
    <ScreenWrapper
      useFlexHeight
      noTopInset={fromHistory}
      style={{ backgroundColor: t.background }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={t.textSecondary} />
        <Text
          style={{
            marginTop: 12,
            fontSize: 16,
            fontWeight: '700',
            color: t.textPrimary,
          }}
        >
          Analysing...
        </Text>
      </View>
    </ScreenWrapper>
  );
}

// === MAIN SCREEN ===
return (
  <ScreenWrapper useFlexHeight noTopInset={fromHistory} style={{ backgroundColor: t.background }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator>
      {!fromHistory && (
        <>
          <Text style={sHead.title}>Summary</Text>
          <Text style={sHead.subtitle}>
            Here’s a quick recap. Your recommendations will use this.
          </Text>
        </>
      )}

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
            <Text style={s.circleHint}>{previewIntensity}/10</Text>
          </LinearGradient>

          {/* тонкое кольцо-прогресс поверх круга */}
          <Svg width={CIRCLE} height={CIRCLE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={CIRCLE / 2}
              cy={CIRCLE / 2}
              r={Rpath}
              fill="none"
              stroke={t.dividerColor  || '#4B4B4B'}
              strokeWidth={RING_STROKE}
            />
            <Circle
              cx={CIRCLE / 2}
              cy={CIRCLE / 2}
              r={Rpath}
              fill="none"
              stroke={t.accent}
              strokeOpacity={0.7}
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
      <Text style={s.confNote}>
        {showConfidence >= 0.7 ? 'Auto • accurate' : 'Auto • check'}
      </Text>

      {/* Mini Insight */}
      <View style={[s.aiCard, { backgroundColor: t.cardBackground }]}>
        <Text style={[s.aiCardText, { color: t.textPrimary, marginBottom: 4 }]}>
          Mini insight
        </Text>
        <Text style={[s.aiCardText, { color: t.textSecondary }]}>
          {miniInsight}
        </Text>
      </View>

      {/* AI Description */}
      <View style={[s.aiCard, { backgroundColor: t.cardBackground }]}>
        <Text style={[s.aiCardText, { color: t.textPrimary, marginBottom: 4 }]}>
          Short description{' '}
          {aiSource === 'local' ? (
            <Text style={{ fontSize: 12, color: t.textSecondary }}>(offline)</Text>
          ) : null}
        </Text>
        <Text style={[s.aiCardText, { color: t.textSecondary }]}>
          {aiDesc}
        </Text>
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
    </ScrollView>

    {/* Bottom action bar */}
    {!fromHistory && (
      <View
        style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]}
        pointerEvents="box-none"
      >
        <View style={sBar.bottomBarShadow} />
        <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
          <TouchableOpacity
            style={[sBar.btn, sBar.btnSecondary, { height: BAR_BTN_H }]}
            onPress={onEdit}
          >
            <Text style={sBar.btnSecondaryText}>Edit</Text>
          </TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity
            style={[sBar.btn, sBar.btnPrimary, { height: BAR_BTN_H }]}
            onPress={onContinue}
          >
            <Text style={sBar.btnPrimaryText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
  </ScreenWrapper>
  );
}

function SelectedChips({ data = EMPTY_ARR, emptyText = '—', theme }) {
  if (!data.length) return <Text style={{ color: theme.textSecondary }}>{emptyText}</Text>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
      {data.map((t) => (
        <View
          key={t}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: theme.cardBackground,
            margin: 6,
            borderWidth: 1,
            borderColor: '#00000022',
          }}
        >
          <Text style={{ color: theme.textPrimary }}>{t}</Text>
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

  circleTitle: {
    // white в светлой теме, чёрный в тёмной
    color: t.themeName === 'light' ? '#FFFFFF' : '#000000',
    fontWeight: '900',
    fontSize: 26,
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  circleHint: {
    // мягкий белый в светлой, мягкий чёрный в тёмной
    color: t.themeName === 'light' ? '#FFFFFFCC' : '#00000099',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },

  intensityBadge: { fontSize: 14, fontWeight: '700', color: t.textPrimary, textAlign: 'center', marginTop: 12 },
  confNote: { fontSize: 12, fontWeight: '400', color: t.textSecondary, textAlign: 'center', marginTop: 2 },

  card: {
    backgroundColor: t.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#00000012',
  },
  aiCard: {
    backgroundColor: t.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#00000012',
  },
  aiCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  aiCardText: { fontSize: 14, lineHeight: 20 },
});
