// components/ChartToggle.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function ChartToggle({ chartType, onToggle }) {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.button, chartType === 'pie' && styles.active]}
        onPress={() => onToggle('pie')}
      >
        <Text style={[styles.text, chartType === 'pie' && styles.activeText]}>Donut</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, chartType === 'bar' && styles.active]}
        onPress={() => onToggle('bar')}
      >
        <Text style={[styles.text, chartType === 'bar' && styles.activeText]}>Bar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#f2f2f2',
    borderRadius: 40,
    padding: 2,
  },
  button: {
    width: 56,
    height: 36,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor: '#A78BFA',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  activeText: {
    color: '#fff',
  },
});
