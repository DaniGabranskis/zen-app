import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeVars from '../../hooks/useThemeVars';
import { THOUGHT_ITEMS } from '../../utils/probeContent';
import { zeroVector, accumulate } from '../../utils/emotionSpace';
import { buildProbeCopy } from '../../utils/probeText';

export default function ThoughtProbe({ onChoose, onSkip, context, probeType = 'thought' }) {
  const t = useThemeVars();
  const insets = useSafeAreaInsets();

  const BAR_BTN_H  = 44;
  const BAR_VPAD   = 10;
  const BAR_BASE_H = BAR_BTN_H + BAR_VPAD * 2;
  const BAR_SAFE   = Platform.OS === 'ios' ? (insets?.bottom ?? 0) : 0;
  const BAR_TOTAL  = BAR_BASE_H + BAR_SAFE;

  const [selected, setSelected] = useState({}); // {key: true/false}

  const toggle = (key) => {
    setSelected((s) => ({ ...s, [key]: !s[key] }));
  };

  const canConfirm = useMemo(
    () => Object.values(selected).some(Boolean),
    [selected]
  );

  const onConfirm = () => {
    let delta = zeroVector();
    THOUGHT_ITEMS.forEach((opt) => {
      if (selected[opt.key]) delta = accumulate(delta, opt.tags);
    });
    onChoose(delta, 'thought_items');
  };

  const s = makeStyles(t, BAR_TOTAL, BAR_BTN_H, BAR_VPAD);
  const copy = buildProbeCopy(probeType, context);

  return (
    <View style={[s.wrap, { backgroundColor: t.bg }]}>
      <Text style={[s.title, { color: t.textMain }]}>{copy.title}</Text>
      <Text style={[s.subtitle, { color: t.card_choice_text }]}>{copy.subtitle}</Text>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.grid}>
          {THOUGHT_ITEMS.map((opt) => {
            const active = !!selected[opt.key];
            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.85}
                onPress={() => toggle(opt.key)}
                style={[
                  s.card,
                  { backgroundColor: active ? t.presscardBg : t.cardBg },
                ]}
              >
                <Text style={[s.cardText, { color: t.textMain }]}>
                  {opt.label}
                </Text>
                {opt.hint ? (
                  <Text style={[s.cardHint, { color: t.textSub }]}>
                    {opt.hint}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Нижний бар: Skip + Confirm */}
      <View style={[s.bottomBar, { paddingBottom: BAR_SAFE }]}>
        <View style={[s.bottomInner, { height: BAR_BASE_H }]}>
          <TouchableOpacity
            style={[s.btn, s.btnSecondary, { height: BAR_BTN_H }]}
            onPress={onSkip}
          >
            <Text style={[s.btnSecText, { color: t.textMain }]}>Skip</Text>
          </TouchableOpacity>

          <View style={{ width: 12 }} />

          <TouchableOpacity
            style={[
              s.btn,
              s.btnPrimary,
              { height: BAR_BTN_H, opacity: canConfirm ? 1 : 0.5 },
            ]}
            onPress={onConfirm}
            disabled={!canConfirm}
          >
            <Text style={s.btnPriText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (t, BAR_TOTAL, BAR_BTN_H, BAR_VPAD) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: BAR_TOTAL + 8,
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
    scrollContent: { paddingBottom: 12 },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    card: {
      width: '46%',
      margin: 6,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 10,
      alignItems: 'center',
      // «объём» без бордера
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    cardText: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
    cardHint: { fontSize: 12, marginTop: 4, textAlign: 'center' },

    // Нижний бар как в L5
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
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
    btn: {
      flex: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    btnPrimary: { backgroundColor: t.button },
    btnPriText: {
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
    btnSecText: { fontWeight: '800', fontSize: 17, textAlign: 'center' },
  });
