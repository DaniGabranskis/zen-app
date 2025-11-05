// screens/StatsScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';
import ScreenWrapper from '../components/ScreenWrapper';
import DonutChart from '../components/DonutChart';
import StreakProgress from '../components/StreakProgress';
import useStats from '../hooks/useStats';
import WeekActivityRow from '../components/WeekActivityRow';
import TimeRangeToggle from '../components/TimeRangeToggle';
import { getEmotionMeta } from '../utils/evidenceEngine';
import EmotionalBalanceBar from '../components/EmotionalBalanceBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// === Layout knobs (adjust as you like) ===
const BLOCK_WIDTH = Math.round(SCREEN_WIDTH * 0.90);
// 60/40 split inside the card:
const DONUT_SIDE = Math.round(SCREEN_WIDTH * 0.50); // ← donut size (left)
const LEGEND_WIDTH = Math.round(SCREEN_WIDTH * 0.30); // ← legend box width (right)
const P = Math.round(SCREEN_WIDTH * 0.05);
const P_SMALL = Math.round(SCREEN_WIDTH * 0.02);
const P_LARGE = Math.round(SCREEN_WIDTH * 0.08);

export default function StatsScreen() {
  const { bgcolor, textMain, cardBg, divider } = useThemeVars();
  const history = useStore((state) => state.history) || [];

  const [range, setRange] = useState('week');
  const { pieData, streaks, week } = useStats(history);

  // Filter history by range (week/month)
  const now = new Date();
  let filteredHistory = [...history];

  if (range === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);
    filteredHistory = history.filter((item) => new Date(item.date) >= weekAgo);
  } else if (range === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);
    filteredHistory = history.filter((item) => new Date(item.date) >= monthAgo);
  }

  const filteredStats = useStats(filteredHistory);

  // Build donut series with canonical emotion colors + label(count)
  const chartData = filteredStats.pieData.map((d) => {
    const meta = getEmotionMeta(d.name);
    const color = Array.isArray(meta?.color) ? meta.color[0] : meta?.color || '#A78BFA';
    return {
      value: d.population,
      color,
      label: d.name,
      name: d.name, // keep original name if needed later
      count: d.population,
    };
  });

  // Emotional balance: use meta-driven polarity (data first, no hardcoded sets)
  const mapEmotionToPolarity = (name) => getEmotionMeta(name)?.polarity || 'neutral';

  const currentStreak = streaks.currentStreak;
  const bestStreak = streaks.bestStreak;

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: bgcolor }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Unified screen header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textMain }]}>Your Stats</Text>
          <View style={[styles.divider, { backgroundColor: divider }]} />
        </View>

        {pieData.length === 0 ? (
          <Text style={[styles.empty, { color: textMain, opacity: 0.6 }]}>No data yet</Text>
        ) : (
          <>
            {/* Week activity + streaks card */}
            <View style={[styles.blockWeekActivityRow, { backgroundColor: cardBg }]}>
              <WeekActivityRow week={week} />
              <View style={styles.streakMiniWrapper}>
                <StreakProgress current={currentStreak} best={bestStreak} width={BLOCK_WIDTH - 50} />
              </View>
            </View>

            {/* Emotional Balance (positive vs negative) */}
           <View style={[styles.block, { backgroundColor: cardBg }]}>
             <Text style={[styles.cardTitle, { color: textMain }]}>Emotional Balance</Text>
             <EmotionalBalanceBar
               items={chartData.map(x => ({ name: x.name, count: x.count }))}
               mapEmotionToPolarity={mapEmotionToPolarity}
               width={BLOCK_WIDTH - 24}   // inner width with small side padding
               height={24}
               gapPx={12}
             />
           </View>

            {/* Donut (left) + Legend (right) card */}
            <View style={[styles.block, { backgroundColor: cardBg }]}>
              {/* Top-right range toggle */}
              <View style={styles.toggleRow}>
                <TimeRangeToggle selected={range} onToggle={setRange} />
              </View>

              <View style={styles.hRow}>
                {/* LEFT: donut, smaller and closer to the left edge */}
                <View style={{ width: DONUT_SIDE, height: DONUT_SIDE}}>
                  <DonutChart
                    data={chartData}
                    containerWidth={DONUT_SIDE}
                    maxLabelFraction={0.28}
                    baseFont={11}
                    smallFont={10}
                    showOuterLabels={false}
                  />
                </View>

                {/* RIGHT: legend list */}
                <View
                  style={{
                    width: LEGEND_WIDTH,
                    height: DONUT_SIDE,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginLeft: 13,
                  }}
                >
                  <LegendList data={chartData} width={LEGEND_WIDTH} />
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

/* ---------- Test Legend (inline) ---------- */
/* Renders colored square, label(count) and percentage, sorted by value desc */
function LegendList({ data, width }) {
  const { textMain } = useThemeVars();
  const items = [...data].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  const total = items.reduce((acc, it) => acc + (Number(it.value) || 0), 0) || 1;

  return (
    <View style={{ width, paddingLeft: 4 }}>
      {items.map((it, idx) => {
        return (
          <View key={idx} style={legendStyles.row}>
            {/* color square */}
            <View style={[legendStyles.square, { backgroundColor: it.color || '#A78BFA' }]} />
            {/* label(count) + % */}
            <View style={legendStyles.textWrap}>
              <Text style={[legendStyles.label, { color: textMain }]} numberOfLines={1}>
                {it.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, minHeight: '100%' },

  header: {
    alignItems: 'center',
    marginTop: P_LARGE,
    paddingHorizontal: P_LARGE,
  },
  title: {
    fontSize: Math.round(SCREEN_WIDTH * 0.08),
    fontWeight: '800',
    marginBottom: P,
  },
  divider: {
    height: 1.5,
    width: Math.round(SCREEN_WIDTH * 0.5),
    opacity: 0.12,
    marginBottom: P,
    borderRadius: 1,
    alignSelf: 'center',
  },

  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: P_LARGE,
  },
  empty: {
    fontStyle: 'italic',
    fontSize: Math.round(SCREEN_WIDTH * 0.045),
    marginVertical: P_LARGE,
  },

  block: {
    width: BLOCK_WIDTH,
    alignItems: 'center',
    marginBottom: P,
    borderRadius: 12,
    elevation: 2,            // Android shadow
    shadowColor: '#000',     // iOS shadow
    shadowOpacity: 0.05,
    shadowRadius: 6,
    paddingBottom: P,
    overflow: 'visible',
  },

  blockWeekActivityRow: {
    width: BLOCK_WIDTH,
    borderRadius: 12,
    marginBottom: P,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },

  toggleRow: {
    marginTop: 12,
    marginBottom: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  hRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: 6,
  },

  streakMiniWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
});

const legendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'nowrap',
  },
  square: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  textWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardTitle: {
    width: '100%',
    fontSize: 16,
    fontWeight: '800',
    paddingTop: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
});
