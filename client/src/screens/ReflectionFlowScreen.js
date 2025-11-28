import React, { useEffect, useMemo, useState, useRef  } from 'react';
import { Alert, Platform, ToastAndroid, View, Text } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { zeroVector, accumulate } from '../utils/emotionSpace';
import { foldCanonicalTags } from '../utils/tagVectorMap';

import useThemeVars from '../hooks/useThemeVars';

import ScreenWrapper from '../components/ScreenWrapper';
import SwipeCard from '../components/SwipeCard';
import QuestionBlock from '../components/QuestionBlock';

import { canonicalizeTags } from '../utils/canonicalizeTags';
import { routeEmotionFromCards } from '../utils/evidenceEngine';
import { logEvent } from '../utils/telemetry';
import ProbeContainer from './ProbeContainer';
import useStore from '../store/useStore';

import L1 from '../data/flow/L1.json';
import L2 from '../data/flow/L2.json';

// --- Swipe helpers ----------------------------------------------------------

/**
 * Choose two options to present as a binary (left/right) swipe.
 * Strategy:
 * 1) If card already has leftOption/rightOption => use them.
 * 2) If options.length === 2 => use those two.
 * 3) If options.length >= 3 => pick the pair with the LOWEST tag-overlap (Jaccard distance).
 *    This maximizes contrast and helps the evidence engine.
 */

function coerceToSwipeCard(card) {
  // Case 1: already a swipe card
  if (card?.leftOption && card?.rightOption) {
    return {
      id: card.id,
      text: card.title || card.text || 'Choose',
      leftOption:  { text: card.leftOption.text,  tags: card.leftOption.tags  || [], scoreImpact: card.leftOption.scoreImpact ?? 0 },
      rightOption: { text: card.rightOption.text, tags: card.rightOption.tags || [], scoreImpact: card.rightOption.scoreImpact ?? 0 },
    };
  }

  const opts = Array.isArray(card?.options) ? card.options : [];
  if (opts.length === 0) return null;

  // Case 2: exactly two options -> direct mapping
  if (opts.length === 2) {
    return {
      id: card.id,
      text: card.title || card.text || 'Choose',
      leftOption:  { text: opts[0].label || opts[0].text, tags: opts[0].tags || [], scoreImpact: 0 },
      rightOption: { text: opts[1].label || opts[1].text, tags: opts[1].tags || [], scoreImpact: 0 },
    };
  }

  // Case 3: 3+ options -> pick the pair with the smallest tag overlap
  const norm = opts.map(o => ({
    text: o.label || o.text,
    tags: Array.isArray(o.tags) ? o.tags : [],
  }));

  let best = null;
  let bestScore = -Infinity; // higher is better (more distance / less overlap)

  const jaccard = (aTags, bTags) => {
    const A = new Set(aTags);
    const B = new Set(bTags);
    const inter = [...A].filter(x => B.has(x)).length;
    const union = new Set([...A, ...B]).size || 1;
    // Distance = 1 - Jaccard similarity
    return 1 - (inter / union);
  };

  for (let i = 0; i < norm.length; i++) {
    for (let j = i + 1; j < norm.length; j++) {
      const d = jaccard(norm[i].tags, norm[j].tags);
      // pick the pair with the LARGEST distance (max contrast)
      if (d > bestScore) {
        bestScore = d;
        best = [norm[i], norm[j]];
      }
    }
  }

  if (!best) return null;

  return {
    id: card.id,
    text: card.title || card.text || 'Choose',
    leftOption:  { text: best[0].text, tags: best[0].tags, scoreImpact: 0 },
    rightOption: { text: best[1].text, tags: best[1].tags, scoreImpact: 0 },
  };
}

