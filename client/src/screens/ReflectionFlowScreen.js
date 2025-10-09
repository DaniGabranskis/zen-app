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
    navToResult(all, routed);
  };

  // -- Rendering -------------------------------------------------------------

  // 1) If probe requested — show it via QuestionBlock
  if (probe) {
    return (
      <ScreenWrapper useFlexHeight>
        <QuestionBlock
          data={{
            id: `PR_${probe.id}`,
            title: probe.question,
            options: probe.options?.map(o => ({ label: o.label, tags: o.tags })) || []
          }}
          onSubmit={(answerText, tags = []) => onChooseProbe(answerText, tags)}
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
  const asTwo = opts.length === 2;

  // 2a) Two options => use SwipeCard (left/right)
  if (asTwo) {
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

  // 2b) >=3 options => use QuestionBlock (buttons)
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
