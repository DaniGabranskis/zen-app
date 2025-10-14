// ScreenWrapper.js
import React, { useEffect } from 'react';
import { View, Dimensions, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeVars from '../hooks/useThemeVars';

/**
 * ScreenWrapper — reusable layout component.
 * Adds safe area insets, theme background, and ensures correct height.
 *
 * Added logging for mount/unmount to help diagnose "white screens" and navigation issues.
 *
 * Logging format (console):
 *   [SCREEN MOUNT 2025-10-14T12:00:00.000Z] name=MyScreen display=SwipeCard childrenType=Function useFlexHeight=true
 *   [SCREEN UNMOUNT 2025-10-14T12:01:00.000Z] name=MyScreen
 *
 * The wrapper tries to infer a screen name from props.route.name (if passed), otherwise
 * it looks at children.type.displayName || children.type.name. As a fallback it prints 'UnknownScreen'.
 *
 * Keep logs enabled only in development builds if you prefer (wrap console.log calls).
 */

export default function ScreenWrapper({ children, style, useFlexHeight = false, route }) {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const visibleHeight = screenHeight - insets.top - insets.bottom;
  const { bgcolor } = useThemeVars();

  // infer a readable name for logging
  const inferName = () => {
    try {
      if (route && route.name) return route.name;
      if (!children) return 'EmptyChildren';
      // if children is an array, try first element
      const c = Array.isArray(children) ? children[0] : children;
      if (!c) return 'UnknownScreen';
      // If it's a React element, try to get the displayName or name
      if (typeof c.type === 'function' || typeof c.type === 'object') {
        return c.type.displayName || c.type.name || 'AnonymousComponent';
      }
      // fallback to component type string
      if (typeof c === 'string') return c;
      return 'UnknownScreen';
    } catch (e) {
      return 'UnknownScreen';
    }
  };

  useEffect(() => {
    const now = new Date().toISOString();
    const name = inferName();
    // Lightweight mount log — include small metadata
    try {
      console.log(`[SCREEN MOUNT ${now}] name=${name} useFlexHeight=${!!useFlexHeight} childrenType=${(children && (children?.type?.displayName || children?.type?.name)) || (Array.isArray(children) ? 'Array' : typeof children)}`);
      // also print a small environment hint to help diagnose platform-specific issues
      console.log(`[SCREEN MOUNT ${now}] platform=${Platform.OS} screenHeight=${screenHeight} visibleHeight=${visibleHeight}`);
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
  }, []); // run only on mount/unmount

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
