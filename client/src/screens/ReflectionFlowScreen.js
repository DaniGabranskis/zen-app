import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ToastAndroid, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackActions } from '@react-navigation/native';

import useThemeVars from '../hooks/useThemeVars';
import ScreenWrapper from '../components/ScreenWrapper';
import SwipeCard from '../components/SwipeCard';
import QuestionBlock from '../components/QuestionBlock';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import L1 from '../data/flow/L1.json';
import L2 from '../data/flow/L2.json';
import L0Morning from '../data/flow/L0.morning.json';
import L0Evening from '../data/flow/L0.evening.json';

import { canonicalizeTags } from '../utils/canonicalizeTags';
import { routeStateFromCards } from '../utils/evidenceEngine';
import { logEvent } from '../utils/telemetry';

import { initCoverage, applyCoverage, isCoreCoverageComplete } from '../utils/flow/coverageGates';
import { initAskedDiscriminators, markDiscriminatorsAsked, hasDiscriminatorAskedFor } from '../utils/flow/discriminatorTracker';
import { canEarlyStop } from '../utils/flow/earlyStop';
import { selectNextCardId } from '../utils/flow/questionSelector';
import { validateFlowCards } from '../utils/flow/validateFlowData';

import useStore from '../store/useStore';

const NOT_SURE_LABEL = 'Not sure';

// Early-stop params (Epic D)
const MIN_QUESTIONS = 12;
const MAX_QUESTIONS = 20;
const MIN_CONF_GAP = 0.12;

// Not sure domination guard (Epic D)
const NOT_SURE_WINDOW = 5;
const NOT_SURE_THRESHOLD = 3;

/**
 * Normalize card data to a stable internal structure.
 * We keep the existing JSON contract (id/title/type/options) and rely on meta.
 */
function normalizeCards(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((c) => ({
    ...c,
    id: String(c?.id || ''),
    title: String(c?.title || ''),
    type: String(c?.type || 'swipe'),
    options: Array.isArray(c?.options) ? c.options : [],
    meta: {
      group: c?.meta?.group || 'confirm',
      covers: Array.isArray(c?.meta?.covers) ? c.meta.covers : [],
      discriminates: Array.isArray(c?.meta?.discriminates) ? c.meta.discriminates : [],
      minAskedAfter: Number.isFinite(c?.meta?.minAskedAfter) ? c.meta.minAskedAfter : 0,
    },
  })).filter((c) => !!c.id);
}

function showToast(msg) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('Notice', msg);
  }
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
 * Ensure SwipeCard input shape: { text, leftOption, rightOption }.
 * If the card is not a swipe card, return null.
 */
function toSwipeCard(currentCard) {
  if (!currentCard) return null;
  const opts = currentCard.options || [];
  if (opts.length !== 2) return null;

  const left = { text: String(opts[0]?.label || ''), tags: Array.isArray(opts[0]?.tags) ? opts[0].tags : [] };
  const right = { text: String(opts[1]?.label || ''), tags: Array.isArray(opts[1]?.tags) ? opts[1].tags : [] };

  return { text: currentCard.title, leftOption: left, rightOption: right };
}

/** Extract top-2 from routed result. */
function getTop2(routed) {
  if (!routed || !routed.probs) return { top1: null, top2: null };
  const pairs = Object.entries(routed.probs || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0));
  return { top1: pairs[0]?.[0] || null, top2: pairs[1]?.[0] || null };
}

/** Compute p(top1) - p(top2). */
function confidenceGap(routed, top1, top2) {
  if (!routed?.probs || !top1 || !top2) return 0;
  const p1 = Number(routed.probs[top1] ?? 0);
  const p2 = Number(routed.probs[top2] ?? 0);
  return p1 - p2;
}

