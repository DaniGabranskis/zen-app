import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StreakProgress({ current = 0, best = 1, width = 270, height = 24 }) {
  const milestone = best > 0 ? best : 1;
  const progress = Math.min(current / milestone, 1);
  const isNewRecord = current >= best && best > 0;

  return (
    <View style={[styles.wrapper, { width }]}>
      {/* Заголовок и New record! */}
      <View style={styles.topRow}>
        <Text style={styles.streakLabel}>Your Streak</Text>
        {isNewRecord && (
          <Text style={styles.newRecord}>New record!</Text>
        )}
      </View>
      {/* Прогресс-бар + цифры */}
      <View style={styles.row}>
        {/* Прогресс-бар 70% */}
        <View style={[styles.barContainer, { width: width * 0.7, height }]}>
          <View style={styles.barBg} />
          <View
            style={[
              styles.barFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: isNewRecord ? '#5e44b7' : '#A78BFA',
              },
            ]}
          />
        </View>
        {/* Текст 30% */}
        <View style={[
          styles.textContainer,
          { width: width * 0.3, height, paddingLeft: 30 }
        ]}>
          <Text style={styles.streakText}>
            {current} day{current !== 1 ? 's' : ''} streak
          </Text>
          <Text style={styles.bestText}>Best: {best}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    width: '100%',
  },
  streakLabel: {
    fontWeight: 'bold',
    fontSize: 15,
    flex: 1,
    color: '#2b2454',
    textAlign: 'left',
  },
  newRecord: {
    color: '#5e44b7',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
    marginTop: 0,
    marginBottom: 2,
    gap: 4,
  },
  barContainer: {
    position: 'relative',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 18,
    overflow: 'hidden',
  },
  barBg: {
    position: 'absolute',
    left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: '#ECECEC',
    borderRadius: 18,
    zIndex: 0,
  },
  barFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    borderRadius: 18,
    zIndex: 1,
  },
  textContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 30,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6C63FF',
    marginBottom: 1,
  },
  bestText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
});
