// src/ui/screenChrome.js
import { StyleSheet, Platform } from 'react-native';

export const BAR_BTN_H = 44;   // единый размер кнопок
export const BAR_VPAD  = 8;    // вертикальные отступы в баре

export function computeBar(insets) {
  const BAR_BASE_H = BAR_BTN_H + BAR_VPAD * 2;                 // визуальная высота бара (без safe-area)
  const BAR_SAFE   = Platform.OS === 'ios' ? (insets?.bottom ?? 0) : 0; // как в L5
  return { BAR_BASE_H, BAR_SAFE };
}

// Единые стили заголовка и сабтекста (как в L5)
export function makeHeaderStyles(t) {
  return StyleSheet.create({
    title: {
      fontSize: 28,
      fontWeight: '900',
      textAlign: 'center',
      color: t.textMain,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '400',
      textAlign: 'center',
      color: t.card_choice_text,
      marginTop: 6,
      marginBottom: 16,
    },
  });
}

// Единые стили нижнего бара (как в L5/L6)
export function makeBarStyles(t, BAR_BASE_H) {
  return StyleSheet.create({
    // Контейнер-оверлей бара
    bottomBar: {
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
      backgroundColor: t.navBar,
    },
    // Тонкий разделитель/“хейз”
    bottomBarShadow: {
      height: 6,
      backgroundColor: 'transparent',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#00000016',
    },
    // Внутренняя зона бара
    bottomInner: {
      paddingHorizontal: 16,
      paddingVertical: BAR_VPAD,
      backgroundColor: t.navBar,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      // высоту пробрасываем снаружи: { height: BAR_BASE_H }
    },

    // Кнопки
    btn: {
      flex: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    btnPrimary: { backgroundColor: t.button },
    btnPrimaryText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 17,
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
      fontSize: 17,
      textAlign: 'center',
    },
  });
}
