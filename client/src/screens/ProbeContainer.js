import React, { useRef, useState, useMemo } from 'react';
import VisualProbe from '../components/probe/VisualProbe';
import ScenarioProbe from '../components/probe/ScenarioProbe';
import BodyProbe from '../components/probe/BodyProbe';
import ThoughtProbe from '../components/probe/ThoughtProbe';
import { ProbeEngine } from '../utils/probeEngine';
import { pickStartProbe } from '../utils/probeRouting';
import { EMOTION_META } from '../data/emotionMeta';

export default function ProbeContainer({ theme, onDone, onStep, onStart }) {
  // Create probe engine (keeps internal emotion vector)
  const engineRef = useRef(new ProbeEngine({ maxSteps: 3, confidence: 0.72 }));

  // Build probe context from current top-2 emotions
  const context = useMemo(() => {
    const snap = engineRef.current?.snapshot || {};
    const r = snap.ranking || [];
    const firstKey = r[0]?.key || null;
    const secondKey = r[1]?.key || null;

    const first = firstKey ? { emotionId: firstKey, label: (EMOTION_META[firstKey]?.label || firstKey) } : null;
    const second = secondKey ? { emotionId: secondKey, label: (EMOTION_META[secondKey]?.label || secondKey) } : null;

    return { first, second };
  }, [engineRef.current?.snapshot?.ranking]);

  // Determine the first probe type from top-2 emotions (more intelligent start)
  const initialStart = (() => {
    const ranking = engineRef.current.snapshot.ranking || [];
    const topTwo = [ranking[0]?.key, ranking[1]?.key].filter(Boolean);
    const start = pickStartProbe(topTwo);
    console.log('[ProbeContainer] initialStart', { topTwo, start });

    if (typeof onStart === 'function') {
        try { onStart({ start, topTwo, ranking }); } catch (e) { /* noop */ }
    }

    return start;
  })();

  const [probeType, setProbeType] = useState(initialStart);

  // Safe guard for onDone not provided
  const safeOnDone = (payload) => {
    if (typeof onDone === 'function') onDone(payload);
    else console.warn('[ProbeContainer] onDone not provided', payload);
  };

  // Called when user selects an option
  const onChoose = (maybeTags, label) => {
    const tags = Array.isArray(maybeTags) ? maybeTags : [];
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
        } catch (e) { /* noop */ }
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
  const dominant = ranking[0]?.key;
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
