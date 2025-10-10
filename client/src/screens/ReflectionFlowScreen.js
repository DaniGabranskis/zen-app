import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';

import ScreenWrapper from '../components/ScreenWrapper';
import SwipeCard from '../components/SwipeCard';
import QuestionBlock from '../components/QuestionBlock';

import { canonicalizeTags } from '../utils/tagCanon';
import { routeEmotionFromCards } from '../utils/evidenceEngine';

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
  const navigation = useNavigation();

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

    if (routed?.mode === 'probe') {
      // Minimal MVP: pick the first available probe.
      // Later: choose probe by conflict pair from routed.details.
      setProbe(PROBES?.[0] || null);
    } else {
      navToResult(accepted, routed);
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

    navToResult(all, routed);
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
        <SwipeCard
          card={swipeCard}
          onSwipeLeft={() => onChooseProbe(swipeCard.leftOption.text,  swipeCard.leftOption.tags)}
          onSwipeRight={() => onChooseProbe(swipeCard.rightOption.text, swipeCard.rightOption.tags)}
        />
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
      <SwipeCard
        card={swipeCard}
        onSwipeLeft={() => onChooseForCurrent(swipeCard.leftOption.text,  swipeCard.leftOption.tags)}
        onSwipeRight={() => onChooseForCurrent(swipeCard.rightOption.text, swipeCard.rightOption.tags)}
      />
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
        <SwipeCard
          card={{ text: currentCard.title, leftOption: left, rightOption: right }}
          onSwipeLeft={() => onChooseForCurrent(left.text, left.tags)}
          onSwipeRight={() => onChooseForCurrent(right.text, right.tags)}
        />
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
