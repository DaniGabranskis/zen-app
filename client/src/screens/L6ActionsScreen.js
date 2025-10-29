// src/screens/L6ActionsScreen.js
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';
import ScreenWrapper from '../components/ScreenWrapper';
import { makeHeaderStyles, makeBarStyles, computeBar, BAR_BTN_H } from '../ui/screenChrome';


// --- helpers -------------------------------------------------------

function pickRecommendation(dominant) {
  const map = {
    calm:       { title: '60s breath',    detail: 'Box breathing for 60 seconds.' },
    clarity:    { title: 'Note-taking',   detail: 'Write 3 bullet points to keep clarity.' },
    overwhelm:  { title: '1-minute reset',detail: 'Stand up, stretch, 10 deep breaths.' },
    anxiety:    { title: 'Breathing focus', detail: '4-7-8 breath for 60 seconds.' },
    anger:      { title: 'Cooldown walk', detail: 'Short walk, count steps to 60.' },
    sadness:    { title: 'Gentle move',   detail: '10 slow inhales with shoulder rolls.' },
    joy:        { title: 'Savor moment',  detail: 'Name 3 pleasant details you notice.' },
    gratitude:  { title: 'Gratitude note',detail: 'Write one thanks to someone.' },
  };
  return map[dominant] ?? { title: '60s breath', detail: 'Box breathing for 60 seconds.' };
}

function aiSummaryPlaceholder(dominant) {
  if (!dominant)
    return 'We analyzed your answers. Here is a short actionable suggestion.';
  return `Current state leans toward “${dominant}”. Try a short, concrete action below to consolidate progress.`;
}

// --- component -----------------------------------------------------

export default function L6ActionsScreen({ navigation }) {
  const t = useThemeVars();
  const insets = useSafeAreaInsets();

  const BAR_BTN_H  = 44;
  const BAR_VPAD   = 8;
  const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);
  const sHead = makeHeaderStyles(t);
  const sBar  = makeBarStyles(t, BAR_BASE_H);

  const decision = useStore(s => s.sessionDraft?.decision);
  const emotionKey = useStore(s => s.sessionDraft?.l3?.emotionKey);
  const finishSession = useStore(s => s.finishSession);

  const dominant = decision?.top?.[0] || emotionKey || null;

  const rec  = useMemo(() => pickRecommendation(dominant), [dominant]);
  const desc = useMemo(() => aiSummaryPlaceholder(dominant), [dominant]);

  const s = makeStyles(t, BAR_BASE_H, BAR_BTN_H, BAR_VPAD);

  const startRecommendation = () => {
    navigation.navigate('ExercisePlaceholder', {
      dominant,
      recommendation: rec,
    });
  };

  const skipAndFinish = () => {
    Promise.resolve(
      finishSession({ skip: true, recommendation: rec })
    ).finally(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }], // корневой роут из вашего navigation.js
      });
    });
  };

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: t.bg }}>
      <View style={s.wrap}>

      {/* Header & subtext (как в ThoughtProbe) */}
      <Text style={sHead.title}>Let’s bring your reflection into action.</Text>
      <Text style={sHead.subtitle}>Based on your reflection, here’s something gentle you can try next.</Text>

      {/* Content (без ScrollView) */}
      <View>
        {/* Recommendation block (top) */}
        <View style={[s.card, { backgroundColor: t.cardBg }]}>
          <Text style={[s.cardTitle, { color: t.textMain }]}>Recommendation</Text>
          <Text style={[s.cardSubtitle, { color: t.card_choice_text }]}>{rec.title}</Text>
          <Text style={[s.cardBody, { color: t.textMain }]}>{rec.detail}</Text>
        </View>

        {/* Description block (below) */}
        <View style={[s.card, { backgroundColor: t.cardBg }]}>
          <Text style={[s.cardTitle, { color: t.textMain }]}>Short description</Text>
          <Text style={[s.cardBody, { color: t.textSub }]}>{desc}</Text>
        </View>
      </View>

      {/* Bottom bar (как в ThoughtProbe): левая secondary, правая primary */}
      <View style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]} pointerEvents="box-none">
      <View style={sBar.bottomBarShadow} />
      <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
        <TouchableOpacity
          style={[sBar.btn, sBar.btnSecondary, { height: BAR_BTN_H }]}
          onPress={skipAndFinish}
          activeOpacity={0.85}
        >
          <Text style={sBar.btnSecondaryText}>Skip & Finish</Text>
        </TouchableOpacity>
        <View style={{ width: 12 }} />
        <TouchableOpacity
          style={[sBar.btn, sBar.btnPrimary, { height: BAR_BTN_H }]}
          onPress={startRecommendation}
          activeOpacity={0.85}
        >
          <Text style={sBar.btnPrimaryText}>Start recommendation</Text>
        </TouchableOpacity>
      </View>
    </View>
    </View>
  </ScreenWrapper>
);
}

// --- styles (единый объект s, без styles.*) -----------------------

const makeStyles = (t, BAR_BASE_H, BAR_BTN_H, BAR_VPAD) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: BAR_BASE_H + 8,
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
      marginTop: 4,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '400',
      textAlign: 'center',
      marginTop: 6,
      marginBottom: 10,
    },

    // карточки контента L6 (рекомендация / описание)
    card: {
      margin: 6,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 10,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    cardTitle:    { fontSize: 16, fontWeight: '800',  marginBottom: 6, textAlign: 'left' },
    cardSubtitle: { fontSize: 14, fontWeight: '600',  marginBottom: 4, textAlign: 'left' },
    cardBody:     { fontSize: 14, lineHeight: 20,     textAlign: 'left' },

    // Нижний бар — как в ThoughtProbe
    bottomBar: {
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
      backgroundColor: t.navBar,
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
    bottomBarShadow: {
      height: 6,
      backgroundColor: 'transparent',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#00000016',
    },

    // Кнопки
    btn: {
      flex: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    btnPrimary:  { backgroundColor: t.button },
    btnPriText:  { color: '#fff', fontWeight: '800', fontSize: 17, textAlign: 'center', letterSpacing: 0.2 },

    btnSecondary: {
      backgroundColor: t.cardBg,
      borderWidth: 1,
      borderColor: '#00000022',
    },
    btnSecText:  { fontWeight: '800', fontSize: 17, textAlign: 'center' },
  });
