// src/probes/VisualProbe.js
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeVars from '../../hooks/useThemeVars';
import { buildProbeCopy } from '../../utils/probeText';
import { makeHeaderStyles, makeBarStyles, computeBar, BAR_BTN_H } from '../../ui/screenChrome';


/**
 * VisualProbe
 * Props (new, preferred):
 *  - firstOption:  { label: string }
 *  - secondOption: { label: string }
 *  - onChooseFirst(): void
 *  - onChooseSecond(): void
 *  - onSkip(): void
 *
 * Backward compatibility (legacy props):
 *  - a, b, chooseA, chooseB
 */
export default function VisualProbe(props) {
  const {
    firstOption,
    secondOption,
    onChooseFirst,
    onChooseSecond,
    onChoose,        // unified optional callback
    onSkip,
    context,
    probeType = 'visual',
    a,
    b,
    chooseA,
    chooseB,
  } = props;

  // Build copy based on probeType + context (fallback to legacy a/b if needed)
  const copy = buildProbeCopy(probeType, context ?? { first: a, second: b });

  // IMPORTANT: define options BEFORE using them in handlers or JSX
  const optionFirst =
    firstOption ?? a ?? { label: copy.firstLabel ?? 'Option A' };
  const optionSecond =
    secondOption ?? b ?? { label: copy.secondLabel ?? 'Option B' };

  // Handlers resolution priority:
  // 1) explicit onChooseFirst/onChooseSecond
  // 2) legacy chooseA/chooseB
  // 3) unified onChoose('first'|'second', option)
  // 4) no-op fallback
  const handleChooseFirst =
    onChooseFirst
      ?? chooseA
      ?? (onChoose ? () => onChoose('first', optionFirst) : () => {});

  const handleChooseSecond =
    onChooseSecond
      ?? chooseB
      ?? (onChoose ? () => onChoose('second', optionSecond) : () => {});

  const colors = useThemeVars();
  const insets = useSafeAreaInsets();

  // Bottom bar sizing (same approach as L5)
  const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);
  const sHead = makeHeaderStyles(colors);
  const sBar  = makeBarStyles(colors, BAR_BASE_H);

  const styles = makeStyles(colors, BAR_BASE_H);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={sHead.title}>{copy.title}</Text>
      <Text style={sHead.subtitle}>{copy.subtitle}</Text>

      <View style={styles.cards}>
        <Pressable
          style={({ pressed }) => ([
            styles.card,
            styles.shadowCard,
            { backgroundColor: pressed ? colors.pressBg : colors.cardBg },
          ])}
          onPress={handleChooseFirst}
          android_ripple={{ color: colors.divider }}
        >
          <Text
            style={[styles.cardText, { color: colors.textMain, textAlign: 'center' }]}
            numberOfLines={2}
          >
            {optionFirst.label}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => ([
            styles.card,
            styles.shadowCard,
            { backgroundColor: pressed ? colors.pressBg : colors.cardBg },
          ])}
          onPress={handleChooseSecond}
          android_ripple={{ color: colors.divider }}
        >
          <Text
            style={[styles.cardText, { color: colors.textMain, textAlign: 'center' }]}
            numberOfLines={2}
          >
            {optionSecond.label}
          </Text>
        </Pressable>
      </View>

      {/* Bottom bar with a single Skip button */}
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
    // Layout
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: BAR_BASE_H + 8,
    },
    // Cards row
    cards: {
      width: '100%',
      gap: 14,
    },
    // Card visual (no border, soft shadow)
    card: {
      borderRadius: 14,
      paddingVertical: 18,
      paddingHorizontal: 16,
    },
    shadowCard: {
      // iOS
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      // Android
      elevation: 3,
    },
    cardText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  });
