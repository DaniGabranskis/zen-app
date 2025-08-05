import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeVars from '../hooks/useThemeVars';

/**
 * ScreenWrapper — reusable layout component.
 * Adds safe area insets, theme background, and ensures correct height.
 * Props:
 *   - children: content to render
 *   - style: custom style (array/object)
 *   - useFlexHeight: bool (if true, uses flex:1, else fixed visibleHeight)
 */
export default function ScreenWrapper({ children, style, useFlexHeight = false }) {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const visibleHeight = screenHeight - insets.top - insets.bottom;
  const { bgcolor } = useThemeVars();

  return (
    <View style={[styles.outer, { backgroundColor: bgcolor, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[useFlexHeight ? { flex: 1 } : { height: visibleHeight }, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
});