/** Layer check: force swipe for L1, L2, and Probe cards. */
function isForcedSwipeCard(cardId, probeActive) {
  if (probeActive) return true;              // always swipe for Probe
  return /^L1_/.test(cardId) || /^L2_/.test(cardId);
}

  // Overlay "← Swipe →" hint that does not affect layout
  function SwipeHint({ color = '#8A8A8A', top = 8 }) {
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 10,
        }}
      >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="chevron-left" size={20} color={color} />
        <Text
          style={{
            fontSize: 20,
            fontWeight: '600',
            letterSpacing: 1,
            opacity: 0.85,
            lineHeight: 20,
            color,
          }}
        >
          Swipe
        </Text>
         <Icon name="chevron-right" size={20} color={color} />
      </View>
       </View>
    );
  }

  // Bottom overlay hint that does not affect layout
function BottomAffirm({ text = 'Every swipe is a step toward clarity.', color = '#8A8A8A', bottom = 12 }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 40,
        alignItems: 'center',
        zIndex: 10,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          letterSpacing: 0.3,
          opacity: 0.9,
          textAlign: 'center',
          color,
        }}
      >
        Notice. Choose. Breathe.
      </Text>
    </View>
  );
}

/**
 * ReflectionFlowScreen
 *
 * New pipeline:
 *   L1 (5 swipes) -> L2 (6 swipes) -> Evidence -> (optional ProbeContainer: visual/body/scenario/thought) -> Result
 *
 * We collect user's choices into `accepted` in the exact format
 * that evidenceEngine.routeEmotionFromCards() expects:
 *
 *   {
 *     id: string,                      // e.g. "L1_mood"
 *     selectedOption: string,          // option label
 *     options: { [label: string]: string[] } // label -> tags[]
 *   }
 *
 * If engine returns mode === 'probe', we show a single targeted question,
 * push its answer as a PR_* card with higher weight (handled in the engine),
 * then route again and navigate to Result.
 */

