import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';

/**
 * Formats seconds as mm:ss.
 */
function formatMMSS(totalSec) {
  const s = Math.max(0, Number(totalSec) || 0);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  const pad = (n) => (n < 10 ? `0${n}` : String(n));
  return `${pad(mm)}:${pad(ss)}`;
}

/**
 * Visual breathing circle (no timer logic here).
 * - Outer ring: hollow (border only)
 * - Inner circle: scales up/down when active
 */
function BreezeCircle({
  theme,
  isActive,
  inhaleMs = 3400,
  exhaleMs = 3400,
  pauseMs = 200,
}) {
  const { width } = useWindowDimensions();

  const size = useMemo(() => {
    const base = Math.min(width * 0.62, 280);
    return Math.max(200, base);
  }, [width]);

  const borderW = 6;
  const innerSize = size - borderW * 2;

  const t = theme || {};
  const ringColor = t.border || 'rgba(150,150,150,0.35)';

  // User request: inner circle should be the same color as the ring border.
  const innerColor = ringColor;

  const scale = useRef(new Animated.Value(0.08)).current;
  const cancelledRef = useRef(false);
  const timeoutsRef = useRef([]);

  const [phase, setPhase] = useState('Ready');

  useEffect(() => {
    cancelledRef.current = false;

    // Clear pending timeouts (safety).
    for (const id of timeoutsRef.current) clearTimeout(id);
    timeoutsRef.current = [];

    const defer = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timeoutsRef.current.push(id);
    };

    const ease = Easing.inOut(Easing.quad);

    const stopAll = () => {
      scale.stopAnimation();
      setPhase('Ready');
      scale.setValue(0.08);
    };

    if (!isActive) {
      stopAll();
      return () => {
        cancelledRef.current = true;
        for (const id of timeoutsRef.current) clearTimeout(id);
        timeoutsRef.current = [];
      };
    }

    const runInhale = () => {
      if (cancelledRef.current) return;
      setPhase('Inhale');

      Animated.timing(scale, {
        toValue: 1,
        duration: inhaleMs,
        easing: ease,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelledRef.current) return;
        if (pauseMs > 0) defer(runExhale, pauseMs);
        else runExhale();
      });
    };

    const runExhale = () => {
      if (cancelledRef.current) return;
      setPhase('Exhale');

      Animated.timing(scale, {
        toValue: 0.08,
        duration: exhaleMs,
        easing: ease,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelledRef.current) return;
        if (pauseMs > 0) defer(runInhale, pauseMs);
        else runInhale();
      });
    };

    runInhale();

    return () => {
      cancelledRef.current = true;
      scale.stopAnimation();
      for (const id of timeoutsRef.current) clearTimeout(id);
      timeoutsRef.current = [];
    };
  }, [isActive, inhaleMs, exhaleMs, pauseMs, scale]);

  return (
    <View style={styles.centerWrap}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: borderW,
            borderColor: ringColor,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: innerColor,
            transform: [{ scale }],
          },
        ]}
      />

      <Text style={[styles.phase, { color: t.textMain || '#FFFFFF' }]}>{phase}</Text>
    </View>
  );
}

export default function BreezeFlow(props) {
  // Keeping default export for compatibility (not required by flowRegistry).
  return <BreezeTimerStep {...props} />;
}

/**
 * Step component used by flowRegistry (named export).
 * - Shows timer between step label and the circle.
 * - Does NOT start until user presses Start (state.started).
 * - Marks done when timer hits 0.
 */
export function BreezeTimerStep({ theme, state, setState }) {
  const t = theme || {};
  const remainingSec = Math.max(0, Number(state?.remainingSec ?? 60));
  const totalSec = Math.max(10, Number(state?.totalSec ?? (remainingSec || 60)));
  const started = !!state?.started;
  const done = !!state?.done;

  // Decrement timer only after Start and until done.
  useEffect(() => {
    if (!started || done) return;

    const id = setInterval(() => {
      if (typeof setState !== 'function') return;

      setState((prev) => {
        const prevSec = Math.max(0, Number(prev?.remainingSec ?? 0));
        if (prevSec <= 1) {
          return {
            ...(prev || {}),
            remainingSec: 0,
            done: true,
            completed: true,
            breezeDone: true,
          };
        }
        return { ...(prev || {}), remainingSec: prevSec - 1 };
      });
    }, 1000);

    return () => clearInterval(id);
  }, [started, done, setState]);

  const showSec = started ? remainingSec : totalSec;

  return (
    <View style={styles.stepWrap}>
      <Text style={[styles.timer, { color: t.textMain || '#FFFFFF' }]}>{formatMMSS(showSec)}</Text>

      <BreezeCircle
        theme={t}
        isActive={started && !done}
        inhaleMs={3400}
        exhaleMs={3400}
        pauseMs={200}
      />

      <Text style={[styles.helper, { color: t.textSub || 'rgba(255,255,255,0.75)' }]}>
        Follow the breathing pattern.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  timer: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 0.6,
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    backgroundColor: 'transparent', // Hollow center
  },
  inner: {
    position: 'absolute',
  },
  phase: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '900',
  },
  helper: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 18,
  },
});
