// src/screens/L6ActionsScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function pickPrimaryAction({ emotion, intensity }) {
  // very small deterministic set; replace with your existing action picking logic when ready
  if (emotion === 'tension') {
    return 'Unclench routine: jaw–shoulders–hands for 60 seconds; slow exhale x6.';
  }
  if (emotion === 'anxiety') {
    return '4-6 breathing: inhale 4, exhale 6, repeat x8.';
  }
  if (emotion === 'sadness') {
    return 'Gentle walk: 5–10 minutes, notice 3 pleasant details.';
  }
  return 'Slow breathing for 60 seconds and a glass of water.';
}

export default function L6ActionsScreen({ navigation }) {
  const t = useThemeVars();
  const insets = useSafeAreaInsets();
  const emotion = useStore(s => s.decision?.top?.[0] ?? s.emotion ?? '-');
  const intensity = useStore(s => s.l4?.intensity ?? 5);
  const action = pickPrimaryAction({ emotion, intensity });

  const s = makeStyles(t, insets);

  const onStartBreathing = () => {
    // navigate to your breathing screen if you have one; adjust route name/params
    navigation.navigate('BreathPractice', { preset: 'box' });
  };

  const onFinish = () => {
    navigation.navigate('Home'); // or a result screen if you have one
  };

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: t.bgcolor }}>
      <View style={s.wrap}>
        <Text style={s.title}>What to do now</Text>
        <View style={s.card}>
          <Text style={s.cardLabel}>Recommended for {String(emotion)} · intensity {intensity}/10</Text>
          <Text style={s.actionText}>{action}</Text>
        </View>

        <TouchableOpacity style={s.btnPrimary} onPress={onStartBreathing}>
          <Text style={s.btnPrimaryText}>Start breathing</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} onPress={onFinish}>
          <Text style={s.btnSecondaryText}>Finish</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const makeStyles = (t, insets) => StyleSheet.create({
  wrap: { flex: 1, padding: 16, paddingBottom: (insets?.bottom ?? 0) + 96, backgroundColor: t.bgcolor },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', color: t.textMain, marginBottom: 12 },
  card: { backgroundColor: t.cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#00000012' },
  cardLabel: { fontSize: 12, color: t.textSub, marginBottom: 8 },
  actionText: { fontSize: 16, color: t.textMain, fontWeight: '600' },

  btnPrimary: {
    position: 'absolute', left: 16, right: 16,
    bottom: Math.max(56, (insets?.bottom ?? 0) + 56),
    backgroundColor: t.button, borderRadius: 12, alignItems: 'center', padding: 14,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800' },

  btnSecondary: {
    position: 'absolute', left: 16, right: 16,
    bottom: Math.max(8, (insets?.bottom ?? 0) + 8),
    backgroundColor: t.cardBg, borderRadius: 12, alignItems: 'center', padding: 14, borderWidth: 1, borderColor: '#00000022',
  },
  btnSecondaryText: { color: t.textMain, fontWeight: '800' },
});
