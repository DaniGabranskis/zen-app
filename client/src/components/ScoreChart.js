import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text as RNText, Pressable } from 'react-native';
import Svg, { Polyline, Line, Circle, Text } from 'react-native-svg';
import useThemeVars from '../hooks/useThemeVars';

const HEIGHT = 150; // Минималистичная высота для аккуратного вида!
const PADDING_X = 14;
const PADDING_Y = 12;
const shift = 8;
const PADDING_Y_TOP = 8;    // сверху (для "100")
const PADDING_Y_BOTTOM = 18; // снизу (для "0" — можно 16–22, подбери визуально)

export default function ScoreChart({ data, width, style }) {
  const { bgcolor, textMain, cardBg, divider } = useThemeVars();
  const svgRef = useRef(null);
  const WIDTH = width || Dimensions.get('window').width * 0.97;
  const PADDING = 28; // Немного воздуха по краям
  const [popover, setPopover] = useState(null);

  if (!data || !data.length) return null;

  const Y_MIN = 0;
  const Y_MAX = 100;
  const X_STEP = (WIDTH - 2 * PADDING) / (data.length - 1);

  // Точки графика
  const allPoints = data.map((d, i) => {
    const x = PADDING + i * X_STEP;
    const y = PADDING_Y_TOP + ((Y_MAX - d.score) / (Y_MAX - Y_MIN)) * (HEIGHT - PADDING_Y_TOP - PADDING_Y_BOTTOM);
    return { x, y, value: d.score, idx: i, date: d.date };
  });

  function handlePress(evt) {
    const { locationX, locationY } = evt.nativeEvent;
    let found = null;
    allPoints.forEach((pt) => {
      const dist = Math.sqrt(
        (locationX - pt.x) ** 2 + (locationY - pt.y) ** 2
      );
      if (dist < 18) found = pt;
    });
    if (found) {
      setPopover(
        popover && popover.idx === found.idx ? null : found
      );
    } else {
      setPopover(null);
    }
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: cardBg }]}>
      {/* Title */}
      <RNText style={styles.title}>Score Stats</RNText>

      <View style={{ flexDirection: 'row', marginLeft: 8, marginBottom: 4 }}>
        <RNText style={{ color: '#AAA', fontSize: 11, marginRight: 15 }}>
          min: {Math.min(...data.map(d => d.score))}
        </RNText>
        <RNText style={{ color: '#AAA', fontSize: 11 }}>
          max: {Math.max(...data.map(d => d.score))}
        </RNText>
      </View>

      {/* SVG график */}
      <View style={{ position: 'relative', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Svg
          width={WIDTH}
          height={HEIGHT}
          ref={svgRef}
        >
          {/* Y-labels для графика */}
          {[100, 0].map((y) => {
            const yPos = PADDING_Y_TOP + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (HEIGHT - PADDING_Y_TOP - PADDING_Y_BOTTOM);

            return (
              <React.Fragment key={y}>
                {/* Горизонтальная линия */}
                <Line
                  x1={PADDING_X + 20}
                  x2={WIDTH - PADDING_X}
                  y1={yPos}
                  y2={yPos}
                  stroke="#eee"
                  strokeWidth={2}
                  strokeDasharray="3,3"
                />
                {/* Цифра */}
                <Text
                  x={PADDING_X + 13}
                  y={yPos + 5}
                  fontSize={15}
                  fill="#6C63FF"     // фиолетовый, можно оставить #AAA
                  fontWeight="bold"
                  textAnchor="end"
                >
                  {y}
                </Text>
              </React.Fragment>
            );
          })}
          {/* Линия графика */}
          <Polyline
            points={allPoints.map(pt => `${pt.x},${pt.y}`).join(' ')}
            fill="none"
            stroke="#5e44b7"
            strokeWidth={2.7}
          />
          {allPoints.map(({ x, y, idx }) => (
            <Circle
              key={'m' + idx}
              cx={x}
              cy={y}
              r={6}
              fill="#fff"
              stroke="#5e44b7"
              strokeWidth={2.1}
              pointerEvents="none"
            />
          ))}
        </Svg>

        {/* Overlay для тача */}
        <Pressable
          style={{
            position: 'absolute',
            left: 0, top: 0,
            width: WIDTH,
            height: HEIGHT,
            zIndex: 10,
          }}
          onPress={handlePress}
        >
          {/* Можно временно показать hitbox для отладки */}
        </Pressable>

        {/* Popover */}
        {popover && (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: popover.x - 34,
              top: popover.y - 52,
              width: 68,
              height: 36,
              alignItems: 'center',
              zIndex: 20,
            }}
          >
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 10,
                borderWidth: 1.8,
                borderColor: '#5e44b7',
                paddingHorizontal: 8,
                paddingVertical: 2,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.10,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <RNText
                style={{
                  color: '#5e44b7',
                  fontWeight: '700',
                  fontSize: 17,
                  marginBottom: -2,
                }}
              >
                {popover.value}
              </RNText>
            </View>
            {/* Треугольник-указатель */}
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 10,
                borderRightWidth: 10,
                borderTopWidth: 8,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: '#5e44b7',
                marginTop: -1,
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    paddingTop: 0,    // Было 6
    paddingBottom: 0, // Было 6
    paddingHorizontal: 0,
    width: '100%',
  },
  title: {
    fontWeight: '700',
    fontSize: 17,
    color: '#6C63FF',
    marginBottom: 2,
    marginLeft: 7,
    marginTop: 2,
    letterSpacing: 0.2,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
});
