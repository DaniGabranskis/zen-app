// src/screens/DiagnosticFlowScreen.js
// Comments in English only.

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackActions } from '@react-navigation/native';

import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import SwipeCard from '../components/SwipeCard';

import L1 from '../data/flow/L1.json';
import L2 from '../data/flow/L2.json';

import useStore from '../store/useStore';
import { canonicalizeTags } from '../utils/canonicalizeTags';
import { routeStateFromCards } from '../utils/evidenceEngine';
import { routeStateFromBaseline } from '../utils/baselineEngine';
import { routeStateFromDeep } from '../utils/deepEngine'; // Task AF: Deep engine integration
import { buildDiagnosticPlan } from '../utils/diagnosticPlanner';
import { buildProbePlan } from '../utils/probePlanBuilder';

function normalizeCards(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((c) => ({
    id: String(c?.id || ''),
    title: String(c?.title || ''),
    type: String(c?.type || 'swipe'),
    options: Array.isArray(c?.options) ? c.options : [],
    meta: c?.meta || {},
  })).filter((c) => !!c.id);
}

function toSwipeCard(card) {
  if (!card) return null;
  const opts = card.options || [];
  if (opts.length !== 2) return null;

  const left = { text: String(opts[0]?.label || ''), tags: Array.isArray(opts[0]?.tags) ? opts[0].tags : [] };
  const right = { text: String(opts[1]?.label || ''), tags: Array.isArray(opts[1]?.tags) ? opts[1].tags : [] };

  return { text: card.title, leftOption: left, rightOption: right };
}

