// src/probes/BodyProbe.js
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeVars from '../../hooks/useThemeVars';
import { buildProbeCopy } from '../../utils/probeText';

  export default function BodyProbe({
    firstOption, secondOption, onChooseFirst, onChooseSecond, onSkip,
    context, probeType = 'body',
    // legacy
    a, b, chooseA, chooseB,
  }) {
  const t = useThemeVars();
  const insets = useSafeAreaInsets();

  // Бар как в L5
  const BAR_BTN_H = 44;
  const BAR_VPAD = 10;
  const BAR_BASE_H = BAR_BTN_H + BAR_VPAD * 2;
  const BAR_SAFE = Platform.OS === 'ios' ? (insets?.bottom ?? 0) : 0;

  const copy = buildProbeCopy(probeType, context ?? { first: a, second: b });
  const optFirst  = firstOption  ?? a ?? { label: copy.firstLabel ?? 'Option A' };
  const optSecond = secondOption ?? b ?? { label: copy.secondLabel ?? 'Option B' };
  const handleFirst  = onChooseFirst  ?? chooseA ?? (()=>{});
  const handleSecond = onChooseSecond ?? chooseB ?? (()=>{});

  const s = makeStyles(t, BAR_BASE_H);

  return (
  <View style={[s.container, { backgroundColor: t.bg }]}>
    <Text style={[s.title, { color: t.textMain }]}>{copy.title}</Text>
    <Text style={[s.subtitle, { color: t.card_choice_text }]}>{copy.subtitle}</Text>

      <View style={s.cards}>
      <Pressable style={s.card} onPress={handleFirst}>
        <Text style={[s.cardText, { color: t.textMain }]} numberOfLines={2} textAlign="center">
          {optFirst.label}
        </Text>
      </Pressable>

      <Pressable style={s.card} onPress={handleSecond}>
        <Text style={[s.cardText, { color: t.textMain }]} numberOfLines={2} textAlign="center">
          {optSecond.label}
        </Text>
      </Pressable>
    </View>

      <View style={[s.bottomBar, { paddingBottom: BAR_SAFE }]}>
        <View style={[s.bottomInner, { height: BAR_BASE_H }]}>
          <Pressable style={[s.btn, s.btnSecondary, { height: BAR_BTN_H }]} onPress={onSkip}>
            <Text style={s.btnSecondaryText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (t, BAR_BASE_H) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      paddingBottom: BAR_BASE_H + 8,
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
      marginTop: 8,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '400',
      textAlign: 'center',
      marginTop: 6,
      marginBottom: 12,
    },
    cards: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'center',
      alignItems: 'stretch',
      paddingTop: 8,
    },
    card: {
      flex: 1,
      backgroundColor: t.cardBg,
      borderRadius: 12,
      paddingVertical: 18,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    cardText: {
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    },

    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.navBar,
    },
    bottomInner: {
      backgroundColor: t.navBar,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#00000016',
    },
    btn: {
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    btnSecondary: {
      backgroundColor: t.cardBg,
      borderWidth: 1,
      borderColor: '#00000022',
    },
    btnSecondaryText: {
      color: t.textMain,
      fontWeight: '800',
      fontSize: 17,
      textAlign: 'center',
      letterSpacing: 0.2,
    },
  });
