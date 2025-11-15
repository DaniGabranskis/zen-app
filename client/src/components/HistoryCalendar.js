// components/history/HistoryCalendar.js
// Purpose: Reusable calendar with booking-style range selection + emotion dots.
// Why: Keep HistoryScreen lean and testable; encapsulate all calendar logic in one place.

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import useThemeVars from '../hooks/useThemeVars';
import { getEmotionMeta } from '../utils/evidenceEngine';

/**
 * Props:
 * - history: Array<{ date: string|number|Date, dominantGroup?: string }>
 * - value: { from: string|null, to: string|null }  // 'YYYY-MM-DD'
 * - onChange: (range: { from: string|null, to: string|null }) => void
 *
 * Selection rules:
 *  - First tap  -> {from = date, to = date}
 *  - Second tap:
 *      * if same day      -> clear selection
 *      * if different day -> {from = min, to = max}
 *  - Third tap -> start a new single-day selection
 */
export default function HistoryCalendar({ history, value, onChange }) {
  // Theme tokens
  const theme = useThemeVars();
  const {
    // новые имена
    background,
    textPrimary,
    cardBackground,
    accent,
    // старые имена (на всякий случай, чтобы ничего не сломать)
    bgcolor,
    textMain,
    cardBg,
    button,
  } = theme;

  // Унифицированные цвета для календаря
  const calendarBg = cardBackground || cardBg || '#FFFFFF';
  const labelColor = textPrimary || textMain || '#000000';
  const selectionColor = accent || button || '#A78BFA';

  // Контролируем видимый месяц, чтобы календарь не прыгал обратно на today
  const [currentMonth, setCurrentMonth] = useState(() => {
    const seed = value?.from || new Date().toISOString().slice(0, 10);
    return seed;
  });

  // Normalize history => map dateKey -> emotion color(s)
  const emotionDots = useMemo(() => {
    // Example: { '2025-09-20': ['#ff0000', '#00ff00'] }
    const acc = {};
    history?.forEach((item) => {
      const dateKey = toDateKey(item?.date);
      if (!dateKey) return;
      const m = getEmotionMeta(item?.dominantGroup);
      const color = Array.isArray(m?.color) ? m.color[0] : '#A78BFA';
      if (!acc[dateKey]) acc[dateKey] = [];
      // Avoid duplicates; cap visible dots by 3 for layout safety
      if (!acc[dateKey].includes(color) && acc[dateKey].length < 3) {
        acc[dateKey].push(color);
      }
    });
    return acc;
  }, [history]);

  // Range helpers
  const range = normalizeRange(value);

  const isInRange = useCallback(
    (key) => {
      if (!range.from) return false;
      if (!range.to) return key === range.from;
      return key >= range.from && key <= range.to;
    },
    [range.from, range.to]
  );

  // Calendar theme (chrome)
  const calendarTheme = {
    calendarBackground: calendarBg,
    monthTextColor: labelColor,
    textSectionTitleColor: rgba(labelColor, 0.8),
    dayTextColor: labelColor,
    todayTextColor: labelColor,
    arrowColor: labelColor,
    textDisabledColor: rgba(labelColor, 0.4),
  };

  const onDayPress = (day) => {
    const key = day?.dateString;
    if (!key) return;

    // Case A: no selection yet -> single-day selection
    if (!range.from && !range.to) {
      onChange({ from: key, to: key });
      return;
    }

    // Case B: single-day selected (from === to)
    if (range.from && range.to && range.from === range.to) {
      if (key === range.from) {
        // tapping the same day toggles off
        onChange({ from: null, to: null });
        return;
      }
      // different day -> build inclusive range [min..max]
      const from = key < range.from ? key : range.from;
      const to = key > range.from ? key : range.from;
      onChange({ from, to });
      return;
    }

    // Case C: a range is selected -> start a fresh single-day selection
    onChange({ from: key, to: key });
  };

  return (
    <View
      style={{
        width: '90%',
        alignSelf: 'center',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: calendarBg,
        // Match card shadow
        elevation: 2, // Android shadow
        shadowColor: '#000', // iOS shadow color
        shadowOpacity: 0.1, // subtle like cards
        shadowRadius: 8, // blur radius
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Calendar
        // Keep the calendar anchored on the month we control
        current={currentMonth}
        onMonthChange={(m) => {
          // m.dateString is 'YYYY-MM-DD' at the first day of month
          setCurrentMonth(m.dateString);
        }}
        disableMonthChange={true}
        // custom day component to combine range highlight + emotion dots
        dayComponent={({ date, state }) => {
          const key = date?.dateString;
          const selected = key && isInRange(key);
          const isSingle =
            key && range.from && key === range.from && !range.to;

          const dots = emotionDots[key] || [];
          const isDisabled = state === 'disabled';

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => !isDisabled && onDayPress(date)}
              style={styles.dayCell}
            >
              <View style={[styles.tile, isDisabled && { opacity: 0.5 }]}>
                {/* Selection overlay: fixed-size, covers the whole cell, independent of dots */}
                <View
                  style={[
                    styles.selection,
                    selected && {
                      backgroundColor: rgba(selectionColor, 0.55),
                    },
                  ]}
                />

                {/* Day number above selection */}
                <Text
                  style={[
                    styles.dayText,
                    { color: labelColor },
                    (selected || isSingle) && { fontWeight: '700' },
                  ]}
                  allowFontScaling={false} // keep uniform size across devices
                >
                  {date?.day}
                </Text>

                {/* Dots row — horizontal and fixed-position */}
                <View style={styles.dotsRow}>
                  {dots.map((c, idx) => (
                    <View
                      key={idx}
                      style={[styles.dot, { backgroundColor: c }]}
                    />
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        onDayPress={onDayPress}
        theme={calendarTheme}
        // Remove default inner borders for a cleaner look
        style={{ backgroundColor: calendarBg }}
      />
    </View>
  );
}

/* ===== Helpers ===== */

function toDateKey(d) {
  try {
    const dt = new Date(d);
    return isNaN(dt) ? null : dt.toISOString().slice(0, 10); // YYYY-MM-DD
  } catch {
    return null;
  }
}

function normalizeRange(value) {
  const from = value?.from || null;
  const to = value?.to || null;
  // Ensure from <= to when both exist
  if (from && to && to < from) return { from: to, to: from };
  return { from, to };
}

function rgba(hex, alpha) {
  // Accept #RRGGBB or #RGB. Fallback to accent-ish if parsing fails.
  try {
    const h = (hex || '').replace('#', '');
    const r =
      h.length === 3 ? parseInt(h[0] + h[0], 16) : parseInt(h.slice(0, 2), 16);
    const g =
      h.length === 3 ? parseInt(h[1] + h[1], 16) : parseInt(h.slice(2, 4), 16);
    const b =
      h.length === 3 ? parseInt(h[2] + h[2], 16) : parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  } catch {
    return 'rgba(167,139,250,0.25)'; // #A78BFA fallback
  }
}

/* ===== Styles ===== */
const CELL_H = 42;
const TILE_INSET = 2;
const RADIUS = 8;

const styles = StyleSheet.create({
  // The outer touchable that spans the WHOLE calendar cell (no inner padding)
  dayCell: {
    flex: 1,
    alignSelf: 'stretch',
    height: CELL_H,
    minHeight: CELL_H,
  },
  // The colored square tile that nearly touches neighbors
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: TILE_INSET,
    borderRadius: RADIUS,
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  dayText: {
    fontSize: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // Full-cell selection overlay — fixed rectangle independent of dots
  selection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS,
  },
  // Dots are displayed horizontally under the number
  dotsRow: {
    position: 'absolute',
    bottom: 4, // расстояние от низа ячейки
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4, // расстояние между кружками
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
