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
  getBarColor
} from '../../ui/screenChrome';

export default function VisualProbe(props) {
  const {
    firstOption,
    secondOption,
    onChooseFirst,
    onChooseSecond,
    onChoose,
    onSkip,
    context,
    probeType = 'visual',
    a,
    b,
    chooseA,
    chooseB,
  } = props;

  const copy = buildProbeCopy(probeType, context ?? { first: a, second: b });

  const optionFirst =
    firstOption ?? a ?? { label: copy.firstLabel ?? 'Option A' };
  const optionSecond =
    secondOption ?? b ?? { label: copy.secondLabel ?? 'Option B' };

  // Вытаскиваем теги, если они есть у опций
  const getOptionTags = (opt) => {
    if (!opt) return [];
    // если в объекте опции есть поле tags, используем его
    if (Array.isArray(opt.tags)) return opt.tags;
    return [];
  };

  const handleChooseFirst =
    onChooseFirst
      ?? chooseA
      ?? (onChoose
        ? () => onChoose(getOptionTags(optionFirst), optionFirst.label)
        : () => {});

  const handleChooseSecond =
    onChooseSecond
      ?? chooseB
      ?? (onChoose
        ? () => onChoose(getOptionTags(optionSecond), optionSecond.label)
        : () => {});

  const colors = useThemeVars();
  const insets = useSafeAreaInsets();

  // --- NEW canonical variables ---
  const screenBg = colors.background;
  const cardBg = colors.cardBackground;
  const cardBgPressed = colors.cardBackgroundPressed;
  const textPrimary = colors.textPrimary;
  const dividerColor = colors.dividerColor;

  const barColor = getBarColor(colors);
  const isDarkTheme = colors.themeName === 'dark';

  useBottomSystemBar(barColor, isDarkTheme);

  const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);

  // передаём всю тему — теперь makeHeaderStyles/makeBarStyles сами берут нужные поля
  const sHead = makeHeaderStyles(colors);
  const sBar  = makeBarStyles(colors, BAR_BASE_H);

  const styles = makeStyles(colors, BAR_BASE_H);

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <Text style={[sHead.title, { color: colors.textPrimary }]}>
        {copy.title}
      </Text>

      <Text style={[sHead.subtitle, { color: colors.textSecondary }]}>
        {copy.subtitle}
      </Text>

      <View style={styles.cards}>
        <Pressable
          style={({ pressed }) => ([
            styles.card,
            styles.shadowCard,
            { backgroundColor: pressed ? cardBgPressed : cardBg },
          ])}
          onPress={handleChooseFirst}
          android_ripple={{ color: dividerColor }}
        >
          <Text style={[styles.cardText, { color: textPrimary }]}>
            {optionFirst.label}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => ([
            styles.card,
            styles.shadowCard,
            { backgroundColor: pressed ? cardBgPressed : cardBg },
          ])}
          onPress={handleChooseSecond}
          android_ripple={{ color: dividerColor }}
        >
          <Text style={[styles.cardText, { color: textPrimary }]}>
            {optionSecond.label}
          </Text>
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
    },
    card: {
      borderRadius: 14,
      paddingVertical: 18,
      paddingHorizontal: 16,
    },
    shadowCard: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    cardText: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
