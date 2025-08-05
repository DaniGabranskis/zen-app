// 📊 Переработанный BarChart с правильной центровкой, адаптивным масштабом и чистой Y-осью

import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Svg, Rect, G, Text as SvgText, Line } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BarChart({ data = [], selected, setSelected, width, height }) {
  if (!data || data.length === 0) return null;

  const padding = 16;
  const chartWidth = width || SCREEN_WIDTH * 0.9;
  const chartHeight = height || SCREEN_WIDTH * 0.9;

  const topPadding = 16;
  const bottomPadding = 12;
  const adjustedHeight = chartHeight + topPadding + bottomPadding;

  const yAxisWidth = 28; // ширина под Y-ось
  const barAreaWidth = chartWidth - yAxisWidth;

  const maxValue = Math.max(...data.map(d => d.value), 1); // гарантируем минимум 1
  const barWidth = Math.min(40, Math.max(16, barAreaWidth / data.length - 8));
  const spacing = (barAreaWidth - data.length * barWidth) / (data.length + 1);

  const stepCount = 5;
  const stepHeight = chartHeight / stepCount;
  const stepValue = maxValue / stepCount;

  return (
    <View style={[styles.wrapper, { width: chartWidth, height: adjustedHeight }]}>
      <Svg width={chartWidth} height={adjustedHeight}>
        {/* Y-axis lines & labels */}
        {[...Array(stepCount + 1)].map((_, i) => {
          const y = topPadding + i * (chartHeight / stepCount);
          const value = Math.round(maxValue - i * stepValue);
          return (
            <G key={i}>
              <SvgText
                x={yAxisWidth - 4}
                y={y + 4}
                fontSize="10"
                fill="#555"
                textAnchor="end"
              >
                {value}
              </SvgText>
              <Line
                x1={yAxisWidth}
                x2={chartWidth}
                y1={y}
                y2={y}
                stroke="#ddd"
                strokeWidth="1"
              />
            </G>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          const x = yAxisWidth + spacing * (i + 1) + barWidth * i;
          const y = topPadding + (chartHeight - barHeight);

          return (
            <G key={d.label}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={selected === d.label ? '#6C63FF' : d.color}
                rx={4}
                onPress={() => setSelected(d.label)}
              />
              <SvgText
                x={x + barWidth / 2}
                y={topPadding + chartHeight - 4}
                fontSize="10"
                fill="#444"
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});
