// Самая компактная версия переключателя: иконки или 1-буквенные обозначения
import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import useThemeVars from '../hooks/useThemeVars';

const options = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'max', label: 'Max' },
];

export default function TimeRangeTiny({ selected, onToggle }) {
    const { accent, textSecondary, themeName } = useThemeVars();
  return (
    <View style={[styles.container,{ backgroundColor: themeName === 'light' ? '#f2f2f2' : '#3A3A40',},]}>
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          onPress={() => onToggle(opt.key)}
          style={[
            styles.button,
            selected === opt.key && { backgroundColor: accent },
          ]}
        >
          <Text
            style={[
              styles.text,
              { color: textSecondary },
              selected === opt.key && { color: '#FFFFFF' },
            ]}
          >
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
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
