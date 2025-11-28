import React, { useRef, useState, useMemo } from 'react';
import VisualProbe from '../components/probe/VisualProbe';
import ScenarioProbe from '../components/probe/ScenarioProbe';
import BodyProbe from '../components/probe/BodyProbe';
import ThoughtProbe from '../components/probe/ThoughtProbe';
import { ProbeEngine } from '../utils/probeEngine';
import { pickStartProbe } from '../utils/probeRouting';
import { EMOTION_META } from '../data/emotionMeta';
import { useBottomSystemBar } from '../hooks/useBottomSystemBar';
import {  getVisualScenesFor, getScenarioItemsFor } from '../utils/probeContent';

export default function ProbeContainer({
  theme,
  onDone,
  onStep,
  onStart,
  // Seed emotions from evidenceEngine (e.g. ['sadness', 'disappointment'])
  seedEmotions,
  // ❗ Новый проп: исходный вектор из evidenceEngine
  seedVector,
}) {
  // Create probe engine (keeps internal emotion vector)
  const engineRef = useRef(null);

  if (!engineRef.current) {
    engineRef.current = new ProbeEngine({
      maxSteps: 2,
      confidence: 0.72,
      initialState: seedVector, // ❗ сюда кладём L1+L2 вектор
    });
  }

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

    // 1) Prefer explicit seedEmotions from evidenceEngine
    if (Array.isArray(seedEmotions) && seedEmotions.length > 0) {
      const [d, s] = seedEmotions;
      return [d, s].filter(Boolean);
    }

    // 2) Fallback to ProbeEngine ranking
    if (r.length > 0) {
      return [r[0]?.key, r[1]?.key].filter(Boolean);
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

    // Use seedTopTwo from evidenceEngine as primary
    const topTwo =
      seedTopTwo.length > 0
        ? seedTopTwo
        : [ranking[0]?.key, ranking[1]?.key].filter(Boolean);

    const start = pickStartProbe(topTwo);
    console.log('[ProbeContainer] initialStart', { ranking, start, topTwo });

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
      // 1) Take raw ranking from probe engine
      const ranking = snap.ranking || [];

      // 2) Clamp result to seedTopTwo from evidenceEngine (L1/L2 decision)
      let finalTop = ranking[0] || null;

      if (Array.isArray(seedTopTwo) && seedTopTwo.length > 0) {
        // Only keep emotions that are in [dominant, secondary]
        const clamped = ranking.filter(
          it => it && seedTopTwo.includes(it.key)
        );

        if (clamped.length > 0) {
          finalTop = clamped[0];
        }
      }

      console.log('[ProbeContainer] final emotion (clamped)', {
        rawTop: snap.top,
        finalTop,
        seedTopTwo,
      });

      safeOnDone({
        // If for some reason clamping fails, fallback to raw top
        emotion: finalTop?.key || snap.top?.key,
        ranking: snap.ranking,
        vector: snap.vector,
      });
    } else {
      const next = engineRef.current.nextProbeType(probeType);
      setProbeType(next);
    }
  }

  // Called when user skips
  const onSkip = () => {
    console.log('[ProbeContainer] skip on', probeType);
    const next = engineRef.current.nextProbeType(probeType);
    setProbeType(next);
  };

  // Extract current ranking and top emotion
  const ranking = engineRef.current.snapshot.ranking || [];
  const step = engineRef.current.step || 0;

  const dominant =
    step === 0 && seedTopTwo[0]
      ? seedTopTwo[0]                 // before any probe answers → use evidenceEngine seed
      : ranking[0]?.key || seedTopTwo[0] || null;
  const exclude = engineRef.current.getExcludeLabels?.() || [];
  // Unique key to force re-mount of probes (reset local state)
  const probeKey = `${probeType}-${engineRef.current.step}`;

  // Dynamic switch for current probe
  switch (probeType) {
    case 'visual': {
      // 🔹 Берём A/B-сцены с тегами под выбранную dominant-эмоцию
      const [optA, optB] = getVisualScenesFor(dominant);

      return (
        <VisualProbe
          key={probeKey}
          dominant={dominant}
          theme={theme}
          context={context}
          firstOption={optA}
          secondOption={optB}
          onChoose={onChoose}
          onSkip={onSkip}
          excludeLabels={exclude}
        />
      );
    }

    case 'scenario': {
      // 🔹 Берём сюжетные A/B-сценарии с тегами под ту же dominant-эмоцию
      const [optA, optB] = getScenarioItemsFor(dominant);

      return (
        <ScenarioProbe
          key={probeKey}
          dominant={dominant}
          theme={theme}
          context={context}
          firstOption={optA}
          secondOption={optB}
          onChoose={onChoose}
          onSkip={onSkip}
          excludeLabels={exclude}
        />
      );
    }

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
