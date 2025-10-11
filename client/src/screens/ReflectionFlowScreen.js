import React, { useEffect, useMemo, useState, useRef  } from 'react';
import { Alert, Platform, ToastAndroid, View, Text } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import useThemeVars from '../hooks/useThemeVars';

import ScreenWrapper from '../components/ScreenWrapper';
import SwipeCard from '../components/SwipeCard';
import QuestionBlock from '../components/QuestionBlock';

import { canonicalizeTags } from '../utils/tagCanon';
import { routeEmotionFromCards } from '../utils/evidenceEngine';
import { logEvent } from '../utils/telemetry';
import useStore from '../store/useStore';

import L1 from '../data/flow/L1.json';
import L2 from '../data/flow/L2.json';
import PROBES from '../data/probes.v1.json';

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
 *   L1 (5 swipes) -> L2 (6 swipes) -> Evidence -> (optional Probe) -> Result
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

export default function ReflectionFlowScreen() {
  const didRouteRef = useRef(false);
  const navigation = useNavigation();
   const { textSub } = useThemeVars(); // subtle color for the "← Swipe →" hint

  // L1 + L2 sequence (5 + 6 cards)
  const flow = useMemo(() => [...L1, ...L2], []);
  const [step, setStep] = useState(0);           // index inside flow
  const [accepted, setAccepted] = useState([]);  // collected answers
  const [probe, setProbe] = useState(null);      // { id, question, options[] } | null

  const currentCard = probe ? null : flow[step];

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
      selectedTags,
    });

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
    if (probe) return;                 // when probe is shown, we wait for its answer
    if (step < flow.length) return;    // still inside L1+L2

    // All L1+L2 answered — run evidence engine
    const routed = routeEmotionFromCards(accepted);
    const entries = Object.entries(routed.probs || {}).sort((a,b)=>b[1]-a[1]);
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


    if (routed?.mode === 'probe') {
      // Minimal MVP: pick the first available probe.
      // Later: choose probe by conflict pair from routed.details.
      setProbe(PROBES?.[0] || null);
    } else {
      const { rebuildEvidence, setDecision, pickEmotion } = useStore.getState();
      rebuildEvidence();
      setDecision({
        mode: routed.mode,
        top: [routed.dominant, routed.secondary].filter(Boolean),
        probs: routed.probs,
      });

      // guard: run navigation/log only once
      if (!didRouteRef.current) {
        didRouteRef.current = true;
        if (routed?.dominant) pickEmotion(routed.dominant);
        navigation.navigate('L4Deepen');

        // log using store snapshot (no routed out-of-scope)
        const st = useStore.getState();
        const dom = st.sessionDraft?.decision?.top?.[0] || st.sessionDraft?.l3?.emotionKey || null;
        const mode = st.sessionDraft?.decision?.mode || null;
        logEvent('nav_to_l4', { dominant: dom, mode }, `Navigate to L4 with emotion=${dom || '-'}`);
      }
    }
  }, [step, probe, accepted, flow.length]);

  // -- Handlers --------------------------------------------------------------

  /** Handle choice for L1/L2 card. */
  const onChooseForCurrent = (label, tags) => {
    if (!currentCard) return;
    const ok = pushAccepted(currentCard, label, tags);
    if (!ok) return;
    setStep(prev => prev + 1);
  };

  /** Handle answer for Probe. */
  const onChooseProbe = (label, tags) => {
    if (!probe) return;

    // Compose PR_* pseudo-card.
    const prOptions = {};
    (probe.options || []).forEach(o => { prOptions[o.label] = o.tags || []; });

    const prCard = {
      id: `PR_${probe.id}`,
      selectedOption: label,
      options: prOptions,
    };

    const all = [...accepted, prCard];
    const routed = routeEmotionFromCards(all);
    // DIAG: route after probe answer
    console.log('[ROUTE:AFTER_PROBE]', JSON.stringify({
      mode: routed.mode,
      dominant: routed.dominant,
      secondary: routed.secondary,
      confidence: routed.confidence,
      p1: routed?.probs?.[routed.dominant],
      p2: routed?.secondary ? routed?.probs?.[routed.secondary] : null,
      delta: routed.delta,
      top3: Object.entries(routed.probs || {}).sort((a,b)=>b[1]-a[1]).slice(0,3),
    }, null, 2));

    logEvent('route_after_probe', {
      mode: routed.mode,
      dominant: routed.dominant,
      secondary: routed.secondary,
      p1: routed?.probs?.[routed.dominant],
      p2: routed?.secondary ? routed?.probs?.[routed.secondary] : null,
      delta: routed.delta,
      top3: Object.entries(routed.probs || {}).sort((a,b)=>b[1]-a[1]).slice(0,3),
    }, `After probe → dom=${routed.dominant} (p1=${(routed?.probs?.[routed.dominant] ?? 0).toFixed(2)})`);

    const { rebuildEvidence, setDecision, pickEmotion } = useStore.getState();
      rebuildEvidence();
      setDecision({
        mode: routed.mode,
        top: [routed.dominant, routed.secondary].filter(Boolean),
        probs: routed.probs,
      });

      if (routed?.dominant) pickEmotion(routed.dominant);
      navigation.replace('L4Deepen');

      // log using store snapshot (no routed out-of-scope)
      {
        const st = useStore.getState();
        const dom = st.sessionDraft?.decision?.top?.[0] || st.sessionDraft?.l3?.emotionKey || null;
        const mode = st.sessionDraft?.decision?.mode || null;
        logEvent('nav_to_l4_after_probe', { dominant: dom, mode }, `Navigate to L4 after probe with emotion=${dom || '-'}`);
      }
    };

  // -- Rendering -------------------------------------------------------------

  // 1) If probe requested — show it via QuestionBlock
