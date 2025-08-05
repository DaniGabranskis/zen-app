import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Svg, { Line, Text as SvgText } from 'react-native-svg';
import useResponsive from '../hooks/useResponsive';

const { width } = useResponsive(); // получаем ширину экрана

function truncateToFit(label, maxWidthPx, maxLabelLengthPx) {
  const charWidth = 6.5;
  const maxCharsByWidth = Math.floor(maxWidthPx / charWidth);
  const maxCharsByLimit = Math.floor(maxLabelLengthPx / charWidth);
  const maxChars = Math.min(maxCharsByWidth, maxCharsByLimit);
  return label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
}

export default function DonutChart({ data, containerWidth = 320 }) {
  const SIZE = containerWidth;
  const RADIUS = containerWidth * 0.34;
  const INNER_RADIUS = containerWidth * 0.22;
  const centerX = containerWidth / 2;
  const centerY = containerWidth / 2;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ color: '#999', fontSize: 14 }}>No data to display</Text>
      </View>
    );
  }

  let angleAccumulator = 0;
  const MAX_LABEL_PX = width * 0.20; // 20% от ширины экрана

  return (
    <View style={styles.wrapper}>
      <View style={[styles.chartWrapper, { width: SIZE, height: SIZE }]}>
        <PieChart
          data={data}
          donut
          radius={RADIUS}
          innerRadius={INNER_RADIUS}
          strokeWidth={2}
          strokeColor="#FAFAFB"
          isAnimated
          showText={false}
        />

        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          {data.map((item, index) => {
            const valueAngle = total > 0 ? (item.value / total) * 360 : 0;
            const startAngle = angleAccumulator;
            const endAngle = angleAccumulator + valueAngle;
            const midAngle = (startAngle + endAngle) / 2;
            angleAccumulator = endAngle;

            const angleRad = (midAngle - 90) * (Math.PI / 180);
            const cos = Math.cos(angleRad);
            const sin = Math.sin(angleRad);

            const lineStartX = centerX + RADIUS * cos;
            const lineStartY = centerY + RADIUS * sin;
            const lineEndX = centerX + (RADIUS + 10) * cos;
            const lineEndY = centerY + (RADIUS + 10) * sin;

            const label = `${item.label}`;
            const textOffsetX = cos * 6;
            const textOffsetY = sin * 6;
            let labelX = lineEndX + textOffsetX;
            let labelY = lineEndY + textOffsetY;
            const minPadding = 6;
            labelX = Math.min(Math.max(labelX, minPadding), SIZE - minPadding);

            let textAnchor = 'middle';
              const isHorizontal = Math.abs(sin) < 0.05;
              const isVertical = Math.abs(cos) < 0.05;

              if (isVertical && sin > 0) {
                // текст под кругом
                labelY += 14;
              } else if (isVertical && sin < 0) {
                // текст над кругом
                labelY -= 14;
              }

              if (!isHorizontal && Math.abs(cos) > 0.5) {
                textAnchor = cos > 0 ? 'start' : 'end';
              }

              const approxTextWidth = label.length * 6.5;

              let maxAvailableWidth =
                textAnchor === 'start'
                  ? SIZE - labelX - 4
                  : textAnchor === 'end'
                  ? labelX - 4
                  : Math.min(labelX, SIZE - labelX) * 2 - 4;

              // если надпись идёт почти по горизонтали (влево/вправо) и места слишком много —
              if (isHorizontal && maxAvailableWidth > 100) {
                maxAvailableWidth = 60;
              }

              if (maxAvailableWidth < 30) {
                console.warn(`❗️Label '${label}' has too little space:`, Math.round(maxAvailableWidth), 'px');
              }

              const shortLabel = truncateToFit(label, maxAvailableWidth, MAX_LABEL_PX);
              const fontSize = shortLabel.length > 22 ? 9 : 11;
              
            return (
              <React.Fragment key={index}>
                <Line
                  x1={lineStartX}
                  y1={lineStartY}
                  x2={lineEndX}
                  y2={lineEndY}
                  stroke="#000"
                  strokeWidth={1}
                />
                <SvgText
                  x={labelX}
                  y={labelY}
                  fontSize={fontSize}
                  fontWeight="500"
                  fill="#000"
                  textAnchor={textAnchor}
                  alignmentBaseline="middle"
                >
                  {shortLabel}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  svg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
