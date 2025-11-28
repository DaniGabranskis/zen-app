import React, { useRef, useState, useMemo } from 'react';
import VisualProbe from '../components/probe/VisualProbe';
import ScenarioProbe from '../components/probe/ScenarioProbe';
import BodyProbe from '../components/probe/BodyProbe';
import ThoughtProbe from '../components/probe/ThoughtProbe';
import { ProbeEngine } from '../utils/probeEngine';
import { pickStartProbe } from '../utils/probeRouting';
import { EMOTION_META } from '../data/emotionMeta';
import { useBottomSystemBar } from '../hooks/useBottomSystemBar';

export default function ProbeContainer({
  theme,
  onDone,
  onStep,
  onStart,
  // NEW: seedEmotions comes from evidenceEngine (e.g. ['guilt', 'shame'])
  seedEmotions,
}) {
  // Create probe engine (keeps internal emotion vector)
  const engineRef = useRef(new ProbeEngine({ maxSteps: 2, confidence: 0.72 }));

  // 🔹 Derive bar color + theme mode from theme
  //    Adjust these keys to your actual theme structure.
  const barColor =
    theme?.colors?.probeBarBackground ||
    theme?.colors?.barBackground ||
    theme?.colors?.surface ||
    '#000000';

  const isDarkTheme =
    theme?.mode === 'dark' ||
    theme?.isDark === true ||
    theme?.scheme === 'dark';

  // Build probe context from current top-2 emotions
  // Compute top-2 emotions for probe context:
  // 1) if ProbeEngine already has ranking → use it
  // 2) otherwise → fallback to seedEmotions from evidenceEngine
  const seedTopTwo = useMemo(() => {
    const snap = engineRef.current?.snapshot || {};
    const r = snap.ranking || [];

    if (r.length > 0) {
      return [r[0]?.key, r[1]?.key].filter(Boolean);
    }

    if (Array.isArray(seedEmotions) && seedEmotions.length > 0) {
      const [d, s] = seedEmotions;
      return [d, s].filter(Boolean);
    }

    return [];
  }, [engineRef.current?.snapshot?.ranking, seedEmotions]);

  // Build probe context from seedTopTwo
  const context = useMemo(() => {
    const firstKey = seedTopTwo[0] || null;
    const secondKey = seedTopTwo[1] || null;

    const first = firstKey
      ? { emotionId: firstKey, label: EMOTION_META[firstKey]?.label || firstKey }
      : null;
    const second = secondKey
      ? { emotionId: secondKey, label: EMOTION_META[secondKey]?.label || secondKey }
      : null;

    return { first, second };
  }, [seedTopTwo]);

  // Determine the first probe type from top-2 emotions.
  // Prefer:
  // 1) current ProbeEngine ranking
  // 2) fallback to seedEmotions from evidenceEngine
  const initialStart = (() => {
    const snap = engineRef.current.snapshot || {};
    const ranking = snap.ranking || [];

    const topTwo =
      ranking.length > 0
        ? [ranking[0]?.key, ranking[1]?.key].filter(Boolean)
        : seedTopTwo;

    const start = pickStartProbe(topTwo);
    console.log('[ProbeContainer] initialStart', { topTwo, start, ranking });

    if (typeof onStart === 'function') {
      try {
        onStart({ start, topTwo, ranking });
      } catch (e) {
        /* noop */
      }
    }

    return start;
  })();

  const [probeType, setProbeType] = useState(initialStart);

  // Safe guard for onDone not provided + детальный лог
  const safeOnDone = (payload) => {
    console.log('[ProbeContainer] safeOnDone called', {
      hasOnDone: typeof onDone === 'function',
      payload,
    });

    if (typeof onDone === 'function') {
      try {
        onDone(payload);
      } catch (e) {
        console.error('[ProbeContainer] onDone threw error:', e);
      }
    } else {
      console.warn('[ProbeContainer] onDone not provided', payload);
    }
  };

  // Called when user selects an option
  const onChoose = (maybeTags, label) => {
    // Не ломаем объект-вектор: передаём как есть, если он есть
    const tags = maybeTags ?? [];
    const snap = engineRef.current.apply(tags, label);
    console.log('[ProbeContainer] after choose', snap);

    if (typeof onStep === 'function') {
      try {
        onStep({
          phase: 'probe',
          probeType,
          label,
          delta: tags,
          snapshot: snap,
        });
      } catch (e) {
        /* noop */
      }
    }

    if (engineRef.current.shouldStop()) {
      console.log('[ProbeContainer] final emotion', snap.top);
      safeOnDone({
        emotion: snap.top.key,
        ranking: snap.ranking,
        vector: snap.vector,
      });
    } else {
      const next = engineRef.current.nextProbeType(probeType);
      setProbeType(next);
    }
  };

  // Called when user skips
  const onSkip = () => {
    console.log('[ProbeContainer] skip on', probeType);
    const next = engineRef.current.nextProbeType(probeType);
    setProbeType(next);
  };

  // Extract current ranking and top emotion
  const ranking = engineRef.current.snapshot.ranking || [];
  const dominant = ranking[0]?.key || seedTopTwo[0] || null;
  const exclude = engineRef.current.getExcludeLabels?.() || [];
  // Unique key to force re-mount of probes (reset local state)
  const probeKey = `${probeType}-${engineRef.current.step}`;

  // Dynamic switch for current probe
  switch (probeType) {
    case 'visual':
      return (
        <VisualProbe
          key={probeKey}
          dominant={dominant}
          theme={theme}
          context={context}
          onChoose={onChoose}
          onSkip={onSkip}
          excludeLabels={exclude}
        />
      );

    case 'scenario':
      return (
        <ScenarioProbe
          key={probeKey}
          dominant={dominant}
          theme={theme}
          context={context}
          onChoose={onChoose}
          onSkip={onSkip}
          excludeLabels={exclude}
        />
      );

    case 'body':
      return (
        <BodyProbe
          key={probeKey}
          theme={theme}
          context={context}
          onChoose={onChoose}
          onSkip={onSkip}
        />
      );

    case 'thought':
      return (
        <ThoughtProbe
          key={probeKey}
          theme={theme}
          context={context}
          onChoose={onChoose}
          onSkip={onSkip}
        />
      );

    default:
      return (
        <VisualProbe
          key={probeKey}
          dominant={dominant}
          theme={theme}
          onChoose={onChoose}
          onSkip={onSkip}
        />
      );
  }
}