export default function ReflectionFlowScreen({ route }) {
  const sessionType = route?.params?.sessionType === 'evening' ? 'evening' : 'morning';
  const navigation = useNavigation();
  const t = useThemeVars();

    // Ensure store knows the session type (useful for notification entry points).
  try {
    const { setSessionType } = useStore.getState();
    if (typeof setSessionType === 'function') setSessionType(sessionType);
  } catch (e) {
    // no-op
  }

const flowMode = useStore((s) => s.sessionDraft?.flowMode || 'deep');
const isDeep = flowMode === 'deep';

const l0Raw = sessionType === 'evening' ? L0Evening : L0Morning;

const cardsL0 = useMemo(() => normalizeCards(l0Raw), [sessionType]);
const cardsL1 = useMemo(() => normalizeCards(L1), []);
const cardsL2 = useMemo(() => normalizeCards(L2), []);

const l0Ids = useMemo(() => cardsL0.map((c) => c.id), [cardsL0]);

// Base part for Simplified: L0 + L1
const baseIds = useMemo(
  () => [...cardsL0.map((c) => c.id), ...cardsL1.map((c) => c.id)],
  [cardsL0, cardsL1]
);

// Full set for Deep Dive: (L0 + L1) + L2
const allIds = useMemo(
  () => [...baseIds, ...cardsL2.map((c) => c.id)],
  [baseIds, cardsL2]
);

const cards = useMemo(() => [...cardsL0, ...cardsL1, ...cardsL2], [cardsL0, cardsL1, cardsL2]);

const maxQuestions = isDeep ? MAX_QUESTIONS : baseIds.length;
const allIdsToUse = isDeep ? allIds : baseIds;

  const cardsById = useMemo(() => {
    const map = {};
    for (const c of cards) map[c.id] = c;
    return map;
  }, [cards]);

  // Validate data once (dev-friendly)
  useEffect(() => {
    const v = validateFlowCards(cards);
    if (v.errors.length) {
      console.warn('[FLOW_VALIDATE] errors:', v.errors);
    }
    if (v.warnings.length) {
      console.warn('[FLOW_VALIDATE] warnings:', v.warnings);
    }
  }, [cards]);

  // Session state
  const [askedIds, setAskedIds] = useState(() => new Set());
  const [plan, setPlan] = useState([]); // ordered list of card ids shown
  const [accepted, setAccepted] = useState([]); // ordered list of answers
  const [coverage, setCoverage] = useState(() => initCoverage());
  const [askedDiscriminators, setAskedDiscriminators] = useState(() => initAskedDiscriminators());

  const askedCount = accepted.length;

  // Routed snapshot updates after each answer
  const routed = useMemo(() => {
    if (!accepted.length) return null;
    // Evidence temperature is computed in evidenceEngine based on notSure ratio
    const res = routeStateFromCards(accepted);
    return res;
  }, [accepted]);

  const { top1, top2 } = useMemo(() => getTop2(routed), [routed]);
  const gap = useMemo(() => confidenceGap(routed, top1, top2), [routed, top1, top2]);

  const coreComplete = useMemo(() => isCoreCoverageComplete(coverage), [coverage]);

  // Pick / append next card when needed
  useEffect(() => {
    if (askedCount >= maxQuestions) return;

    // If plan is shorter than askedCount+1, we need to append the next card.
    if (plan.length > askedCount) return;

  let nextId = null;

    // 0) Force L0 sequence first (morning/evening baseline).
    if (askedCount < l0Ids.length) {
      nextId = l0Ids[askedCount] || null;
    }

    // 1) After L0: use the existing selector for L1/L2.
    if (!nextId) {
      nextId = selectNextCardId({
        cardsById,
        allIds: cards.map((c) => c.id),
        askedIds,
        coverage,
        coreComplete,
        top1,
        top2,
        askedDiscriminators,
        askedCount,
      });
    }

    if (!nextId) return;

    setPlan((prev) => [...prev, nextId]);
    setAskedIds((prev) => {
      const s = new Set(prev);
      s.add(nextId);
      return s;
    });

    logEvent(
      'flow_plan_append',
      { nextId, askedCount, coreComplete, top1, top2 },
      `Flow: appended next card ${nextId}`
    );
  }, [askedCount, plan.length, cardsById, askedIds, coverage, coreComplete, top1, top2, askedDiscriminators, l0Ids, allIdsToUse, maxQuestions]);

  const currentCardId = plan[askedCount] || null;
  const currentCard = currentCardId ? cardsById[currentCardId] : null;

  /** Save one answer into accepted[] in a canonical format. */
  const pushAccepted = (card, answer, chosenLabel, chosenTags = []) => {
    if (!card) return false;

    // Build options map label -> tags
    const optionsObj = {};
    (card.options || []).forEach((o) => {
      optionsObj[o.label] = Array.isArray(o.tags) ? o.tags : [];
    });
    if (!optionsObj[NOT_SURE_LABEL]) optionsObj[NOT_SURE_LABEL] = [];

    const tags = canonicalizeTags(chosenTags);

    console.log('[CARD_CHOICE]', {
      id: card.id,
      answer,
      label: chosenLabel,
      rawTags: chosenTags,
      canonicalTags: tags,
    });

    logEvent(
      'card_choice',
      { step: card.id, answer, label: chosenLabel, canonicalTags: tags },
      `User chose "${chosenLabel}" (${answer}) on ${card.id}`
    );

    const answeredEvent =
      answer === 'A' ? 'answered_A' :
      answer === 'B' ? 'answered_B' :
      'answered_notSure';

    logEvent(
      answeredEvent,
      {
        cardId: card.id,
        group: card?.meta?.group,
        covers: card?.meta?.covers,
        discriminates: card?.meta?.discriminates,
        answer,
      },
      `${answeredEvent} on ${card.id}`
    );

    // Block A/B with empty tags to avoid silent "no-op" evidence
    if (answer !== 'notSure' && tags.length === 0) {
      console.warn(`[NO_TAGS] card=${card.id} option="${chosenLabel}" — option has no tags, answer blocked.`);
      showToast('This option is not configured yet. Please choose another.');
      return false;
    }

    // Update local state
    setAccepted((prev) => ([
      ...prev,
      {
        id: card.id,
        selectedOption: chosenLabel,
        options: optionsObj,
        answer, // A|B|notSure
        group: card?.meta?.group || '',
        covers: card?.meta?.covers || [],
        discriminates: card?.meta?.discriminates || [],
      }
    ]));

    // Persist to store
    try {
      useStore.getState().appendAccepted({
        id: card.id,
        selectedKey: chosenLabel,
        selectedLabel: chosenLabel,
        selectedTags: tags,
        answer,
        isNotSure: answer === 'notSure',
        group: card?.meta?.group || '',
      });
    } catch (e) {
      // no-op: store API mismatch should not crash the UI flow
    }

        // Persist L0 answers separately for future adaptive branching.
    if (card?.meta?.group === 'l0') {
      try {
        const { setL0Answer } = useStore.getState();
        if (typeof setL0Answer === 'function') {
          setL0Answer({
            cardId: card.id,
            selectedLabel: chosenLabel,
            selectedTags: tags,
            answer,
          });
        }
      } catch (e) {
        // no-op
      }
    }


    // Update coverage (based on the card, not the tags)
    setCoverage((prev) => applyCoverage(prev, card));

    // Update discriminator tracker if card is a discriminator
    if (card?.meta?.group === 'discriminator') {
      setAskedDiscriminators((prev) => markDiscriminatorsAsked(prev, card));
    }

    return true;
  };

  const onChooseForCurrent = (answer, label, tags) => {
    if (!currentCard) return;
    const ok = pushAccepted(currentCard, answer, label, tags);
    if (!ok) return;
  };

  const onNotSureForCurrent = () => {
    if (!currentCard) return;
    const ok = pushAccepted(currentCard, 'notSure', NOT_SURE_LABEL, []);
    if (!ok) return;
  };

  // Early stop / finish control (Epic D)
  useEffect(() => {
    if (!isDeep) return;
    if (!accepted.length) return;
    if (askedCount < MIN_QUESTIONS) return;
    if (askedCount >= MAX_QUESTIONS) return;

    if (!routed || !top1 || !top2) return;

    const ok = canEarlyStop({
      askedCount,
      minQuestions: MIN_QUESTIONS,
      coreCoverage: coverage,
      askedDiscriminators,
      top1,
      top2,
      confidenceGap: gap,
      minGap: MIN_CONF_GAP,
      accepted,
      notSureWindow: NOT_SURE_WINDOW,
      notSureThreshold: NOT_SURE_THRESHOLD,
    });

    if (!ok) return;

    logEvent(
      'flow_early_stop',
      { askedCount, top1, top2, gap },
      `Flow: early stop at ${askedCount} (top1=${top1}, top2=${top2}, gap=${gap})`
    );

    // Persist debug snapshots
    try {
      useStore.getState().setDecision?.(routed);
      useStore.getState().setL1L2Debug?.({
        plan,
        coverage,
        askedDiscriminators: Array.from(askedDiscriminators || []),
      });
    } catch (e) {}

    // Continue with the existing pipeline: set state (primary) + emotion lens and go to L4
    try {
      useStore.getState().pickState?.(routed?.stateKey || routed?.dominant, routed?.emotionKey);
    } catch (e) {}

    navigation.dispatch(StackActions.replace('L4Deepen'));
  }, [askedCount, routed, top1, top2, gap, coverage, askedDiscriminators, accepted, plan, navigation]);

  // Hard stop at MAX_QUESTIONS
  useEffect(() => {
    if (askedCount !== maxQuestions) return;

    const final = routeStateFromCards(accepted);

    logEvent(
      'flow_max_reached',
      { askedCount, maxQuestions, mode: flowMode, dominant: final?.dominant },
      'Flow: reached max questions'
    );

    try {
      useStore.getState().setDecision?.(final);
      useStore.getState().pickState?.(final?.stateKey || final?.dominant, final?.emotionKey);
    } catch (e) {}

    if (isDeep) {
      navigation.dispatch(StackActions.replace('L4Deepen'));
    } else {
      navigation.dispatch(StackActions.replace('L5Summary', { mode: 'simplified' }));
    }
  }, [askedCount, maxQuestions, isDeep, flowMode, accepted, navigation]);

  // Render
  const swipeCard = useMemo(() => toSwipeCard(currentCard), [currentCard]);

  if (!currentCard) {
    return (
      <ScreenWrapper>
        <View style={{ padding: 16 }}>
          <SwipeHint color={t.textSecondary} top={8} />
          <Text style={{ color: t.textPrimary, fontSize: 16 }}>
            Loading reflection…
          </Text>
          <BottomAffirm color={t.textSecondary} bottom={12} />
        </View>
      </ScreenWrapper>
    );
  }

  const opts = currentCard.options || [];

return (
  <ScreenWrapper>
    {swipeCard ? (
      <View style={{ flex: 1, position: 'relative' }}>
        <SwipeHint color={t.textSecondary} top={8} />

        <SwipeCard
          card={swipeCard}
          onSwipeLeft={() => onChooseForCurrent('A', swipeCard.leftOption.text, swipeCard.leftOption.tags)}
          onSwipeRight={() => onChooseForCurrent('B', swipeCard.rightOption.text, swipeCard.rightOption.tags)}
          onNotSure={onNotSureForCurrent}
          notSureLabel={NOT_SURE_LABEL}
          enableSwipeUpNotSure={false}
        />

        <BottomAffirm color={t.textSecondary} bottom={12} />
      </View>
    ) : (
      <QuestionBlock
        title={currentCard.title}
        options={currentCard.options}
        onChoose={(opt) => onChooseForCurrent('A', opt.label, opt.tags)}
        onNotSure={onNotSureForCurrent}
        notSureLabel={NOT_SURE_LABEL}
      />
    )}
  </ScreenWrapper>
);
}