export default function DiagnosticFlowScreen({ navigation }) {
  const t = useThemeVars();

  const flowMode = useStore((s) => s.sessionDraft?.flowMode || 'deep');
  const isDeep = flowMode === 'deep';

  const baselineMetrics = useStore((s) => s.sessionDraft?.baseline?.metrics) || null;
const sessionType = useStore((s) => s.sessionDraft?.sessionType || 'morning');
const plans = useStore((s) => s.sessionDraft?.plans) || { focusTags: [], intensity: 'med' };

  const allCards = useMemo(() => {
    const cards = [...normalizeCards(L1), ...normalizeCards(L2)];
    const byId = {};
    for (const c of cards) byId[c.id] = c;
    return { cards, byId };
  }, []);

const plan = useMemo(() => {
  return buildDiagnosticPlan({ baselineMetrics, mode: flowMode, sessionType, plans });
}, [baselineMetrics, flowMode, sessionType, plans]);

  // A3: Protection - if simplified mode, immediately finish without questions
  useEffect(() => {
    if (flowMode === 'simplified' && !isFinished) {
      setIsFinished(true);

      // Task AF: Simplified flow - use baseline engine only
      const evidence = routeStateFromCards(accepted);
      const combined = routeStateFromBaseline(baselineMetrics, {
        evidenceVector: evidence?.vector,
        evidenceWeight: 0.0, // simplified should not mix evidence here
      });

      try {
        useStore.getState().setDecision?.(combined);
        useStore.getState().pickState?.(combined.stateKey, combined.emotionKey);
        if (typeof useStore.getState().setMacroMicroStates === 'function') {
          useStore.getState().setMacroMicroStates?.(combined.stateKey, null);
        }
      } catch (e) {
        // no-op
      }

      navigation.dispatch(StackActions.replace('L5Summary', { mode: 'simplified' }));
    }
  }, [flowMode, isFinished, accepted, baselineMetrics, navigation]);

  const [index, setIndex] = useState(0);
  const [accepted, setAccepted] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [probePlan, setProbePlan] = useState([]);
  const [probeIndex, setProbeIndex] = useState(0);
  const [isInProbePhase, setIsInProbePhase] = useState(false);

  // Determine current question: main plan or probe plan
  const currentMainId = !isInProbePhase ? plan[index] : null;
  const currentProbeId = isInProbePhase ? probePlan[probeIndex] : null;
  const currentId = currentProbeId || currentMainId;
  const currentCard = currentId ? allCards.byId[currentId] : null;
  const swipeCard = useMemo(() => toSwipeCard(currentCard), [currentCard]);

  const pushAccepted = (card, selectedKey, label, tags, isNotSure = false) => {
    const safeTags = canonicalizeTags(tags || []);
    const item = {
      id: card.id,
      selectedKey,
      selectedLabel: label,
      selectedTags: safeTags,
      answer: selectedKey,
      isNotSure,
      group: String(card?.meta?.group || ''),
    };

    setAccepted((prev) => [...prev, item]);

    try {
      useStore.getState().appendAccepted?.(item);
      useStore.getState().rebuildEvidence?.();
    } catch (e) {
      // no-op
    }

    // Advance index: main plan or probe plan
    if (isInProbePhase) {
      setProbeIndex((v) => v + 1);
    } else {
      setIndex((v) => v + 1);
    }
  };

  // Check if plan is finished and trigger finish in useEffect (not during render)
  useEffect(() => {
    // Handle empty plan case (e.g., Morning Simplified should skip DiagnosticFlow)
    if (plan.length === 0 && !isFinished) {
      setIsFinished(true);
      // For empty plan, route directly to L5
      const evidence = routeStateFromCards(accepted);
      const combined = routeStateFromBaseline(baselineMetrics, {
        evidenceVector: evidence?.vector,
        evidenceWeight: isDeep ? 0.45 : 0.25,
      });

      try {
        useStore.getState().setDecision?.(combined);
        // Save both stateKey and emotionKey for L5SummaryScreen
        useStore.getState().pickState?.(combined.stateKey, evidence?.emotionKey || combined.emotionKey);
      } catch (e) {
        // no-op
      }

      navigation.dispatch(
        StackActions.replace('L5Summary', { mode: isDeep ? 'deep' : 'simplified' })
      );
      return;
    }

    // Handle finished main plan case - check if probe is needed
    if (index >= plan.length && !isFinished && !isInProbePhase && plan.length > 0) {
      // Calculate intermediate decision to check if probe is needed
      // Task AF: Intermediate calculation for probe decision - use baseline engine
      const intermediateEvidence = routeStateFromCards(accepted);
      const intermediateCombined = routeStateFromBaseline(baselineMetrics, {
        evidenceVector: intermediateEvidence?.vector,
        evidenceWeight: isDeep ? 0.45 : 0.25,
      });

      const needsProbe = 
        intermediateCombined?.mode === 'probe' || 
        intermediateCombined?.isUncertain === true ||
        intermediateEvidence?.mode === 'probe' ||
        intermediateEvidence?.isUncertain === true;

      if (needsProbe && probePlan.length === 0) {
        // Build probe plan based on top-2 states
        const topStates = [
          intermediateCombined?.stateKey || intermediateCombined?.dominant,
          intermediateCombined?.secondary,
        ].filter(Boolean);

        const alreadyAsked = accepted.map(a => a.id);
        const probeQuestions = buildProbePlan({
          topStates,
          alreadyAskedIds: alreadyAsked,
        });

        if (probeQuestions.length > 0) {
          setProbePlan(probeQuestions);
          setIsInProbePhase(true);
          setProbeIndex(0);
          return; // Don't finish yet, continue with probe
        }
      }

      // No probe needed or probe plan is empty → finish
      setIsFinished(true);
      
      // Use setTimeout to defer navigation/state updates to avoid React warnings
      setTimeout(() => {
        // Recalculate final decision (including probe answers if any)
        const finalEvidence = routeStateFromCards(accepted);
        const finalCombined = routeStateFromBaseline(baselineMetrics, {
          evidenceVector: finalEvidence?.vector,
          evidenceWeight: isDeep ? 0.45 : 0.25,
        });

        try {
          useStore.getState().setDecision?.(finalCombined);
          // Save both stateKey and emotionKey for L5SummaryScreen
          useStore.getState().pickState?.(finalCombined.stateKey, finalEvidence?.emotionKey || finalCombined.emotionKey);
        } catch (e) {
          // no-op
        }

        if (isDeep && sessionType === 'evening') {
          navigation.dispatch(StackActions.replace('L4Deepen'));
          return;
        }

        navigation.dispatch(
          StackActions.replace('L5Summary', { mode: isDeep ? 'deep' : 'simplified' })
        );
      }, 0);
    }

    // Handle finished probe phase
    if (isInProbePhase && probeIndex >= probePlan.length && !isFinished) {
      setIsFinished(true);
      
      setTimeout(() => {
        // Task AF: Use deep engine for deep flow, baseline engine for simplified (probe phase)
        let finalCombined;
        
        if (isDeep) {
          // Deep flow: use deepEngine with L1 responses
          const l1Responses = accepted
            .filter(item => item.group === 'l1' || item.group === 'l2')
            .map(item => ({
              tags: item.selectedTags || [],
              values: {},
              uncertainty: item.isNotSure ? 'low_clarity' : null,
            }));
          
              finalCombined = await routeStateFromDeep(baselineMetrics, l1Responses, {
                evidenceWeight: 0.45,
              });
          
          const finalEvidence = routeStateFromCards(accepted);
          if (finalEvidence?.emotionKey) {
            finalCombined.emotionKey = finalEvidence.emotionKey;
          }
        } else {
          // Simplified flow: use baseline engine
          const finalEvidence = routeStateFromCards(accepted);
          finalCombined = routeStateFromBaseline(baselineMetrics, {
            evidenceVector: finalEvidence?.vector,
            evidenceWeight: 0.25,
          });
          
          if (finalEvidence?.emotionKey) {
            finalCombined.emotionKey = finalEvidence.emotionKey;
          }
        }

        try {
          useStore.getState().setDecision?.(finalCombined);
          useStore.getState().pickState?.(finalCombined.stateKey || finalCombined.macroKey, finalCombined.emotionKey);
        } catch (e) {
          // no-op
        }

        if (isDeep && sessionType === 'evening') {
          navigation.dispatch(StackActions.replace('L4Deepen'));
          return;
        }

        navigation.dispatch(
          StackActions.replace('L5Summary', { mode: isDeep ? 'deep' : 'simplified' })
        );
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, probeIndex, isFinished, plan.length, probePlan.length, isInProbePhase, accepted.length, isDeep, sessionType]);

  if (!currentCard || isFinished) {
    // Finished plan - show loading state while transitioning
    return (
      <ScreenWrapper>
        <View style={{ padding: 16 }}>
          <Text style={{ color: t.textSecondary }}>Finalizing…</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!swipeCard) {
    return (
      <ScreenWrapper>
        <View style={{ padding: 16 }}>
          <Text style={{ color: t.textSecondary }}>
            Unsupported card type for "{currentCard.id}"
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <SwipeCard
          card={swipeCard}
          onSwipeLeft={() => {
            const opt = currentCard.options[0];
            pushAccepted(currentCard, 'A', opt?.label || 'A', opt?.tags || []);
          }}
          onSwipeRight={() => {
            const opt = currentCard.options[1];
            pushAccepted(currentCard, 'B', opt?.label || 'B', opt?.tags || []);
          }}
          onNotSure={() => {
            pushAccepted(currentCard, 'NS', 'Not sure', [], true);
          }}
          notSureLabel="Not sure"
        />
        <Text style={[styles.counter, { color: t.textSecondary }]}>
          {isInProbePhase
            ? `Clarifying ${probeIndex + 1} / ${probePlan.length}`
            : `${Math.min(index + 1, plan.length)} / ${plan.length}`}
        </Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  counter: { position: 'absolute', bottom: 26, fontSize: 12, fontWeight: '700' },
});
