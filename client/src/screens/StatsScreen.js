// screens/StatsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
  TouchableOpacity,
} from 'react-native';
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
import { generateInsights } from '../utils/insightGenerator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// === Layout knobs (adjust as you like) ===
const BLOCK_WIDTH = Math.round(SCREEN_WIDTH * 0.9);
// 60/40 split inside the card:
const DONUT_SIDE = Math.round(SCREEN_WIDTH * 0.5); // ← donut size (left)
const LEGEND_WIDTH = Math.round(SCREEN_WIDTH * 0.3); // ← legend box width (right)
const P = Math.round(SCREEN_WIDTH * 0.05);
const P_SMALL = Math.round(SCREEN_WIDTH * 0.02);
const P_LARGE = Math.round(SCREEN_WIDTH * 0.08);

// Build pie series by emotion name from arbitrary rows
function makePieData(rows = []) {
  const byName = new Map();
  for (const h of rows) {
    const name = h?.dominantGroup || h?.session?.l3?.emotionKey;
    if (!name) continue;
    byName.set(name, (byName.get(name) || 0) + 1);
  }
  // match shape: [{ name, population }]
  return [...byName.entries()]
    .map(([name, population]) => ({ name, population }))
    .sort((a, b) => b.population - a.population);
}

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const daysAgo = (n) => {
  const x = startOfDay(new Date());
  x.setDate(x.getDate() - n);
  return x;
};

const calcCurrentStreak = (history) => {
  if (!Array.isArray(history) || history.length === 0) return 0;

  const DAY_MS = 24 * 60 * 60 * 1000;

  // Нормализуем все даты к началу дня и кладём в Set
  const dateSet = new Set(
    history
      .map((it) => startOfDay(it.date).getTime())
      .filter((t) => !Number.isNaN(t))
  );

  const todayTs = startOfDay(new Date()).getTime();

  // Если сегодня нет отметки — стрик считается 0
  if (!dateSet.has(todayTs)) return 0;

  // Считаем подряд идущие дни назад
  let streak = 0;
  let cursor = todayTs;

  while (dateSet.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }

  return streak;
};

const toKey = (v) => String(v || '').trim().toLowerCase(); // normalize toggle value

