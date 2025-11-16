// ScreenWrapper.js
import React, { useEffect } from 'react';
import { View, Dimensions, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeVars from '../hooks/useThemeVars';

export default function ScreenWrapper({
  children,
  style,
  useFlexHeight = false,
  route,
  noTopInset = false,
  noBottomInset = false,
  // NEW: controls outer background color
  outerVariant = 'screen', // 'screen' | 'nav'
}) {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const visibleHeight = screenHeight - insets.top - insets.bottom;
  const theme = useThemeVars();

  // infer a readable name for logging
  const inferName = () => {
    try {
      if (route && route.name) return route.name;
      if (!children) return 'EmptyChildren';
      const c = Array.isArray(children) ? children[0] : children;
      if (!c) return 'UnknownScreen';
      if (typeof c.type === 'function' || typeof c.type === 'object') {
        return c.type.displayName || c.type.name || 'AnonymousComponent';
      }
      if (typeof c === 'string') return c;
      return 'UnknownScreen';
    } catch (e) {
      return 'UnknownScreen';
    }
  };

  useEffect(() => {
    const now = new Date().toISOString();
    const name = inferName();
    try {
      console.log(
        `[SCREEN MOUNT ${now}] name=${name} useFlexHeight=${!!useFlexHeight} childrenType=${
          (children && (children?.type?.displayName || children?.type?.name)) ||
          (Array.isArray(children) ? 'Array' : typeof children)
        }`,
      );
      console.log(
        `[SCREEN MOUNT ${now}] platform=${Platform.OS} screenHeight=${screenHeight} visibleHeight=${visibleHeight}`,
      );
    } catch (e) {
      console.warn('[SCREEN MOUNT] log error', e);
    }

    return () => {
      const t = new Date().toISOString();
      try {
        console.log(`[SCREEN UNMOUNT ${t}] name=${name}`);
      } catch (e) {
        console.warn('[SCREEN UNMOUNT] log error', e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Decide outer background:
  // - 'screen'  -> normal screen background
  // - 'nav'     -> navBackground (for screens with bottom bar)
  const outerBg =
    outerVariant === 'nav'
      ? theme.navBackground || theme.navBar || theme.background || theme.bgcolor
      : theme.background || theme.bgcolor;

  return (
    <View
      style={[
        styles.outer,
        {
          backgroundColor: outerBg,
          paddingTop: noTopInset ? 0 : insets.top,
          paddingBottom: noBottomInset ? 0 : insets.bottom,
        },
      ]}
    >
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
