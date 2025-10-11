import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import useThemeVars from '../hooks/useThemeVars';

// Simple ring with emotion label and optional intensity value
export default function EmotionRing({ emotion = '-', intensity = 0, size = 160, stroke = 10 }) {
  const t = useThemeVars();
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(10, Number(intensity) || 0));
  const progress = clamped / 10; // 0..1
  const dash = circumference * progress;
  const rest = circumference - dash;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={t.cardBg}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={t.button}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${rest}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: t.textMain, fontWeight: '700', fontSize: 18, textTransform: 'capitalize' }}>
          {emotion || '-'}
        </Text>
        <Text style={{ color: t.textSub, marginTop: 4 }}>Intensity: {clamped}</Text>
      </View>
    </View>
  );
}
