// src/probes/ScenarioProbe.js
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeVars from '../../hooks/useThemeVars';
import { buildProbeCopy } from '../../utils/probeText';
import { makeHeaderStyles, makeBarStyles, computeBar, BAR_BTN_H } from '../../ui/screenChrome';


export default function ScenarioProbe({
  firstOption, secondOption, onChooseFirst, onChooseSecond, onSkip,
  context, probeType = 'scenario',
  // legacy
  a, b, chooseA, chooseB,
}) {
  const t = useThemeVars();
  const insets = useSafeAreaInsets();
  
  // Бар как в L5
  const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);
  const sHead = makeHeaderStyles(t);
  const sBar  = makeBarStyles(t, BAR_BASE_H);

  const s = makeStyles(t, BAR_BASE_H);

  const copy = buildProbeCopy(probeType, context ?? { first: a, second: b });

  const optFirst  = firstOption  ?? a ?? { label: copy.firstLabel ?? 'Option A', desc: copy.firstDesc };
  const optSecond = secondOption ?? b ?? { label: copy.secondLabel ?? 'Option B', desc: copy.secondDesc };

  const handleFirst  = onChooseFirst  ?? chooseA ?? (()=>{});
  const handleSecond = onChooseSecond ?? chooseB ?? (()=>{});

  return (
    <View style={[s.container, { backgroundColor: t.bg }]}>
      <Text style={sHead.title}>{copy.title}</Text>
      <Text style={sHead.subtitle}>{copy.subtitle}</Text>

      <Pressable style={s.card} onPress={handleFirst}>
        <Text style={[s.cardTitle, { color: t.textMain }]} numberOfLines={2} textAlign="center">
          {optFirst.label}
        </Text>
        {!!optFirst.desc && (
          <Text style={[s.cardDesc, { color: t.textSub }]} numberOfLines={3} textAlign="center">
            {optFirst.desc}
          </Text>
        )}
      </Pressable>

      <Pressable style={s.card} onPress={handleSecond}>
        <Text style={[s.cardTitle, { color: t.textMain }]} numberOfLines={2} textAlign="center">
          {optSecond.label}
        </Text>
        {!!optSecond.desc && (
          <Text style={[s.cardDesc, { color: t.textSub }]} numberOfLines={3} textAlign="center">
            {optSecond.desc}
          </Text>
        )}
      </Pressable>

      <View style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]}>
        <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
          <Pressable style={[sBar.btn, sBar.btnSecondary, { height: BAR_BTN_H }]} onPress={onSkip}>
            <Text style={sBar.btnSecondaryText}>Skip</Text>
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
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: BAR_BASE_H + 8,
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
      paddingVertical: 16,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
    },
    cardDesc: {
      fontSize: 13,
      fontWeight: '400',
      textAlign: 'center',
      marginTop: 6,
    },
  });