export default function ReflectionFlowScreen({ route }) {
  const navLockRef = useRef(false); // prevents double navigation
  const lastModeRef = useRef(null); // remembers last routed.mode
  const lastDomRef = useRef(null);  // remembers last routed.dominant
  const explainRowsRef = useRef([]);         // array of table rows
  const explainVectorRef = useRef(zeroVector()); // cumulative vector
  const navigation = useNavigation();
  const t = useThemeVars(); // use full theme object
  const hintColor = t.textSecondary;

  // L1 + L2 sequence (5 + 6 cards)
  const flow = useMemo(() => [...L1, ...L2], []);
  const [step, setStep] = useState(0);           // index inside flow
  const [accepted, setAccepted] = useState([]);  // collected answers
  const [probe, setProbe] = useState(false); // when true, show ProbeContainer

  // Build routed decision only when L1+L2 are completed.
  // All comments in English only.
  const routed = useMemo(() => {
    // While L1+L2 are not finished, do not compute routing
    if (step < flow.length) return null;
    // Compute route outcome from accepted cards
    const res = routeEmotionFromCards(accepted);
      console.log('[DEBUG ROUTE RAW]', {
        mode: res?.mode,
        dominant: res?.dominant,
        secondary: res?.secondary,
        confidence: res?.confidence,
        probs: res?.probs,
        tagFreq: res?.tagFreq,
      });
      return res;
  }, [step, accepted, flow.length]);

  const currentCard = probe ? null : flow[step];

    // Format small part of the vector for readability
  const pickVec = (v) => ({
    valence: v.valence, arousal: v.arousal, tension: v.tension,
    certainty: v.certainty, agency: v.agency, socialness: v.socialness, fatigue: v.fatigue,
  });

  // Push one L1/L2 step row
  function pushL1L2Row({ id, label, canonicalTags }) {
    // delta by folding canonical tags
    const delta = foldCanonicalTags(canonicalTags);
    // accumulate into session vector
    explainVectorRef.current = accumulate(explainVectorRef.current, delta);

    explainRowsRef.current.push({
      stepType: 'L1/L2',
      id,
      label,
      tags: canonicalTags,
      delta,
      vector: { ...explainVectorRef.current },
    });

    // single-line log to console
    console.log('[EXPLAIN L1/L2]', {
      id, label, tags: canonicalTags,
      delta: pickVec(delta),
      vector: pickVec(explainVectorRef.current),
    });
  }

  // Push one Probe step row
  function pushProbeRow({ probeType, label, delta, snapshot }) {
    // delta already in emotion-space from probeContent
    explainVectorRef.current = accumulate(explainVectorRef.current, delta);

    explainRowsRef.current.push({
      stepType: `Probe:${probeType}`,
      id: null,
      label,
      tags: null,
      delta,
      vector: { ...explainVectorRef.current },
      top: snapshot?.top?.key,
      confidence: snapshot?.confidence,
    });

    console.log('[EXPLAIN PROBE]', {
      probeType, label,
      delta: pickVec(delta),
      vector: pickVec(explainVectorRef.current),
      top: snapshot?.top?.key, confidence: snapshot?.confidence,
    });
  }

  // Print final table as a compact block
  function printExplainTable(finalEmotion) {
    console.log('=== EXPLAIN TABLE START ===');
    explainRowsRef.current.forEach((r, i) => {
      console.log(
        `[ROW ${i + 1}]`,
        {
          step: r.stepType,
          event: r.id ? `${r.id}: ${r.label}` : r.label,
          tags: r.tags ? r.tags.join(',') : '',
          delta: {
            valence: r.delta.valence,
            arousal: r.delta.arousal,
            tension: r.delta.tension,
            certainty: r.delta.certainty,
            agency: r.delta.agency,
            socialness: r.delta.socialness,
            fatigue: r.delta.fatigue,
          },
          vector: {
            valence: r.vector.valence,
            arousal: r.vector.arousal,
            tension: r.vector.tension,
            certainty: r.vector.certainty,
            agency: r.vector.agency,
            socialness: r.vector.socialness,
            fatigue: r.vector.fatigue,
          },
          top: r.top || '',
          conf: r.confidence ? Number(r.confidence).toFixed(3) : '',
        }
      );
    });
    console.log('Final emotion:', finalEmotion);
    console.log('=== EXPLAIN TABLE END ===');
  }

  // -- Helpers ---------------------------------------------------------------

  /** Save one answer into `accepted` in the canonical format. */
  const pushAccepted = (card, chosenLabel, chosenTags = []) => {
    if (!card) return;

    // Build options map: label -> tags[]
    const optionsObj = {};
    (card.options || []).forEach(o => {
      optionsObj[o.label] = Array.isArray(o.tags) ? o.tags : [];
    });

    const tags = canonicalizeTags(chosenTags);
    // DIAG: chosen option + canonical tags
    console.log('[CARD_CHOICE]', {
      id: card.id,
      label: chosenLabel,
      rawTags: chosenTags,
      canonicalTags: tags,
    });
    logEvent('card_choice', {
      step: card.id,
      label: chosenLabel,
      canonicalTags: tags,
    }, `User chose "${chosenLabel}" on ${card.id}`);
    
    if (tags.length === 0) {
      // Strict content rule: options must provide tags.
      // If not — block the answer and notify developer/user.
      console.warn(`[NO_TAGS] card=${card.id} option="${chosenLabel}" — option has no tags, answer blocked.`);
      if (Platform.OS === 'android') {
        ToastAndroid.show('This option is not configured yet. Please choose another.', ToastAndroid.SHORT);
      } else {
        Alert.alert('Option not configured', 'This option is not configured yet. Please choose another.');
      }
      return false;
    }

    setAccepted(prev => [
      ...prev,
      { id: card.id, selectedOption: chosenLabel, options: optionsObj }
    ]);

    // IMPORTANT: pass canonicalized tags from this selection to the store
    const selectedKey = chosenLabel;      // we use label as a key for L1/L2
    const selectedTags = tags;            // <-- this is the canonical list we computed above

      useStore.getState().appendAccepted({
        id: card.id,
        selectedKey,
        selectedLabel: chosenLabel,
        selectedTags: selectedTags,
      });

      // >>> ADD: record this L1/L2 step into the explanation table
      pushL1L2Row({
        id: card.id,                 // e.g., "L1_mood"
        label: chosenLabel,          // e.g., "Heavy / uneasy"
        canonicalTags: tags,         // canonical list we computed above
      });
      // <<<

      return true;
    };

  /** Navigate to Result with aggregated data. */
  const navToResult = (cards, routed) => {
    navigation.dispatch(
      StackActions.replace('Result', {
        acceptedCards: cards,
        routed, // optional, Result can recompute if needed
      })
    );
  };

  // -- Flow control after finishing L1+L2 -----------------------------------

    useEffect(() => {
    // 1) guard: still collecting answers
    if (step < flow.length) return;

    // 2) guard: nothing to route yet
    if (!routed) return;

    // 3) guard: do not run while probe screen is visible
    if (probe) return;

    // 4) ignore duplicate mode/dominant combos
    if (routed?.mode === lastModeRef.current && routed?.dominant === lastDomRef.current) {
      return;
    }
    lastModeRef.current = routed?.mode;
    lastDomRef.current = routed?.dominant;

    // 5) log route decision once per new routed state
    const entries = Object.entries(routed.probs || {}).sort((a, b) => b[1] - a[1]);
    const p1Entry = entries[0] || ['', 0];
    const p2Entry = entries[1] || ['', 0];
    const p1v = p1Entry[1];
    const p2v = p2Entry[1];
    const deltaTrue = p1v - p2v;

    console.log('[ROUTE]', JSON.stringify({
      mode: routed.mode,
      dominant: routed.dominant,
      secondary: routed.secondary,
      confidence: routed.confidence,
      p1: p1v,
      p2: p2v,
      delta: deltaTrue,
      tagFreq: routed.tagFreq
    }, null, 2));

    logEvent('route_decision', {
      mode: routed.mode,
      dominant: routed.dominant,
      secondary: routed.secondary,
      confidence: routed.confidence,
      p1: p1v,
      p2: p2v,
      delta: deltaTrue,
    }, `Route=${routed.mode} → dom=${routed.dominant} sec=${routed.secondary || '-'}`);

    // 6) branch to probe or navigate
    if (routed?.mode === 'probe') {
      navLockRef.current = false; // allow future navigation after probe completes
      setProbe(true);
      logEvent(
        'probe_shown',
        { type: 'engine', dominant: routed?.dominant },
        `Probe shown: engine (dominant=${routed?.dominant || '-'})`
      );
    } else {
      setProbe(false);
      if (
        !navLockRef.current &&
        (routed?.mode === 'single' || routed?.mode === 'emotion' || routed?.dominant)
      ) {
        navLockRef.current = true;

        // We synchronize the store in the same way as after Probe:
       try {
         const { rebuildEvidence, setDecision, pickEmotion } = useStore.getState();
         rebuildEvidence();
         setDecision({
           mode: routed?.mode || 'single',
           top: [routed?.dominant, routed?.secondary].filter(Boolean),
           probs: routed?.probs || {},
         });
         if (routed?.dominant) pickEmotion(routed.dominant);
       } catch (e) {
         // no-op: if the store's API is different
       }

        console.log('[FLOW] routed single/emotion -> L4Deepen', routed?.dominant);
        console.log('[NAV] replace -> L4Deepen after route single/emotion');
        navigation.replace('L4Deepen');
      }
    }
  }, [
    step,
    accepted,
    flow.length,
    routed?.mode,
    routed?.dominant
  ]);

  // -- Handlers --------------------------------------------------------------

  /** Handle choice for L1/L2 card. */
  const onChooseForCurrent = (label, tags) => {
    if (!currentCard) return;
    const ok = pushAccepted(currentCard, label, tags);
    if (!ok) return;
    setStep(prev => prev + 1);
  };

  // -- Rendering -------------------------------------------------------------
  // === PROBE RENDER BRANCH (NEW) ===
  // Render the adaptive 4-probe engine container inline
  if (probe) {
    const theme = t; // full theme from useThemeVars()

    const handleDone = ({ emotion, ranking, vector }) => {
      // Log and move forward once the engine has enough confidence
      logEvent(
        'probe_result',
        { emotion, top: ranking?.[0]?.key, confidence: ranking?.[0]?.score },
        `Probe engine result: ${emotion}`
      );

      // You can persist to your store if needed:
      try {
        const { rebuildEvidence, setDecision, pickEmotion } = useStore.getState();
        rebuildEvidence();
        setDecision({
          mode: 'emotion',
          top: ranking?.slice(0, 2).map(r => r.key),
          probs: Object.fromEntries((ranking || []).map(r => [r.key, r.score])),
        });
        if (emotion) pickEmotion(emotion);
      } catch (e) {
        console.warn('[ReflectionFlow] store update failed in handleDone', e);
      }

      // Navigate to the next step in your flow
      navigation.replace('L4Deepen');
      printExplainTable(emotion);
    };

    return (
      <ScreenWrapper useFlexHeight route={route}>
        <ProbeContainer
          theme={theme}
          seedEmotions={
            routed
              ? [routed.dominant, routed.secondary].filter(Boolean)
              : undefined
          }
          seedVector={routed?.vector}
          onDone={handleDone}
          onStart={({ start, topTwo, ranking }) => {
            console.log('[EXPLAIN PROBE START]', { start, topTwo });
          }}
          onStep={({ phase, probeType, label, delta, snapshot }) => {
            pushProbeRow({ probeType, label, delta, snapshot });
          }}
        />
      </ScreenWrapper>
    );
  }
  // === END PROBE RENDER BRANCH (NEW) ===
      // === END PROBE RENDER BRANCH ===

    // 2) If no more cards — blank (useEffect above will route)
    if (!currentCard) {
      return <ScreenWrapper useFlexHeight route={route} />;
    }

    // Normalize options interface
  const opts = currentCard.options || [];
  const forceSwipe = isForcedSwipeCard(currentCard.id, /*probeActive*/ false);
  const swipeCard = forceSwipe ? coerceToSwipeCard(currentCard) : null;

  // If forced swipe and we managed to coerce a binary choice -> render SwipeCard
  if (forceSwipe && swipeCard) {
    return (
      <ScreenWrapper useFlexHeight route={route}>
        <View style={{ flex: 1, position: 'relative' }}>
          <SwipeHint color={hintColor} top={8} />
          <BottomAffirm color={hintColor} bottom={12} />
            <SwipeCard
            card={swipeCard}
              onSwipeLeft={() => onChooseForCurrent(swipeCard.leftOption.text,  swipeCard.leftOption.tags)}
              onSwipeRight={() => onChooseForCurrent(swipeCard.rightOption.text, swipeCard.rightOption.tags)}
            />
        </View>
      </ScreenWrapper>
    );
  }

  // Otherwise, keep existing behavior:
  // - 2 options -> SwipeCard
  // - 3+ options -> QuestionBlock
  if (opts.length === 2) {
    const left  = { text: opts[0].label, tags: opts[0].tags || [] };
    const right = { text: opts[1].label, tags: opts[1].tags || [] };
    return (
      <ScreenWrapper useFlexHeight route={route}>
        <View style={{ flex: 1, position: 'relative' }}>
          <SwipeHint color={hintColor} top={8} />
          <BottomAffirm color={hintColor} bottom={12} />
            <SwipeCard
              card={{ text: currentCard.title, leftOption: left, rightOption: right }}
              onSwipeLeft={() => onChooseForCurrent(left.text, left.tags)}
              onSwipeRight={() => onChooseForCurrent(right.text, right.tags)}
            />
          </View>
      </ScreenWrapper>
    );
  }

  // 3+ -> QuestionBlock
  return (
    <ScreenWrapper useFlexHeight route={route}>
      <QuestionBlock
        data={{
          id: currentCard.id,
          text: currentCard.title,
          options: opts.map(o => ({ text: o.label, tags: o.tags }))
        }}
        onSubmit={(answerText, tags = []) => onChooseForCurrent(answerText, tags)}
      />
    </ScreenWrapper>
  );
}