if (probe) {
  // Build a fake card to reuse swipe renderer
  const probeCard = {
    id: `PR_${probe.id}`,
    title: probe.question,
    options: (probe.options || []).map(o => ({ label: o.label, tags: o.tags || [] })),
  };
  const swipeCard = coerceToSwipeCard(probeCard);

  // If we couldn't build a good binary pair (unlikely) fallback to QuestionBlock
  if (!swipeCard) {
    return (
      <ScreenWrapper useFlexHeight>
        <QuestionBlock
          data={{ text: probe.question, options: probe.options.map(o => ({text:o.label, tags:o.tags})) }}
          onSubmit={(answerText, tags=[]) => onChooseProbe(answerText, tags)}
        />
      </ScreenWrapper>
    );
  }

    return (
      <ScreenWrapper useFlexHeight>
        <View style={{ flex: 1, position: 'relative' }}>
          <SwipeHint color={textSub} top={8} />
          <BottomAffirm color={textSub} bottom={12} />
            <SwipeCard
              card={swipeCard}
              onSwipeLeft={() => onChooseProbe(swipeCard.leftOption.text,  swipeCard.leftOption.tags)}
              onSwipeRight={() => onChooseProbe(swipeCard.rightOption.text, swipeCard.rightOption.tags)}
            />
          </View>
      </ScreenWrapper>
    );
  }


  // 2) If no more cards — blank (useEffect above will route)
  if (!currentCard) {
    return <ScreenWrapper useFlexHeight />;
  }

  // Normalize options interface
const opts = currentCard.options || [];
const forceSwipe = isForcedSwipeCard(currentCard.id, /*probeActive*/ false);
const swipeCard = forceSwipe ? coerceToSwipeCard(currentCard) : null;

// If forced swipe and we managed to coerce a binary choice -> render SwipeCard
if (forceSwipe && swipeCard) {
  return (
    <ScreenWrapper useFlexHeight>
      <View style={{ flex: 1, position: 'relative' }}>
        <SwipeHint color={textSub} top={8} />
        <BottomAffirm color={textSub} bottom={12} />
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
      <ScreenWrapper useFlexHeight>
        <View style={{ flex: 1, position: 'relative' }}>
          <SwipeHint color={textSub} top={8} />
          <BottomAffirm color={textSub} bottom={12} />
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
    <ScreenWrapper useFlexHeight>
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
