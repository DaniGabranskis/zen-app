// src/debug/NavigationLogger.js
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { LogBox } from 'react-native';

/**
 * Wrap your <NavigationContainer> with <NavigationLogger>
 * to get detailed console logs on navigation state changes.
 *
 * Usage:
 *  <NavigationLogger>
 *    <NavigationContainer ref={navigationRef}> ... </NavigationContainer>
 *  </NavigationLogger>
 *
 * It expects the inner node to be a NavigationContainer.
 */

export default function NavigationLogger({ children }) {
  const prevStateRef = useRef(null);

  useEffect(() => {
    // ignore some repetitive warnings in dev if desired
    LogBox.ignoreLogs(['Setting a timer', 'Require cycle:']);

    // try to find the inner navigation container's ref
    // we will use a MutationObserver-like approach by reading children.props
    // (works if you place NavigationLogger directly above NavigationContainer)
  }, []);

  // we render a wrapper that attaches onStateChange to the child nav container
  const child = React.Children.only(children);
  const onStateChange = (state) => {
    try {
      const now = new Date().toISOString();
      // compute current route by walking state
      const getActive = (s) => {
        if (!s) return { name: null, params: null };
        const route = s.routes ? s.routes[s.index ?? 0] : s;
        if (route.state) return getActive(route.state);
        return { name: route.name, params: route.params || null };
      };
      const active = getActive(state);
      const prevActive = prevStateRef.current;
      prevStateRef.current = active;

      // top-level compact log
      console.log(`[NAVLOG ${now}] active=${active.name} params=${JSON.stringify(active.params)}`);

      // verbose: full state snapshot (disabled by default)
      // console.log('[NAVLOG:STATE]', JSON.stringify(state, null, 2));

    } catch (e) {
      console.warn('[NAVLOG] onStateChange error', e);
    }
    // if the original child had onStateChange, call it
    if (typeof child.props.onStateChange === 'function') {
      child.props.onStateChange(state);
    }
  };

  return React.cloneElement(child, {
    onStateChange,
    // keep other props unchanged
    ...child.props,
  });
}
