import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';

export default function HistoryResultModal({ route, navigation }) {
  const t = useThemeVars();
  const item = route.params || {};
  const date = new Date(item.date || item.createdAt || Date.now()).toLocaleString();

  const s = makeStyles(t);

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={s.wrap}>
        <Text style={s.title}>Session details</Text>
        <Text style={[s.meta, { color: t.textSub }]}>{date}</Text>

        <View style={[s.card, { backgroundColor: t.cardBg }]}>
          <Text style={s.cardLabel}>Dominant emotion</Text>
          <Text style={s.value}>{item.dominantGroup || '—'}</Text>
        </View>

        <View style={[s.card, { backgroundColor: t.cardBg }]}>
          <Text style={s.cardLabel}>Score</Text>
          <Text style={s.value}>{typeof item.score === 'number' ? `${item.score}/100` : '—'}</Text>
        </View>

        <View style={[s.card, { backgroundColor: t.cardBg }]}>
          <Text style={s.cardLabel}>Reflection</Text>
          <Text style={[s.paragraph, { color: t.textSub }]}>{item.reflection || '—'}</Text>
        </View>

        <View style={[s.card, { backgroundColor: t.cardBg }]}>
          <Text style={s.cardLabel}>Recommendation</Text>
          <Text style={s.value}>{item?.recommendation?.title || '—'}</Text>
          <Text style={[s.paragraph, { color: t.textSub }]}>{item?.recommendation?.detail || ''}</Text>
          {item?.recommendation?.skipped ? <Text style={s.badge}>skipped</Text> : null}
        </View>

        {/* raw session snapshot (optional quick view) */}
        {item.session ? (
          <View style={[s.card, { backgroundColor: t.cardBg }]}>
            <Text style={s.cardLabel}>Session snapshot</Text>
            {/* L4 */}
            <Text style={s.sectionTitle}>L4</Text>
            <Text style={s.key}>Triggers:</Text>
            <Text style={[s.paragraph, { color: t.textSub }]}>
              {(item.session?.l4?.triggers || []).join(', ') || '—'}
            </Text>
            <Text style={s.key}>Body & Mind:</Text>
            <Text style={[s.paragraph, { color: t.textSub }]}>
              {(item.session?.l4?.bodyMind || []).join(', ') || '—'}
            </Text>
            <Text style={s.key}>Intensity:</Text>
            <Text style={s.value}>{item.session?.l4?.intensity ?? '—'}</Text>

            {/* L6 */}
            <Text style={s.sectionTitle}>L6</Text>
            <Text style={s.key}>Insight:</Text>
            <Text style={[s.paragraph, { color: t.textSub }]}>{item.session?.l6?.insight || '—'}</Text>
            <Text style={s.key}>Accuracy:</Text>
            <Text style={s.value}>{item.session?.l6?.accuracy ?? '—'}</Text>
          </View>
        ) : null}
      </ScrollView>
    </ScreenWrapper>
  );
}

const makeStyles = (t) => StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center', color: t.textMain, marginTop: 6 },
  meta: { fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 10 },
  card: {
    borderRadius: 12, padding: 12, marginTop: 12,
    borderWidth: 1, borderColor: '#00000012',
  },
  cardLabel: { fontSize: 14, fontWeight: '800', marginBottom: 6, color: t.textMain },
  sectionTitle: { fontSize: 13, fontWeight: '800', marginTop: 8, marginBottom: 4, color: t.textMain },
  key: { fontSize: 12, fontWeight: '700', marginTop: 6, color: t.textMain },
  value: { fontSize: 14, fontWeight: '700', color: t.textMain },
  paragraph: { fontSize: 14, lineHeight: 20 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#00000012',
    color: t.textMain,
    fontSize: 12,
    fontWeight: '700',
  },
});
