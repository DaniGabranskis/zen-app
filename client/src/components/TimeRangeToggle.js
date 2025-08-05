// Самая компактная версия переключателя: иконки или 1-буквенные обозначения
import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';

const options = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'max', label: 'Max' },
];

export default function TimeRangeTiny({ selected, onToggle }) {
  return (
    <View style={styles.container}>
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          onPress={() => onToggle(opt.key)}
          style={[styles.button, selected === opt.key && styles.active]}
        >
          <Text style={[styles.text, selected === opt.key && styles.activeText]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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