export default function StatsScreen() {
  const {
    background,
    textPrimary,
    textSecondary,
    cardBackground,
    dividerColor,
    themeName
  } = useThemeVars();
  const history = useStore((state) => state.history) || [];

  const [range, setRange] = useState('week');
  const [barRange, setBarRange] = useState('week');
  const [legendModalVisible, setLegendModalVisible] = useState(false);

  const { pieData: _ignore, streaks, week } = useStats(history); // header card stays stable

  // normalize toggle values
  const rangeKey = toKey(range);
  const barRangeKey = toKey(barRange);

  // Filter history by range (week/month)
  const now = new Date();
  // filter for donut/insights
  let filteredHistory = history;
  if (rangeKey === 'week') {
    const from = daysAgo(6);
    filteredHistory = history.filter((it) => startOfDay(it.date) >= from);
  } else if (rangeKey === 'month') {
    const from = daysAgo(30);
    filteredHistory = history.filter((it) => startOfDay(it.date) >= from);
  } else if (rangeKey === 'max') {
    filteredHistory = history;
  }

  // filter for balance bars
  let filteredHistoryBar = history;
  if (barRangeKey === 'week') {
    const from = daysAgo(6);
    filteredHistoryBar = history.filter((it) => startOfDay(it.date) >= from);
  } else if (barRangeKey === 'month') {
    const from = daysAgo(30);
    filteredHistoryBar = history.filter((it) => startOfDay(it.date) >= from);
  } else if (barRangeKey === 'max') {
    filteredHistoryBar = history;
  }

  // Compute pie data locally for charts (donut/bars) from filtered arrays
  const pieDataDonut = makePieData(filteredHistory);
  const pieDataBar = makePieData(filteredHistoryBar);
  const totalEntriesDonut = pieDataDonut.reduce(
    (sum, d) => sum + d.population,
    0
  );
  const totalEntriesBar = pieDataBar.reduce(
    (sum, d) => sum + d.population,
    0
  );
  const insights = generateInsights(history, {
    maxItems: 3,
    horizonDays: 35,
    compareWindow: 7,
  });

  const chartData = pieDataDonut.map((d) => {
    const meta = getEmotionMeta(d.name);
    const color = Array.isArray(meta?.color)
      ? meta.color[0]
      : meta?.color || '#A78BFA';
    return {
      value: d.population,
      color,
      label: d.name,
      name: d.name,
      count: d.population,
    };
  });

  const chartDataBar = pieDataBar.map((d) => {
    const meta = getEmotionMeta(d.name);
    const color = Array.isArray(meta?.color)
      ? meta.color[0]
      : meta?.color || '#A78BFA';
    return {
      value: d.population,
      color,
      label: d.name,
      name: d.name,
      count: d.population,
    };
  });

  // Emotional balance: use meta-driven polarity (data first, no hardcoded sets)
  const mapEmotionToPolarity = (name) =>
    getEmotionMeta(name)?.polarity || 'neutral';

  const computedCurrentStreak = calcCurrentStreak(history);
  const currentStreak = computedCurrentStreak;

  // Берём максимум, чтобы best всегда >= current
  const bestStreak = Math.max(
    streaks.bestStreak || 0,
    computedCurrentStreak
  );

  return (
    <ScreenWrapper
      style={[styles.container, { backgroundColor: background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Unified screen header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>
            Your Stats
          </Text>
          <View
            style={[styles.divider, { backgroundColor: dividerColor }]}
          />
        </View>

        {pieDataDonut.length === 0 ? (
          <Text
            style={[
              styles.empty,
              { color: textPrimary, opacity: 0.6 },
            ]}
          >
            No data yet
          </Text>
        ) : (
          <>
            {/* Week activity + streaks card */}
            <View
              style={[
                styles.blockWeekActivityRow,
                { backgroundColor: cardBackground },
              ]}
            >
              <WeekActivityRow week={week} />
              <View style={styles.streakMiniWrapper}>
                <StreakProgress
                  current={currentStreak}
                  best={bestStreak}
                  width={BLOCK_WIDTH - 50}
                />
              </View>
            </View>

            {/* insightGenerator */}
            {insights.length > 0 && (
              <View
                style={[
                  styles.block,
                  { backgroundColor: cardBackground },
                ]}
              >
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 16,
                    color: textPrimary,
                    marginTop: 12,
                    marginBottom: 6,
                    paddingHorizontal: 14,
                    letterSpacing: 0.3,
                  }}
                >
                  Insights
                </Text>

                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingBottom: 10,
                  }}
                >
                  {insights.map((line, i) => (
                    <Text
                      key={i}
                      style={{
                        color: textPrimary,
                        opacity: 0.9,
                        fontSize: 15,
                        lineHeight: 21,
                        marginBottom: 8,
                      }}
                    >
                      {line}
                    </Text>
                  ))}

                  <Text
                    style={{
                      color: textSecondary,
                      opacity: 0.45,
                      fontSize: 12.5,
                      textAlign: 'center',
                      marginTop: 2,
                    }}
                  >
                    Based on last 35 days of reflection
                  </Text>
                </View>
              </View>
            )}

            {/* Emotional Balance (positive vs negative) */}
            <View
              style={[
                styles.block,
                { backgroundColor: cardBackground },
              ]}
            >
              <View style={styles.toggleRow}>
                <TimeRangeToggle
                  selected={barRange}
                  onToggle={setBarRange}
                />
              </View>
              <Text
                style={{
                  opacity: 0.6,
                  fontSize: 12,
                  marginBottom: 8,
                  color: textPrimary,
                }}
              >
                {` ${barRangeKey} • ${totalEntriesBar} entries`}
              </Text>

              <EmotionalBalanceBar
                key={`bar-${barRangeKey}-${pieDataBar.length}`}
                items={chartDataBar.map((x) => ({
                  name: x.name,
                  count: x.count,
                }))}
                mapEmotionToPolarity={mapEmotionToPolarity}
                width={BLOCK_WIDTH - 24}
                maxBarHeight={120}
                gapPx={100}
                barWidth={50}
              />
            </View>

            {/* Donut (left) + Legend (right) card */}
            <View
              style={[
                styles.block,
                { backgroundColor: cardBackground },
              ]}
            >
              {/* Top-right range toggle */}
              <View style={styles.toggleRow}>
                <TimeRangeToggle
                  selected={range}
                  onToggle={setRange}
                />
              </View>

              <Text
                style={{
                  opacity: 0.6,
                  fontSize: 12,
                  marginBottom: 4,
                  color: textPrimary,
                }}
              >
                {` ${rangeKey} • ${totalEntriesDonut} entries`}
              </Text>

              <View style={styles.hRow}>
                {/* LEFT: donut */}
                <View
                  style={{
                    width: DONUT_SIDE,
                    height: DONUT_SIDE,
                  }}
                >
                  <DonutChart
                    key={`donut-${rangeKey}-${pieDataDonut.length}`}
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
                  <LegendList
                    data={chartData}
                    width={LEGEND_WIDTH}
                    maxVisible={5}
                    onPressOther={() => setLegendModalVisible(true)}
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal with full legend list (2 columns) */}
      <LegendModal
        visible={legendModalVisible}
        onClose={() => setLegendModalVisible(false)}
        data={chartData}
      />
    </ScreenWrapper>
  );
}

