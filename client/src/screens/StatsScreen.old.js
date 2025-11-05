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
import ScoreChart from '../components/ScoreChart';
import TimeRangeToggle from '../components/TimeRangeToggle';
import { getEmotionMeta } from '../utils/evidenceEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BLOCK_WIDTH = Math.round(SCREEN_WIDTH * 0.90);
const P = Math.round(SCREEN_WIDTH * 0.05);
const P_SMALL = Math.round(SCREEN_WIDTH * 0.02);
const P_LARGE = Math.round(SCREEN_WIDTH * 0.08);
const PIE_SIZE = Math.floor(BLOCK_WIDTH * 0.75);

export default function StatsScreen() {
  const { bgcolor, textMain, cardBg, divider } = useThemeVars();
  const history = useStore(state => state.history) || [];

  const [range, setRange] = useState('week');
  const [selected, setSelected] = useState(null);

  const { pieData, series, streaks, week } = useStats(history);

  // ✳️ chartData — отфильтрован по диапазону
  const now = new Date();
  let filteredHistory = [...history];

  if (range === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);
    filteredHistory = history.filter(item => new Date(item.date) >= weekAgo);
  } else if (range === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);
    filteredHistory = history.filter(item => new Date(item.date) >= monthAgo);
  }

  const filteredStats = useStats(filteredHistory);

  // Build donut series with canonical emotion colors + label(count)
  const chartData = filteredStats.pieData.map(d => {
    const meta = getEmotionMeta(d.name);
    // getEmotionMeta.color может быть строкой или массивом — берём первый цвет
    const color = Array.isArray(meta?.color) ? meta.color[0] : (meta?.color || '#A78BFA');
    return {
      value: d.population,
      color,
      label: `${d.name}(${d.population})`, // legend with counts
    };
  });

  const scoreHistory = history.map(item => ({
    date: item.date?.slice(0, 10),
    score: typeof item.score === 'number' ? item.score : 0
  })).filter(d => d.score > 0);

  const last7 = scoreHistory.slice(-7);

  const currentStreak = streaks.currentStreak;
  const bestStreak = streaks.bestStreak;

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: bgcolor }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textMain }]}>Your Stats</Text>
          <View style={[styles.divider, { backgroundColor: divider }]} />
        </View>

        {pieData.length === 0 ? (
          <Text style={styles.empty}>No data yet</Text>
        ) : (
          <>
            <View style={[styles.blockWeekActivityRow, { backgroundColor: cardBg }]}> 
              <WeekActivityRow week={week} />
              <View style={styles.streakMiniWrapper}>
                <StreakProgress current={currentStreak} best={bestStreak} width={BLOCK_WIDTH - 50} />
              </View>
            </View>

            <View style={[styles.blockScoreChart, { backgroundColor: cardBg }]}> 
              <ScoreChart data={last7} width={BLOCK_WIDTH - 12} style={{ width: BLOCK_WIDTH - 12 }} />
            </View>

            <View style={[styles.block, styles.chartBlock, { backgroundColor: cardBg }]}>
            <View style={styles.toggleRow}>
              <TimeRangeToggle selected={range} onToggle={setRange} />
            </View>
            <DonutChart
              data={chartData}
              containerWidth={BLOCK_WIDTH}
              maxLabelFraction={0.35}
              baseFont={13}
              smallFont={11}
            />
            </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

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
  },
  Text: {
    fontWeight: '800',
    alignSelf: 'center',
    width: '80%'
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
  chartBlock: {
    height: Math.round(SCREEN_WIDTH * 1.1),
    justifyContent: 'flex-start',
  },
  toggleRow: {
    margin: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 6,
    gap: 5,
  },
  blockScoreChart: {
    width: BLOCK_WIDTH,
    borderRadius: 12,
    marginBottom: P,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    overflow: 'hidden', // на случай, если что-то выходит за границу
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
  block: {
    width: BLOCK_WIDTH,
    alignItems: 'center',
    marginBottom: P,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    paddingBottom: P,
    overflow: 'visible',
  },
  blockTitle: {
    fontSize: Math.round(SCREEN_WIDTH * 0.05),
    fontWeight: '700',
    marginBottom: P_SMALL,
  },
  centerLabel: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  streakWrapper: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  newRecord: {
    backgroundColor: '#ffedc2',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 22,
    marginTop: 18,
    elevation: 2,
    shadowColor: '#ff9800',
    shadowOpacity: 0.12,
    shadowRadius: 7,
  },
  streakMiniWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
});
