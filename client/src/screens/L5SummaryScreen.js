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
import { getEmotionMeta } from '../utils/evidenceEngine'; // same util, как в ResultScreen

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const EMPTY_ARR = Object.freeze([]);
const EMPTY_STR = '';

export default function L5SummaryScreen({ navigation }) {
  const t = useThemeVars();
  const insets = useSafeAreaInsets();
  const { width: WIN_W } = useWindowDimensions();
   // Bottom bar sizing: fixed height safe-area on iOS only.
    const BAR_BTN_H = 44;                    // fixed button height
    const BAR_VPAD = 8;                      // vertical padding inside the bar
    const BAR_BASE_H = BAR_BTN_H + BAR_VPAD * 2; // visual bar height (without inset)
    const BAR_SAFE = Platform.OS === 'ios' ? (insets?.bottom ?? 0) : 0;
    const BAR_TOTAL_H = BAR_BASE_H + BAR_SAFE;   // total bar height that overlaps content

  // ---- store (стабильные селекторы + фолбэки вне селектора)
  const _evidenceTags     = useStore(s => s.sessionDraft?.evidenceTags);
  const evidenceTags      = _evidenceTags ?? EMPTY_ARR;

  const _pickedEmotionTop = useStore(s => s.decision?.top?.[0]);
  const _pickedEmotion    = useStore(s => s.sessionDraft?.l3?.emotionKey) || useStore(s => s.emotion);
  const emotionKey        = _pickedEmotionTop ?? _pickedEmotion ?? EMPTY_STR;

  const _storeTriggers    = useStore(s => s.sessionDraft?.l4?.triggers);
  const _storeBM          = useStore(s => s.sessionDraft?.l4?.bodyMind);
  const storeTriggers     = _storeTriggers ?? EMPTY_ARR;
  const storeBM           = _storeBM ?? EMPTY_ARR;

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

  // ---- авто-интенсивность (live)
  const { intensity: autoIntensity, confidence } = estimateIntensity({
    tags: evidenceTags,
    bodyMind: editBM,
    triggers: editTrig,
  });
  const previewIntensity = clamp(autoIntensity + intAdj, 0, 10);
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
   const TICK_SEGMENTS = 10;               // divide the circle into 10 parts
    const TICK_MARKS    = TICK_SEGMENTS + 1;// marks 11: 0..10 (top is both 0 and 10)
    const TICK_R        = 2.6;              // normal dot radius (px)
    const TICK_R_CARD   = 3.4;              // cardinal (top/bottom) dot radius (px)
    const R_DOT         = Rpath;            // place dots on the same radius as the ring (center of stroke)
    const isCardinal    = (i) => (i === 0 || i === 5 || i === 10);
    const deg2rad       = (deg) => (deg * Math.PI) / 180;

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
    <ScreenWrapper useFlexHeight style={{ backgroundColor: t.bgcolor }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator>
        <Text style={s.title}>Summary</Text>
        <Text style={s.subtitle}>
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
               {/* hour-like ticks (0..10) — top is both 0 and 10, bottom is 5 */}
                {Array.from({ length: TICK_MARKS }).map((_, i) => {
                const angleDeg = -90 + i * (360 / TICK_SEGMENTS); // start from the top, clockwise
                const angleRad = deg2rad(angleDeg);
                const cx = (CIRCLE / 2) + R_DOT * Math.cos(angleRad);
                const cy = (CIRCLE / 2) + R_DOT * Math.sin(angleRad);
                const r  = isCardinal(i) ? TICK_R_CARD : TICK_R; // <-- small point radius
                return (
                <Circle
                   key={`tick-${i}`}
                   cx={cx}
                   cy={cy}
                   r={r}
                   fill="#ffffffff"     // AA RR GG BB => opaque gray #585858
                   stroke="#00000022"
                   strokeWidth={0.5}
                 />
                );
                })}
            </Svg>
          </View>
        </View>

        {/* подпись под кругом */}
        <Text style={s.intensityBadge}>Intensity • {intensityBucket}</Text>
        <Text style={s.confNote}>{confidence >= 0.7 ? 'Auto • accurate' : 'Auto • check'}</Text>

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
    <View style={[s.bottomBar, { paddingBottom: BAR_SAFE }]} pointerEvents="box-none">
      <View style={s.bottomBarShadow} />
      <View style={[s.bottomInner, { height: BAR_BASE_H }]}>
        <TouchableOpacity style={[s.btn, s.btnSecondary, { height: BAR_BTN_H }]} onPress={onEdit}>
          <Text style={s.btnSecondaryText}>Edit</Text>
        </TouchableOpacity>
        <View style={{ width: 12 }} />
        <TouchableOpacity style={[s.btn, s.btnPrimary, { height: BAR_BTN_H }]} onPress={onContinue}>
          <Text style={s.btnPrimaryText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', color: t.textMain },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    color: t.card_choice_text,
    marginTop: 6,
    marginBottom: 16,
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
  bottomBar: {
   position: 'absolute',
   left: 0,
   right: 0,
   bottom: 0,
   backgroundColor: t.navBar,
 },
 bottomBarShadow: {
   height: 6, // feel free to set 0 if you don't want the divider fade
   backgroundColor: 'transparent',
   // a soft "haze" on top of the bar so that the content underneath is not visible
   // can be replaced with LinearGradient if desired
   borderTopWidth: StyleSheet.hairlineWidth,
   borderTopColor: '#00000016',
 },
 bottomInner: {
   paddingHorizontal: 16,
   paddingVertical: BAR_VPAD,
   backgroundColor: t.navBar,
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'space-between',
 },
 btn: {
   flex: 1,
   borderRadius: 12,
    // Ensure perfect centering for the label/content
   alignItems: 'center',
   justifyContent: 'center',
   flexDirection: 'row',
 },
 btnPrimary: {
   backgroundColor: t.button,
 },
 btnPrimaryText: {
   color: '#fff',
   fontWeight: '800',
   fontSize: 17,          // larger label
   textAlign: 'center',
   letterSpacing: 0.2,
 },
 btnSecondary: {
   backgroundColor: t.cardBg,
   borderWidth: 1,
   borderColor: '#00000022',
 },
 btnSecondaryText: {
   color: t.textMain,
   fontWeight: '800',
 },
});