/* ---------- Legend list in card (limited + "Other...") ---------- */
function LegendList({ data, width, maxVisible = 8, onPressOther }) {
  const { textPrimary, accent, themeName  } = useThemeVars();
  const items = [...data].sort(
    (a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)
  );

  if (!items.length) return null;

  const total = items.reduce(
    (acc, it) => acc + (Number(it.value) || 0),
    0
  ) || 1;

  const visible = items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;

  return (
    <View style={{ width, paddingLeft: 4 }}>
      {visible.map((it, idx) => (
        <View key={idx} style={legendStyles.row}>
          {/* color square */}
          <View
            style={[
              legendStyles.square,
              { backgroundColor: it.color || '#A78BFA' },
            ]}
          />
          {/* label */}
          <View style={legendStyles.textWrap}>
            <Text
              style={[legendStyles.label, { color: textPrimary }]}
              numberOfLines={1}
            >
              {it.label}
            </Text>
          </View>
        </View>
      ))}

      {hasMore && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPressOther}
          style={[
            legendStyles.otherButton,
            { backgroundColor: accent },
          ]}
        >
          <Text
            style={[
              legendStyles.otherButtonText,
              { color: '#FFFFFF' },
            ]}
            numberOfLines={1}
          >
            Other…
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ---------- Legend modal with full list (2 columns) ---------- */
function LegendModal({ visible, onClose, data }) {
  const {
    background,
    cardBackground,
    textPrimary,
    textSecondary,
    themeName
  } = useThemeVars();

  const items = [...data].sort(
    (a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <View
          style={[
            modalStyles.card,
            { backgroundColor: cardBackground },
          ]}
        >
          <Text
            style={[modalStyles.title, { color: textPrimary }]}
          >
            All emotions
          </Text>

          <View style={[modalStyles.grid]}>
            {items.map((it, idx) => (
              <View key={idx} style={modalStyles.item}>
                <View
                  style={[
                    legendStyles.square,
                    { backgroundColor: it.color || '#A78BFA' },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      legendStyles.label,
                      { color: textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {it.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: textSecondary,
                    }}
                  >
                    {it.value} entries
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={[  modalStyles.closeButton,{ borderColor: themeName === 'light' ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.25)', }, ]}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: textPrimary,
                fontWeight: '600',
                fontSize: 14,
              }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
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

  // 🔽 наша кнопка Other…
  otherButton: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 30,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  otherButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  card: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },

  title: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 6,
    paddingBottom: 8,
  },

  item: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  closeButton: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
