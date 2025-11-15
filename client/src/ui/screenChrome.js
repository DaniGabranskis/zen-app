// src/ui/screenChrome.js
import { StyleSheet, Platform } from 'react-native';

export const BAR_BTN_H = 44;
export const BAR_VPAD  = 8;

export function computeBar(insets) {
  const BAR_BASE_H = BAR_BTN_H + BAR_VPAD * 2;
  const BAR_SAFE   = Platform.OS === 'ios' ? (insets?.bottom ?? 0) : 0;
  return { BAR_BASE_H, BAR_SAFE };
}

// 🔹 Single source of truth for bar color
export function getBarColor(t) {
  // If in future you want to change bar logic,
  // you only modify this function.
  return t.navBackground || t.navBar || t.background;
}

export function makeHeaderStyles(t) {
  return StyleSheet.create({
    title: {
      fontSize: 28,
      fontWeight: '900',
      textAlign: 'center',
      color: t.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '400',
      textAlign: 'center',
      color: t.cardChoiceText,
      marginTop: 6,
      marginBottom: 16,
    },
  });
}

export function makeBarStyles(t, BAR_BASE_H) {
  const barColor = getBarColor(t);

  return StyleSheet.create({
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: barColor,
    },
    bottomBarShadow: {
      height: 6,
      backgroundColor: 'transparent',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#00000016',
    },
    bottomInner: {
      paddingHorizontal: 16,
      paddingVertical: BAR_VPAD,
      backgroundColor: barColor,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    btn: {
      flex: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    btnPrimary: { backgroundColor: t.accent },
    btnPrimaryText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 17,
      textAlign: 'center',
      letterSpacing: 0.2,
    },
    btnSecondary: {
      backgroundColor: t.cardBackground,
      borderWidth: 1,
      borderColor: '#00000022',
    },
    btnSecondaryText: {
      color: t.textPrimary,
      fontWeight: '800',
      fontSize: 17,
      textAlign: 'center',
    },
  });
}
