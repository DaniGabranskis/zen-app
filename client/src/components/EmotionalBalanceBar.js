// components/EmotionalBalanceBar.js
// Renders two vertical bars (positive vs negative) growing from a dashed baseline.
// The ratio text (e.g., "3:16") is centered between bars.
// Polarity comes from mapEmotionToPolarity(name) -> 'positive' | 'negative' | 'neutral'.

import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useThemeVars from '../hooks/useThemeVars';

export default function EmotionalBalanceBar({
  items = [],                                    // [{ name, count }]
  mapEmotionToPolarity,                          // (name) => 'positive' | 'negative' | 'neutral'
  width,                                         // total width of the widget
  maxBarHeight = 90,                             // max bar height in px
  gapPx = 18,                                    // horizontal gap for the center ratio box
  positiveColor = '#22C55E',
  negativeColor = '#EF4444',
  showLegend = true,
  barWidth = 50,
}) {
  const { textPrimary, textSecondary, dividerColor } = useThemeVars();

  // Aggregate counts by polarity
  const { pos, neg, total } = useMemo(() => {
    let p = 0, n = 0;
    for (const it of items) {
      const k = String(it?.name || '').toLowerCase();
      const c = Number(it?.count || it?.value || 0);
      if (!c) continue;
      const pol = typeof mapEmotionToPolarity === 'function'
        ? mapEmotionToPolarity(k)
        : 'neutral';
      if (pol === 'positive') p += c;
      else if (pol === 'negative') n += c;
    }
    return { pos: p, neg: n, total: p + n };
  }, [items, mapEmotionToPolarity]);

  // Compute proportional bar heights (bars rise from baseline)
  const safeTotal = total || 1;
  const posH = Math.round(maxBarHeight * (pos / safeTotal));
  const negH = Math.round(maxBarHeight * (neg / safeTotal));

  // Format ratio as "a:b" using GCD reduction and integer rounding
  const ratioText = useMemo(() => {
    const a = Math.round(pos || 0);
    const b = Math.round(neg || 0);
    if (a === 0 && b === 0) return '0:0';
    const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
    const g = gcd(Math.max(a, 1), Math.max(b, 1));
    const ra = Math.max(0, Math.round(a / g));
    const rb = Math.max(0, Math.round(b / g));
    return `${ra}:${rb}`;
  }, [pos, neg]);

  // Layered bar with inner-shadow imitation
  const Bar = memo(function Bar({
    height,
    width,
    color,
    borderRadius = 8,
    innerShadeWidth = 2,       // 1–3 px recommended
    innerShadeOpacity = 0.08,  // 0.06–0.12 recommended
  }) {
    if (height <= 0 || width <= 0) {
      // Keep layout stable if bar is zero-height
      return <View style={{ width, height: 1 }} />;
    }

    return (
      <View
        style={[
          styles.barContainer,
          {
            width,
            height,
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
          },
        ]}
      >
        {/* Base fill */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />

        {/* Inner shadow left */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: innerShadeWidth,
            backgroundColor: '#000',
            opacity: innerShadeOpacity,
          }}
        />
        {/* Inner shadow right */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: innerShadeWidth,
            backgroundColor: '#000',
            opacity: innerShadeOpacity,
          }}
        />

        {/* Top dark cap for depth (subtle) */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: innerShadeWidth,
            right: innerShadeWidth,
            top: 0,
            height: 8, // 6–10 px
            backgroundColor: '#000',
            opacity: innerShadeOpacity * 0.75,
          }}
        />
      </View>
    );
  });

  // Layout split: [ barL | ratio | barR ]
  // Bars are bottom-aligned inside a fixed-height box; baseline is a dashed line across the bottom.
  return (
    <View style={{ width }}>
      {/* Range toggle (Week / Month / Max) */}
      {/* Bars row with baseline */}
      <View style={[styles.barZone, { height: maxBarHeight + 14, paddingBottom: 6 }]}>
        {/* Left bar (positive) */}
        <View style={[styles.barCol, { alignItems: 'flex-end' }]}>
          <View style={{ height: maxBarHeight, justifyContent: 'flex-end' }}>
            <View
              style={[
                styles.bar,
                { height: posH, width: barWidth, backgroundColor: positiveColor },
              ]}
            />
          </View>
        </View>

        {/* Center ratio box */}
        <View
          style={[
            styles.centerBox,
            { width: gapPx, minWidth: gapPx, maxWidth: gapPx, height: maxBarHeight },
          ]}
        >
          <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '800' }}>
            {ratioText}
          </Text>
        </View>

        {/* Right bar (negative) */}
        <View style={[styles.barCol, { alignItems: 'flex-start' }]}>
          <View style={{ height: maxBarHeight, justifyContent: 'flex-end' }}>
            <View
              style={[
                styles.bar,
                { height: negH, width: barWidth, backgroundColor: negativeColor },
              ]}
            />
          </View>
        </View>

        {/* Dashed baseline across full width */}
        <View
          pointerEvents="none"
          style={[
            styles.baseline,
            { borderColor: dividerColor },
          ]}
        />
      </View>

     {/* Optional legends aligned under each bar */}
     {showLegend && (
       <View style={styles.legendCols}>
         <View style={styles.legendCol}>
           <LegendDot color={positiveColor} />
           <Text style={[styles.legendText, { color: textSecondary }]}>Calm / Positive</Text>
         </View>
         <View style={styles.legendCol}>
           <LegendDot color={negativeColor} />
           <Text style={[styles.legendText, { color: textSecondary }]}>Tension / Difficult</Text>
         </View>
       </View>
     )}
    </View>
  );
}

function LegendDot({ color }) {
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 2,
        backgroundColor: color,
        marginRight: 6,
      }}
    />
  );
}

const styles = StyleSheet.create({
  barZone: {
    width: '100%',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end', // bottom alignment for the three columns
    justifyContent: 'space-between',
  },
  barCol: {
    flex: 1,
    // keep columns symmetric; bars themselves are inside with bottom-align
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 6,        // a small offset so the dash is visible under bar corners
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
 legendCols: {
   marginTop: 8,
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'space-between',
 },
 legendCol: {
   flex: 1,
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'center', // centers the label under its bar column
 },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
