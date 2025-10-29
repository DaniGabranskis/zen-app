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
import { makeHeaderStyles, makeBarStyles, computeBar, BAR_BTN_H } from '../../ui/screenChrome';


export default function ThoughtProbe({ onChoose, onSkip, context, probeType = 'thought' }) {
  const t = useThemeVars();
  const insets = useSafeAreaInsets();

  const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);
  const sHead = makeHeaderStyles(t);
  const sBar  = makeBarStyles(t, BAR_BASE_H);

  // оставим локальный s, но пересчитаем паддинги без BAR_TOTAL:
  const s = makeStyles(t, BAR_BASE_H, BAR_BTN_H);

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

  const copy = buildProbeCopy(probeType, context);

  return (
    <View style={[s.wrap, { backgroundColor: t.bg }]}>
      <Text style={sHead.title}>{copy.title}</Text>
      <Text style={sHead.subtitle}>{copy.subtitle}</Text>

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
      <View style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]}>
        <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
          <TouchableOpacity style={[sBar.btn, sBar.btnSecondary, { height: BAR_BTN_H }]} onPress={onSkip}>
            <Text style={sBar.btnSecondaryText}>Skip</Text>
          </TouchableOpacity>

          <View style={{ width: 12 }} />

          <TouchableOpacity
            style={[ sBar.btn, sBar.btnPrimary, { height: BAR_BTN_H, opacity: canConfirm ? 1 : 0.5 } ]}
            onPress={onConfirm}
            disabled={!canConfirm}
          >
            <Text style={sBar.btnPrimaryText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (t, BAR_BASE_H, BAR_BTN_H) => StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: BAR_BASE_H + 8, // резерв без безопасной зоны (как в L5)
  },
  scrollContent: { paddingBottom: 12 },
  grid: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end'
  },
  card: {
    margin: 6,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardText: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  cardHint: { fontSize: 12, marginTop: 4, textAlign: 'center' },
});
