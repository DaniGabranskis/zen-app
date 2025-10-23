// src/probes/VisualProbe.js
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeVars from '../../hooks/useThemeVars';
import { buildProbeCopy } from '../../utils/probeText';

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
    onChoose,
    onSkip,
    context,
    probeType = 'visual',
    a,
    b,
    chooseA,
    chooseB,
  } = props;

  // Map legacy props to new names if new ones are not provided
  const copy = buildProbeCopy(probeType, context ?? { first: a, second: b });
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
  const BAR_BTN_H = 44;
  const BAR_VPAD = 10;
  const BAR_BASE_H = BAR_BTN_H + BAR_VPAD * 2;
  const BAR_SAFE = Platform.OS === 'ios' ? (insets?.bottom ?? 0) : 0;

  const styles = makeStyles(colors, BAR_BASE_H);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title,   { color: colors.textMain, textAlign: 'center' }]}>
        {copy.title}
      </Text>
      <Text style={[styles.subtitle,{ color: colors.textSub,  textAlign: 'center' }]}>
        {copy.subtitle}
      </Text>

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
      <View style={[styles.bottomBar, { paddingBottom: BAR_SAFE }]}>
        <View style={[styles.bottomInner, { height: BAR_BASE_H }]}>
          <Pressable
            style={[styles.btn, styles.btnSecondary, { height: BAR_BTN_H }]}
            onPress={onSkip}
          >
            <Text style={styles.btnSecondaryText}>Skip</Text>
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
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: BAR_BASE_H + 8, // keep content above the bottom bar
      justifyContent: 'flex-start',
    },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
    subtitle: { fontSize: 14, opacity: 0.9, marginBottom: 28, textAlign: 'center' },

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

    // Bottom bar (consistent with L5)
    bottomBar: {
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
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
