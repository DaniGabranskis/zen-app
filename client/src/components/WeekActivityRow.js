import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const CIRCLE_SIZE = 28; // Было 24, увеличили на 50%

function FilledCheckCircle({ checked, size = 28, color = '#A78BFA' }) {
  return (
    <View style={[{
      width: size, height: size,
      borderRadius: size / 2,
      borderWidth: 2,
      borderColor: checked ? color : '#828282',
      backgroundColor: checked ? color : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }]}>
      {checked && (
        <Svg width={size} height={size} viewBox={`0 0 28 28`}>
          <Path
            d="M7 15L12 20L21 8"
            stroke="#fff"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      )}
    </View>
  );
}

export default function WeekActivityRow({ week }) {
  return (
    <View style={styles.wrapper}>
      {/* Буквы дней недели */}
      <View style={styles.labelsRow}>
        {week.map(({ day }) => (
          <View style={styles.labelCell} key={day}>
            <Text style={styles.labelText}>{day[0]}</Text>
          </View>
        ))}
      </View>
      {/* Сами круги */}
      <View style={styles.circlesRow}>
        {week.map(({ day, active }) => (
          <FilledCheckCircle key={day} checked={active} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: 18,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 3,
    gap: 12,
  },
  labelCell: {
    width: CIRCLE_SIZE,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 0.2,
  },
  circlesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    marginHorizontal: 0,
  },
  active: {
    backgroundColor: '#FFD600',
    borderColor: '#828282',
  },
  inactive: {
    backgroundColor: 'transparent',
    borderColor: '#828282',
  },
});
