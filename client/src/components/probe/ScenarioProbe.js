// src/probes/ScenarioProbe.js
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeVars from '../../hooks/useThemeVars';
import { buildProbeCopy } from '../../utils/probeText';
import { useBottomSystemBar } from '../../hooks/useBottomSystemBar';
import {
  makeHeaderStyles,
  makeBarStyles,
  computeBar,
  BAR_BTN_H,
  getBarColor,
} from '../../ui/screenChrome';

export default function ScenarioProbe({
  firstOption,
  secondOption,
  onChooseFirst,
  onChooseSecond,
  onSkip,
  context,
  onChoose,
  probeType = 'scenario',
  // legacy
  a,
  b,
  chooseA,
  chooseB,
}) {
  const colors = useThemeVars();
  const insets = useSafeAreaInsets();

  // --- NEW canonical variables ---
  const screenBg = colors.background;
  const cardBg = colors.cardBackground;
  const textPrimary = colors.textPrimary;
  const textSecondary = colors.textSecondary;

  // Цвет бара + системной панели
  const barColor = getBarColor(colors);
  const isDarkTheme = colors.themeName === 'dark';

  useBottomSystemBar(barColor, isDarkTheme);

  // Бар как в L5
  const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);
  const sHead = makeHeaderStyles(colors);
  const sBar = makeBarStyles(colors, BAR_BASE_H);

  const s = makeStyles(colors, BAR_BASE_H);

  const copy = buildProbeCopy(probeType, context ?? { first: a, second: b });

const optFirst =
    firstOption ?? a ?? { label: copy.firstLabel ?? 'Option A', desc: copy.firstDesc };
  const optSecond =
    secondOption ?? b ?? { label: copy.secondLabel ?? 'Option B', desc: copy.secondDesc };

  // Вытаскиваем теги из опций, если есть
  const getOptionTags = (opt) => {
    if (!opt) return [];
    if (Array.isArray(opt.tags)) return opt.tags;
    return [];
  };

  const handleFirst =
    onChooseFirst
      ?? chooseA
      ?? (onChoose
        ? () => onChoose(getOptionTags(optFirst), optFirst.label)
        : () => {});

  const handleSecond =
    onChooseSecond
      ?? chooseB
      ?? (onChoose
        ? () => onChoose(getOptionTags(optSecond), optSecond.label)
        : () => {});

  return (
    <View style={[s.container, { backgroundColor: screenBg }]}>
      <Text style={[sHead.title, { color: colors.textPrimary }]}>
        {copy.title}
      </Text>

      <Text style={[sHead.subtitle, { color: colors.textSecondary }]}>
        {copy.subtitle}
      </Text>

      <View style={s.cards}>
        <Pressable
          style={[s.card, { backgroundColor: cardBg }]}
          onPress={handleFirst}
        >
          <Text
            style={[s.cardTitle, { color: textPrimary }]}
            numberOfLines={2}
          >
            {optFirst.label}
          </Text>
          {!!optFirst.desc && (
            <Text
              style={[s.cardDesc, { color: textSecondary }]}
              numberOfLines={3}
            >
              {optFirst.desc}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={[s.card, { backgroundColor: cardBg }]}
          onPress={handleSecond}
        >
          <Text
            style={[s.cardTitle, { color: textPrimary }]}
            numberOfLines={2}
          >
            {optSecond.label}
          </Text>
          {!!optSecond.desc && (
            <Text
              style={[s.cardDesc, { color: textSecondary }]}
              numberOfLines={3}
            >
              {optSecond.desc}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]}>
        <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
          <Pressable
            style={[sBar.btn, sBar.btnSecondary, { height: BAR_BTN_H }]}
            onPress={onSkip}
          >
            <Text style={[sBar.btnSecondaryText, { color: textPrimary }]}>
              Skip
            </Text>
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
      width: '100%',
      gap: 14,
      marginTop: 8,
    },
    card: {
      borderRadius: 14,
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
