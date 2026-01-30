// src/screens/DiagnosticFlowScreen.js
// Comments in English only.

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { StackActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import SwipeCard from '../components/SwipeCard';
import SwipeHeaderHint from '../components/SwipeHeaderHint';

import L1 from '../data/flow/L1.json';
import L2 from '../data/flow/L2.json';

import useStore from '../store/useStore';
// Task A2.3: Switch GUI to domain tags
import { canonicalizeTags } from '../domain/tags';
// TASK 7: Legacy imports only for simplified mode, not deep
import { routeStateFromCards } from '../utils/evidenceEngine';
import { routeStateFromBaseline } from '../utils/baselineEngine';
// A3.3-01: Replaced deepEngine with adapter (single source of truth)
import { createDeepSession } from '../adapters/deepSessionAdapter';
import { buildDiagnosticPlan } from '../utils/diagnosticPlanner';
import { buildProbePlan } from '../utils/probePlanBuilder';
import { pickNextL1Card, areMinimumGatesClosed } from '../utils/l1CardSelector'; // Task AK3-DEEP-L1-1b

function normalizeCards(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((c) => ({
    id: String(c?.id || ''),
    title: String(c?.title || ''),
    hint: String(c?.hint || c?.meta?.hint || ''),
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
  const history = useStore((s) => s.history || []);
  
  // EPIC: Flow vNext - P1: For evening, pull planTags from morning entry of today (if exists)
  const plans = useMemo(() => {
    const draftPlans = useStore.getState().sessionDraft?.plans || { focusTags: [], intensity: 'med' };
    
    // If morning session, use current plans
    if (sessionType === 'morning') {
      return draftPlans;
    }
    
    // If evening session, try to get plans from morning entry today
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const morningEntry = history.find((entry) => {
      if (!entry) return false;
      const entryDate = entry.date || entry.createdAt;
      if (!entryDate) return false;
      const entryDateObj = new Date(entryDate);
      const entryLocal = new Date(entryDateObj.getTime() - entryDateObj.getTimezoneOffset() * 60000);
      const entryKey = entryLocal.toISOString().slice(0, 10);
      const entrySessionType = entry.sessionType || entry.session?.sessionType;
      return entryKey === todayKey && entrySessionType === 'morning';
    });
    
    if (morningEntry) {
      const morningPlans = morningEntry.session?.plans || morningEntry.plans;
      if (morningPlans && Array.isArray(morningPlans.focusTags) && morningPlans.focusTags.length > 0) {
        console.log('[DiagnosticFlow] Using planTags from morning entry:', morningPlans.focusTags);
        return {
          focusTags: morningPlans.focusTags,
          intensity: morningPlans.intensity || 'med',
        };
      }
    }
    
    // Fallback to empty plans for evening
    return { focusTags: [], intensity: 'med' };
  }, [sessionType, history]);

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
  const [adaptiveL1Enabled] = useState(isDeep); // Task AK3-DEEP-L1-1b: Enable adaptive L1 for deep flow
  
  // A3.3-01: Session adapter (single source of truth for deep flow)
  const sessionRef = useRef(null);
  const isSubmittingRef = useRef(false); // A3.3-02: Double-commit protection
  const [currentCardFromAdapter, setCurrentCardFromAdapter] = useState(null); // A3.3-01: Card from adapter
  
  // A3.3-01: Initialize session adapter for deep flow
  useEffect(() => {
    if (!isDeep || !baselineMetrics) {
      sessionRef.current = null;
      return;
    }
    
    const flowConfig = {
      maxL1: 5,
      maxL2: 5,
      minL1: 3,
      minL2: 2,
      stopOnGates: true,
      notSureRate: 0.2,
      profile: 'mix',
    };
    
    sessionRef.current = createDeepSession({
      flowConfig,
      baselineMetrics,
      seed: Date.now(),
      fixtureTags: [],
    });
    
    // Get first card
    const firstCard = sessionRef.current.getNextCard();
    setCurrentCardFromAdapter(firstCard);
    
    return () => {
      sessionRef.current = null;
    };
  }, [isDeep, baselineMetrics]);

  // TASK 11: Reset adapter on blur (no session "sticking")
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (sessionRef.current) {
        sessionRef.current?.reset?.();
        sessionRef.current = null;
        setCurrentCardFromAdapter(null);
      }
    });
    return unsubscribe;
  }, [navigation]);
  
  // Task AK3-DEEP-RT-BUG-2: Maximum steps protection
  const MAX_STEPS = 12;
  
  // Task AK3-POST-4c.1: Session log for smoke tests
  const sessionLogRef = useRef({
    startedAt: null,
    baseline: null,
    macroBase: null,
    macroFinal: null,
    steps: [],
    output: null,
    endedBy: null, // 'early_exit' | 'no_card' | 'max_steps' | 'normal'
    endedReason: null, // Detailed reason from selector (e.g., 'all_l1_cards_asked', 'no_eligible_cards')
  });
  
  // Task AK3-DEEP-RT-BUG-1: Finalize deep flow function
  // Ensures session always completes, even if no more cards or gates not closed
  const finalizeDeepFlow = useCallback(async ({ endedBy, reason }) => {
    if (isFinished || !isDeep) return;
    
    console.log('[DeepFlow] Finalizing session', { endedBy, reason, askedCount: askedIds.size });
    
    setIsFinished(true);
    // Task 1 (P0): "All L1 asked" is a normal completion, not an error-like no_card.
    const endedByFinal = (endedBy === 'no_card' && reason === 'all_l1_cards_asked')
      ? 'completed_l1'
      : endedBy;
    sessionLogRef.current.endedBy = endedByFinal;
    // Task 1: Add endedReason from selector (detailed reason code)
    sessionLogRef.current.endedReason = reason || null;
    
    // Use setTimeout to defer navigation/state updates
    setTimeout(async () => {
      // Recalculate final decision
      const finalEvidence = routeStateFromCards(accepted);
      let finalCombined;
      
      if (isDeep) {
        // Deep flow: use adapter state (A3.3-01: replaced deepEngine with adapter)
        if (sessionRef.current) {
          const adapterState = sessionRef.current.getState();
          // Extract final state from adapter
          finalCombined = {
            macroKey: adapterState.macroKey || adapterState.stateKey,
            microKey: adapterState.microKey,
            confidenceBand: adapterState.confidenceBand,
            clarityFlag: adapterState.clarityFlag,
            needsRefine: adapterState.needsRefine,
            emotionKey: finalEvidence?.emotionKey,
          };
        } else {
          // Fallback: use baseline if adapter not available
          finalCombined = routeStateFromBaseline(baselineMetrics, {
            evidenceVector: finalEvidence?.vector,
            evidenceWeight: 0.25,
          });
          if (finalEvidence?.emotionKey) {
            finalCombined.emotionKey = finalEvidence.emotionKey;
          }
        }
      } else {
        // Simplified flow: use baseline engine
        finalCombined = routeStateFromBaseline(baselineMetrics, {
          evidenceVector: finalEvidence?.vector,
          evidenceWeight: 0.25,
        });
        
        if (finalEvidence?.emotionKey) {
          finalCombined.emotionKey = finalEvidence.emotionKey;
        }
      }
      
      // Task AK3-DEEP-RT-BUG-1: Set honest quality for no_card/max_steps cases
      if (endedBy === 'no_card' || endedBy === 'max_steps') {
        // Force needsRefine = true
        if (finalCombined) {
          finalCombined.needsRefine = true;
          finalCombined.clarityFlag = finalCombined.clarityFlag || 'low';
          if (finalCombined.confidenceBand === 'high') {
            finalCombined.confidenceBand = 'medium';
          }
          // Set microSource to fallback_sanity if micro exists
          if (finalCombined.microKey && finalCombined.microSource !== 'selected') {
            finalCombined.microSource = 'fallback_sanity';
          }
        }
      }
      
      // Task AK3-POST-4c.1: Log final output
      // Task AK3-POST-4c.1b: Add final evidence tags
      if (isDeep) {
        sessionLogRef.current.macroFinal = finalCombined?.macroKey || finalCombined?.stateKey;
        
        const FINAL_TAGS_LIMIT = 40;
        const finalEvidenceTags = evidenceTags.slice(0, FINAL_TAGS_LIMIT);
        const finalEvidenceTagsTruncated = evidenceTags.length > FINAL_TAGS_LIMIT;
        
        // Task AK3-DEEP-TAGS-SMOKE-ASSERT: Check if sig.* tags are present
        const hasSigTags = evidenceTags.some(tag => tag.startsWith('sig.'));
        if (!hasSigTags && evidenceTags.length > 0) {
          console.warn('[DEEP_SMOKE_TAGS] WARNING: No sig.* tags found in evidenceTags!', {
            evidenceTagsCount: evidenceTags.length,
            evidenceTagsSample: evidenceTags.slice(0, 10),
            message: 'L1 tags may not be converting to sig.* format. Gates/micro may not work correctly.',
          });
          // Force needsRefine if no sig.* tags (gates/micro can't work without them)
          if (finalCombined) {
            finalCombined.needsRefine = true;
            finalCombined.clarityFlag = finalCombined.clarityFlag || 'low';
          }
        }
        
        sessionLogRef.current.output = {
          microKey: finalCombined?.microKey || null,
          microSource: finalCombined?.microSource || null,
          microReason: finalCombined?.microReason || null, // P2: Reason for micro selection/fallback
          microTopCandidate: finalCombined?.microTopCandidate || null, // P2: Top candidate even if not selected
          confidenceBand: finalCombined?.confidenceBand || null,
          clarityFlag: finalCombined?.clarityFlag || null,
          needsRefine: finalCombined?.needsRefine !== false,
          finalEvidenceTagsCount: evidenceTags.length,
          finalEvidenceTagsSample: finalEvidenceTags,
          finalEvidenceTagsTruncated,
          // Task AK3-DEEP-TAGS-SMOKE-ASSERT: Add diagnostic flag
          hasSigTags, // Diagnostic: true if at least one sig.* tag exists
        };
        
        // Task AK3-POST-4c.3: Add empty triggers/bodyMind fields (will be filled in L5SummaryScreen)
        sessionLogRef.current.triggers = null; // Will be set in L5SummaryScreen
        sessionLogRef.current.bodyMind = null; // Will be set in L5SummaryScreen
        
        // Task AK3-POST-4c.3: Save sessionLogRef to store for L5SummaryScreen to output complete log
        // EPIC D1: Only output JSON in L5SummaryScreen (after triggers/bodyMind are selected)
        try {
          useStore.getState().setSessionLog?.(JSON.parse(JSON.stringify(sessionLogRef.current)));
        } catch (e) {
          // no-op if setSessionLog doesn't exist
        }
        
        // EPIC D1: Do not output JSON here - wait for L5SummaryScreen to output complete log
      }
      
      try {
        useStore.getState().setDecision?.(finalCombined);
        useStore.getState().pickState?.(finalCombined.stateKey || finalCombined.macroKey, finalCombined.emotionKey);
      } catch (e) {
        // no-op
      }
      
      // Task AK3-DEEP-L4-ALWAYS-1: Deep always goes to L4Deepen
      if (isDeep) {
        navigation.dispatch(StackActions.replace('L4Deepen', { mode: 'deep' }));
        return;
      }
      
      navigation.dispatch(
        StackActions.replace('L5Summary', { mode: 'simplified' })
      );
    }, 0);
  }, [isFinished, isDeep, askedIds, accepted, baselineMetrics, evidenceTags, sessionType, navigation]);
  
  // Task AK3-DEEP-L1-2b: Invariant assertion function
  const assertInvariants = useCallback(({ askedIds, didEarlyExit, gatesClosed, needsRefine, minSteps }) => {
    // Check for duplicates
    const uniq = new Set(askedIds);
    if (uniq.size !== askedIds.length) {
      const duplicates = askedIds.filter((id, idx) => askedIds.indexOf(id) !== idx);
      console.warn('[DeepFlow] Duplicate card detected', { askedIds, duplicates });
      return { ok: false, reason: 'duplicate_card', duplicates };
    }
    
    // Check early exit conditions
    if (didEarlyExit) {
      if (askedIds.length < minSteps) {
        console.warn('[DeepFlow] Early exit blocked: min steps not reached', { 
          steps: askedIds.length, 
          minSteps 
        });
        return { ok: false, reason: 'early_exit_min_steps', steps: askedIds.length, minSteps };
      }
      if (!gatesClosed) {
        console.warn('[DeepFlow] Early exit blocked: gates not closed');
        return { ok: false, reason: 'early_exit_gates_open', gatesClosed };
      }
      if (needsRefine) {
        console.warn('[DeepFlow] Early exit blocked: needsRefine=true');
        return { ok: false, reason: 'early_exit_needs_refine', needsRefine };
      }
    }
    
    return { ok: true };
  }, []);

  // Task AK3-DEEP-L1-1b: Get macroBase from baseline for adaptive selection
  const baselineResult = useMemo(() => {
    if (!baselineMetrics) return null;
    return routeStateFromBaseline(baselineMetrics, { evidenceWeight: 0.0 });
  }, [baselineMetrics]);
  
  const macroBase = baselineResult?.stateKey || baselineResult?.macroKey || null;
  
  // Task AK3-DEEP-LOG-1: Initialize sessionLogRef at start for deep flow
  useEffect(() => {
    if (isDeep && !sessionLogRef.current.startedAt) {
      sessionLogRef.current.startedAt = Date.now();
      sessionLogRef.current.baseline = baselineMetrics ? { ...baselineMetrics } : null;
      sessionLogRef.current.macroBase = macroBase;
    }
  }, [isDeep, baselineMetrics, macroBase]);

  // Task AK3-DEEP-L1-1b: Collect evidence tags from accepted cards
  // P0: Use both selectedTags and tags to ensure deepEngine sees all tags
  const getTags = (item) => item.selectedTags || item.tags || [];
  const evidenceTags = useMemo(() => {
    return accepted.flatMap(getTags);
  }, [accepted]);

  // Task AK3-DEEP-L1-1b: Track askedIds and quality for adaptive selection
  const askedIds = useMemo(() => new Set(accepted.map(a => a.id)), [accepted]);
  
  // Current quality from intermediate routing (if available)
  const currentEvidence = useMemo(() => routeStateFromCards(accepted), [accepted]);
  const currentQuality = useMemo(() => {
    if (!currentEvidence || !baselineMetrics) return { needsRefine: true };
    const combined = routeStateFromBaseline(baselineMetrics, {
      evidenceVector: currentEvidence?.vector,
      evidenceWeight: isDeep ? 0.45 : 0.25,
    });
    return {
      needsRefine: combined?.mode === 'probe' || combined?.isUncertain === true,
      confidenceBand: combined?.confidenceBand || null,
      clarityFlag: combined?.clarityFlag || null,
    };
  }, [currentEvidence, baselineMetrics, isDeep]);

  // Task AK3-DEEP-L1-1b: Adaptive L1 selection for deep flow
  // Task AK3-POST-4c.1b: Store selection decision for logging
  const adaptiveNextL1Result = useMemo(() => {
    if (!adaptiveL1Enabled || !isDeep || isInProbePhase || !macroBase) return null;
    
    // Only use adaptive for L1 cards (not L2)
    const l1Accepted = accepted.filter(a => a.id?.startsWith('L1_'));
    if (l1Accepted.length === 0 && askedIds.size === 0) {
      // First L1 card - start adaptive selection
      const result = pickNextL1Card({
        macroBase,
        askedIds: [],
        evidenceTags: [],
        quality: currentQuality,
        cardsById: allCards.byId,
        askedCount: askedIds.size,
        baselineMetrics,
        baselineConfidence: baselineResult?.confidenceBand || null,
      });
      return result;
    }
    
    // Continue adaptive selection if we're in L1 phase
    const result = pickNextL1Card({
      macroBase,
      askedIds,
      evidenceTags,
      quality: currentQuality,
      cardsById: allCards.byId,
      askedCount: askedIds.size,
      baselineMetrics,
      baselineConfidence: baselineResult?.confidenceBand || null,
    });
    // Task 3 (P0): Hard guard - never show a card that was already accepted.
    // Even if selector has a bug or askedIds got out of sync, we prevent repeated question.
    if (result?.cardId && askedIds?.has?.(result.cardId)) {
      console.warn('[DeepFlow] Preventing duplicate next cardId from selector', {
        cardId: result.cardId,
        selectorReason: result.reason,
        askedCount: askedIds.size,
      });
      return { ...result, cardId: null, reason: 'duplicate_next_card_prevented' };
    }
    return result;
  }, [adaptiveL1Enabled, isDeep, isInProbePhase, macroBase, askedIds, evidenceTags, currentQuality, allCards.byId, accepted]);
  
  const adaptiveNextL1Id = adaptiveNextL1Result?.cardId || null;

  // Task AK3-DEEP-L1-2b: Assert invariants before showing card
  const askedIdsArray = useMemo(() => Array.from(askedIds), [askedIds]);
  useEffect(() => {
    if (!adaptiveL1Enabled || !isDeep || isInProbePhase || askedIdsArray.length === 0) return;
    
    // Check for duplicates
    const invariantCheck = assertInvariants({
      askedIds: askedIdsArray,
      didEarlyExit: false,
      gatesClosed: areMinimumGatesClosed({ macroBase, evidenceTags, baselineMetrics }),
      needsRefine: currentQuality?.needsRefine || false,
      minSteps: 4,
    });
    
    if (!invariantCheck.ok && invariantCheck.reason === 'duplicate_card') {
      console.error('[DeepFlow] CRITICAL: Duplicate card detected in runtime!', {
        askedIds: askedIdsArray,
        duplicates: invariantCheck.duplicates,
      });
      // In production, this should trigger a fallback or recovery
      // For now, just log the error
    }
  }, [adaptiveL1Enabled, isDeep, isInProbePhase, askedIdsArray, macroBase, evidenceTags, currentQuality, assertInvariants]);

  // A3.3-01: For deep flow, use card from adapter; otherwise use legacy logic
  // Determine current question: adaptive L1, main plan, or probe plan (for simplified flow only)
  const currentMainId = !isDeep && !isInProbePhase 
    ? plan[index]
    : null;
  
  // Task AK3-POST-4c.1b: Store current selection result for logging
  const currentSelectionResult = adaptiveL1Enabled && !isInProbePhase ? adaptiveNextL1Result : null;
  const currentProbeId = isInProbePhase ? probePlan[probeIndex] : null;
  const currentId = isDeep ? (currentCardFromAdapter?.id || null) : (currentProbeId || currentMainId);
  const currentCard = isDeep ? currentCardFromAdapter : (currentId ? allCards.byId[currentId] : null);
  const swipeCard = useMemo(() => toSwipeCard(currentCard), [currentCard]);
  const hintText = currentCard?.hint || '';
  
  // Task P1.1b: Runtime warn if hint is missing
  useEffect(() => {
    if (currentCard && (!currentCard.hint || currentCard.hint.trim().length === 0)) {
      console.warn(`[CARD_HINT_MISSING] Card ${currentCard.id} has no hint. This should be caught by validateCardCopy.js`);
    }
  }, [currentCard]);

  const pushAccepted = (card, selectedKey, label, tags, isNotSure = false) => {
    // Task 3: Add tags for NS (Not sure) responses to make them useful signals
    let finalTags = tags || [];
    if (isNotSure && card?.id) {
      // Always add uncertainty tag
      finalTags.push('sig.uncertainty.high');
      
      // Add axis-specific "unknown" tags based on card type
      const cardToAxisMap = {
        'L1_control': 'sig.agency.unknown',
        'L1_clarity': 'sig.clarity.unknown',
        'L1_expectations': 'sig.clarity.unknown',
        'L1_pressure': 'sig.context.work.unknown',
        'L1_social': 'sig.social.unknown',
        'L1_mood': 'sig.valence.unknown',
        'L1_body': 'sig.tension.unknown',
        'L1_energy': 'sig.arousal.unknown',
      };
      const axisTag = cardToAxisMap[card.id];
      if (axisTag) {
        finalTags.push(axisTag);
      }
    }
    
    const safeTags = canonicalizeTags(finalTags);
    const item = {
      id: card.id,
      selectedKey,
      selectedLabel: label,
      selectedTags: safeTags,
      answer: selectedKey,
      isNotSure,
      group: String(card?.meta?.group || ''),
    };

    setAccepted((prev) => {
      // Task 2: Prevent asking/accepting the same card twice in one session (gesture double-fire, re-render, etc.)
      if (prev.some((x) => x.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });

    try {
      useStore.getState().appendAccepted?.(item);
      useStore.getState().rebuildEvidence?.();
    } catch (e) {
      // no-op
    }

    // Task AK3-POST-4c.1: Log step for deep flow
    // Task AK3-POST-4c.1b: Enhanced logging with selection reason and full tags
    // Task AK3-DEEP-LOG-1: Log real selectedKey without mapping
    // Task AK3-DEEP-LOG-2: Log selectedLabel and selectedKey together
    // Task AK3-DEEP-LOG-3: Log gatesBefore and gatesAfter
    if (isDeep && card?.id) {
      const stepIndex = sessionLogRef.current.steps.length;
      
      // Task AK3-DEEP-LOG-1: Use real selectedKey directly (A/B/NS) without mapping
      const response = isNotSure ? 'NS' : selectedKey;
      
      // Task AK3-DEEP-LOG-3: Calculate gates before this step
      const gatesBefore = areMinimumGatesClosed({ macroBase, evidenceTags, baselineMetrics });
      
      // Get selection reason from adaptive selector (if available)
      const selectionReason = adaptiveNextL1Result?.reason || 'fixed_plan';
      
      // Task AK3-POST-4c.1b: Full tags list (limited to 20)
      const TAG_LIMIT = 20;
      const addedTags = safeTags.slice(0, TAG_LIMIT);
      const addedTagsTruncated = safeTags.length > TAG_LIMIT;
      
      // Task AK3-DEEP-LOG-3: Calculate gates after this step (with new tags)
      const evidenceTagsAfter = [...evidenceTags, ...safeTags];
      const gatesAfter = areMinimumGatesClosed({ macroBase, evidenceTags: evidenceTagsAfter, baselineMetrics });
      
      sessionLogRef.current.steps.push({
        stepIndex,
        cardId: card.id,
        response, // Task AK3-DEEP-LOG-1: Real selectedKey (A/B/NS)
        responseKey: selectedKey, // Task AK3-DEEP-LOG-2: Explicit key
        responseLabel: label, // Task AK3-DEEP-LOG-2: Explicit label
        selectedBecause: selectionReason, // Task AK3-POST-4c.1b
        gatesBefore, // Task AK3-DEEP-LOG-3: Gates state before step
        gatesAfter, // Task AK3-DEEP-LOG-3: Gates state after step
        addedTagsCount: safeTags.length,
        addedTags, // Task AK3-POST-4c.1b: Full list (up to 20)
        addedTagsTruncated, // Task AK3-POST-4c.1b
        addedTagsSample: safeTags.slice(0, 8), // Keep for backward compatibility
      });
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
    // TASK 7: Skip legacy logic when using adapter (deep mode)
    if (isDeep && sessionRef.current) {
      // Adapter handles all session end cases, skip legacy finalizeDeepFlow
      return;
    }
    
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

    // TASK 7: Legacy logic disabled - adapter handles all deep mode session end cases
    // The code below was for legacy deep mode and is now disabled since we use adapter
    // Keeping commented for reference, but it should never execute in adapter-based deep mode
    
    /* Legacy code - disabled for adapter-based deep mode
    if (adaptiveL1Enabled && isDeep && !isFinished && !isInProbePhase && adaptiveNextL1Id === null) {
      const reason = adaptiveNextL1Result?.reason || 'unknown';
      
      // Task AK3-DEEP-EARLYEXIT-1: Only allow early_exit if quality is good (no needsRefine/low/fallback)
      // If reason is 'early_exit_gates_closed' and quality is good, allow early exit
      if (reason === 'early_exit_gates_closed' && askedIds.size >= 4) {
        const askedIdsArray = Array.from(askedIds);
        const gatesClosed = areMinimumGatesClosed({ macroBase, evidenceTags, baselineMetrics });
        const invariantCheck = assertInvariants({
          askedIds: askedIdsArray,
          didEarlyExit: true,
          gatesClosed,
          needsRefine: currentQuality?.needsRefine || false,
          minSteps: 4, // MIN_STEPS
        });
        
        // Task AK3-DEEP-EARLYEXIT-1: Check final output quality before allowing early exit
        // Recalculate to ensure we have latest quality
        const finalEvidence = routeStateFromCards(accepted);
        const finalCombined = routeStateFromBaseline(baselineMetrics, {
          evidenceVector: finalEvidence?.vector,
          evidenceWeight: isDeep ? 0.45 : 0.25,
        });
        
        const qualityGood = 
          invariantCheck.ok &&
          currentQuality && 
          !currentQuality.needsRefine &&
          finalCombined?.needsRefine !== true &&
          finalCombined?.confidenceBand !== 'low' &&
          finalCombined?.clarityFlag !== 'low' &&
          finalCombined?.microSource !== 'fallback' &&
          finalCombined?.microSource !== 'fallback_sanity';
        
        if (qualityGood) {
          finalizeDeepFlow({ endedBy: 'early_exit', reason: 'gates_closed_quality_good' });
          return;
        } else {
          // Quality not good enough - continue or finalize as normal
          console.warn('[DeepFlow] Early exit blocked: quality not good enough', {
            needsRefine: finalCombined?.needsRefine,
            confidenceBand: finalCombined?.confidenceBand,
            clarityFlag: finalCombined?.clarityFlag,
            microSource: finalCombined?.microSource,
          });
        }
      }
      
      // Otherwise, no more cards - finalize with no_card
      // Task AK3-DEEP-RT-BUG-1: Always finalize when no cards, even if gates not closed
      // Task AK3-DEEP-END-2: If no_card but gates already closed, finish as early_exit
      const gatesClosed = areMinimumGatesClosed({ macroBase, evidenceTags, baselineMetrics });
      const endedBy = gatesClosed ? 'early_exit' : 'no_card';
      const finalReason = gatesClosed 
        ? 'no_more_cards_but_gates_closed' 
        : (reason || 'no_more_l1_cards');
      
      console.warn('[DeepFlow] No more L1 cards available, finalizing session', { 
        reason: finalReason, 
        askedCount: askedIds.size,
        gatesClosed,
        endedBy,
      });
      finalizeDeepFlow({ endedBy, reason: finalReason });
      return;
    }
    */

    // Handle finished main plan case - check if probe is needed
    const planExhausted = adaptiveL1Enabled 
      ? (adaptiveNextL1Id === null && index >= plan.length)
      : (index >= plan.length);
    
    if (planExhausted && !isFinished && !isInProbePhase && (plan.length > 0 || askedIds.size > 0)) {
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
      
      // Task AK3-POST-4c.1: Mark normal finish
      if (isDeep) {
        // Task 1 (P0): If we ran out because all L1 were asked, treat as normal completion.
        const endReason = adaptiveNextL1Result?.reason || null;
        sessionLogRef.current.endedBy =
          (adaptiveNextL1Id === null && endReason === 'all_l1_cards_asked')
            ? 'completed_l1'
            : (adaptiveNextL1Id === null ? 'no_card' : 'normal');
      }
      
      // Use setTimeout to defer navigation/state updates to avoid React warnings
      setTimeout(() => {
        // Recalculate final decision (including probe answers if any)
        const finalEvidence = routeStateFromCards(accepted);
        const finalCombined = routeStateFromBaseline(baselineMetrics, {
          evidenceVector: finalEvidence?.vector,
          evidenceWeight: isDeep ? 0.45 : 0.25,
        });

        // Task AK3-POST-4c.1: Log final output
        // Task AK3-POST-4c.1b: Add final evidence tags
        if (isDeep) {
          sessionLogRef.current.macroFinal = finalCombined?.macroKey || finalCombined?.stateKey;
          
          const FINAL_TAGS_LIMIT = 40;
          const finalEvidenceTags = evidenceTags.slice(0, FINAL_TAGS_LIMIT);
          const finalEvidenceTagsTruncated = evidenceTags.length > FINAL_TAGS_LIMIT;
          
          // Task AK3-DEEP-TAGS-SMOKE-ASSERT: Check if sig.* tags are present
          const hasSigTags = evidenceTags.some(tag => tag.startsWith('sig.'));
          if (!hasSigTags && evidenceTags.length > 0) {
            console.warn('[DEEP_SMOKE_TAGS] WARNING: No sig.* tags found in evidenceTags!', {
              evidenceTagsCount: evidenceTags.length,
              evidenceTagsSample: evidenceTags.slice(0, 10),
              message: 'L1 tags may not be converting to sig.* format. Gates/micro may not work correctly.',
            });
            // Force needsRefine if no sig.* tags
            if (finalCombined) {
              finalCombined.needsRefine = true;
              finalCombined.clarityFlag = finalCombined.clarityFlag || 'low';
            }
          }
          
          sessionLogRef.current.output = {
            microKey: finalCombined?.microKey || null,
            microSource: finalCombined?.microSource || null,
            confidenceBand: finalCombined?.confidenceBand || null,
            clarityFlag: finalCombined?.clarityFlag || null,
            needsRefine: finalCombined?.needsRefine || false,
            finalEvidenceTagsCount: evidenceTags.length, // Task AK3-POST-4c.1b
            finalEvidenceTagsSample: finalEvidenceTags, // Task AK3-POST-4c.1b: Up to 40 tags
            finalEvidenceTagsTruncated, // Task AK3-POST-4c.1b
            // Task AK3-DEEP-TAGS-SMOKE-ASSERT: Add diagnostic flag
            hasSigTags, // Diagnostic: true if at least one sig.* tag exists
          };
          
          // Task AK3-POST-4c.1: Output session log as JSON
          console.log('[DEEP_SMOKE_SESSION]', JSON.stringify(sessionLogRef.current, null, 2));
        }

        try {
          useStore.getState().setDecision?.(finalCombined);
          // Save both stateKey and emotionKey for L5SummaryScreen
          useStore.getState().pickState?.(finalCombined.stateKey, finalEvidence?.emotionKey || finalCombined.emotionKey);
        } catch (e) {
          // no-op
        }

        // Task AK3-DEEP-L4-ALWAYS-1: Deep always goes to L4Deepen
        if (isDeep) {
          navigation.dispatch(StackActions.replace('L4Deepen', { mode: 'deep' }));
          return;
        }

        navigation.dispatch(
          StackActions.replace('L5Summary', { mode: 'simplified' })
        );
      }, 0);
    }

    // Handle finished probe phase
    if (isInProbePhase && probeIndex >= probePlan.length && !isFinished) {
      setIsFinished(true);
      
      setTimeout(async () => {
        // Task AF: Use deep engine for deep flow, baseline engine for simplified (probe phase)
        let finalCombined;
        
        if (isDeep) {
          // Deep flow: use adapter state (A3.3-01: replaced deepEngine with adapter)
          const finalEvidence = routeStateFromCards(accepted);
          if (sessionRef.current) {
            const adapterState = sessionRef.current.getState();
            // Extract final state from adapter
            finalCombined = {
              macroKey: adapterState.macroKey || adapterState.stateKey,
              microKey: adapterState.microKey,
              confidenceBand: adapterState.confidenceBand,
              clarityFlag: adapterState.clarityFlag,
              needsRefine: adapterState.needsRefine,
              emotionKey: finalEvidence?.emotionKey,
            };
          } else {
            // Fallback: use baseline if adapter not available
            finalCombined = routeStateFromBaseline(baselineMetrics, {
              evidenceVector: finalEvidence?.vector,
              evidenceWeight: 0.25,
            });
            if (finalEvidence?.emotionKey) {
              finalCombined.emotionKey = finalEvidence.emotionKey;
            }
          }
          
          // Task AK3-POST-4c.1: Log final output for deep flow
          // Task AK3-POST-4c.1b: Add final evidence tags
          // Task 1: Add endedReason
          sessionLogRef.current.endedBy = 'normal';
          sessionLogRef.current.endedReason = 'plan_completed';
          sessionLogRef.current.macroFinal = finalCombined?.macroKey || finalCombined?.stateKey;
          
          const FINAL_TAGS_LIMIT = 40;
          const finalEvidenceTags = evidenceTags.slice(0, FINAL_TAGS_LIMIT);
          const finalEvidenceTagsTruncated = evidenceTags.length > FINAL_TAGS_LIMIT;
          
          // Task AK3-DEEP-TAGS-SMOKE-ASSERT: Check if sig.* tags are present
          const hasSigTags = evidenceTags.some(tag => tag.startsWith('sig.'));
          if (!hasSigTags && evidenceTags.length > 0) {
            console.warn('[DEEP_SMOKE_TAGS] WARNING: No sig.* tags found in evidenceTags!', {
              evidenceTagsCount: evidenceTags.length,
              evidenceTagsSample: evidenceTags.slice(0, 10),
              message: 'L1 tags may not be converting to sig.* format. Gates/micro may not work correctly.',
            });
            // Force needsRefine if no sig.* tags
            if (finalCombined) {
              finalCombined.needsRefine = true;
              finalCombined.clarityFlag = finalCombined.clarityFlag || 'low';
            }
          }
          
          sessionLogRef.current.output = {
            microKey: finalCombined?.microKey || null,
            microSource: finalCombined?.microSource || null,
            confidenceBand: finalCombined?.confidenceBand || null,
            clarityFlag: finalCombined?.clarityFlag || null,
            needsRefine: finalCombined?.needsRefine || false,
            finalEvidenceTagsCount: evidenceTags.length, // Task AK3-POST-4c.1b
            finalEvidenceTagsSample: finalEvidenceTags, // Task AK3-POST-4c.1b: Up to 40 tags
            finalEvidenceTagsTruncated, // Task AK3-POST-4c.1b
            // Task AK3-DEEP-TAGS-SMOKE-ASSERT: Add diagnostic flag
            hasSigTags, // Diagnostic: true if at least one sig.* tag exists
          };
          
          // Task AK3-POST-4c.1: Output session log as JSON
          console.log('[DEEP_SMOKE_SESSION]', JSON.stringify(sessionLogRef.current, null, 2));
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

        // Task AK3-DEEP-L4-ALWAYS-1: Deep always goes to L4Deepen
        if (isDeep) {
          navigation.dispatch(StackActions.replace('L4Deepen', { mode: 'deep' }));
          return;
        }

        navigation.dispatch(
          StackActions.replace('L5Summary', { mode: 'simplified' })
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
            Unsupported card type for "{currentCard?.id || 'unknown'}"
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Task P0: Layout constants for Swipe Header + Hint
  const HEADER_TOP = 60;
  const HEADER_HEIGHT = 44; // Approximate height of SwipeHeaderHint (swipe text + hint)
  const CONTENT_TOP_PADDING = HEADER_TOP + HEADER_HEIGHT;

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <SwipeHeaderHint hint={hintText} top={HEADER_TOP} />
        <View style={{ paddingTop: CONTENT_TOP_PADDING, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <SwipeCard
          card={swipeCard}
          onSwipeLeft={() => {
            if (isDeep && sessionRef.current && currentCard) {
              // A3.3-02: Double-commit protection
              if (isSubmittingRef.current) return;
              isSubmittingRef.current = true;
              
              try {
                const opt = currentCard.options[0];
                const result = sessionRef.current.commitAnswer({
                  cardId: currentCard.id,
                  choice: 'A',
                });
                
                if (result.error) {
                  console.error('[DiagnosticFlow] commitAnswer error:', result.error);
                  return;
                }
                
                const state = sessionRef.current.getState();
                const events = sessionRef.current.getEvents();
                
                // TASK 12: Persist only when phase === 'ENDED'
                if (state?.phase === 'ENDED') {
                  setIsFinished(true);
                  
                  // TASK 12: Persist completed session to store/history
                  try {
                    useStore.getState().addSession?.({ state, events });
                  } catch (e) {
                    // no-op: store API may not have addSession method
                  }
                  
                  // TASK 8: Unified navigation contract
                  navigation.navigate('L4Deepen', {
                    sessionState: state,
                    sessionEvents: events,
                    mode: 'deep',
                  });
                  return;
                }
                
                // Get next card
                const next = sessionRef.current.getNextCard();
                setCurrentCardFromAdapter(next);
                
                // Also update accepted for legacy compatibility
                pushAccepted(currentCard, 'A', opt?.label || 'A', opt?.tags || []);
              } finally {
                isSubmittingRef.current = false;
              }
            } else {
              const opt = currentCard.options[0];
              pushAccepted(currentCard, 'A', opt?.label || 'A', opt?.tags || []);
            }
          }}
          onSwipeRight={() => {
            if (isDeep && sessionRef.current && currentCard) {
              // A3.3-02: Double-commit protection
              if (isSubmittingRef.current) return;
              isSubmittingRef.current = true;
              
              try {
                const opt = currentCard.options[1];
                const result = sessionRef.current.commitAnswer({
                  cardId: currentCard.id,
                  choice: 'B',
                });
                
                if (result.error) {
                  console.error('[DiagnosticFlow] commitAnswer error:', result.error);
                  return;
                }
                
                const state = sessionRef.current.getState();
                const events = sessionRef.current.getEvents();
                
                // TASK 12: Persist only when phase === 'ENDED'
                if (state?.phase === 'ENDED') {
                  setIsFinished(true);
                  
                  // TASK 12: Persist completed session to store/history
                  try {
                    useStore.getState().addSession?.({ state, events });
                  } catch (e) {
                    // no-op: store API may not have addSession method
                  }
                  
                  // TASK 8: Unified navigation contract
                  navigation.navigate('L4Deepen', {
                    sessionState: state,
                    sessionEvents: events,
                    mode: 'deep',
                  });
                  return;
                }
                
                // Get next card
                const next = sessionRef.current.getNextCard();
                setCurrentCardFromAdapter(next);
                
                // Also update accepted for legacy compatibility
                pushAccepted(currentCard, 'B', opt?.label || 'B', opt?.tags || []);
              } finally {
                isSubmittingRef.current = false;
              }
            } else {
              const opt = currentCard.options[1];
              pushAccepted(currentCard, 'B', opt?.label || 'B', opt?.tags || []);
            }
          }}
          onNotSure={() => {
            if (isDeep && sessionRef.current && currentCard) {
              // A3.3-02: Double-commit protection
              if (isSubmittingRef.current) return;
              isSubmittingRef.current = true;
              
              try {
                const result = sessionRef.current.commitAnswer({
                  cardId: currentCard.id,
                  choice: 'not_sure',
                });
                
                if (result.error) {
                  console.error('[DiagnosticFlow] commitAnswer error:', result.error);
                  return;
                }
                
                const state = sessionRef.current.getState();
                const events = sessionRef.current.getEvents();
                
                // TASK 12: Persist only when phase === 'ENDED'
                if (state?.phase === 'ENDED') {
                  setIsFinished(true);
                  
                  // TASK 12: Persist completed session to store/history
                  try {
                    useStore.getState().addSession?.({ state, events });
                  } catch (e) {
                    // no-op: store API may not have addSession method
                  }
                  
                  // TASK 8: Unified navigation contract
                  navigation.navigate('L4Deepen', {
                    sessionState: state,
                    sessionEvents: events,
                    mode: 'deep',
                  });
                  return;
                }
                
                // Get next card
                const next = sessionRef.current.getNextCard();
                setCurrentCardFromAdapter(next);
                
                // Also update accepted for legacy compatibility
                pushAccepted(currentCard, 'NS', 'Not sure', [], true);
              } finally {
                isSubmittingRef.current = false;
              }
            } else {
              pushAccepted(currentCard, 'NS', 'Not sure', [], true);
            }
          }}
          notSureLabel="Not sure"
          />
        </View>
        <Text style={[styles.counter, { color: t.textSecondary }]}>
          {isInProbePhase
            ? `Clarifying ${probeIndex + 1} / ${probePlan.length}`
            : adaptiveL1Enabled && isDeep
              ? `Question ${askedIds.size + 1}${currentCardFromAdapter ? ` / up to ${MAX_STEPS}` : ''}`
              : `${Math.min(index + 1, plan.length)} / ${plan.length}`}
        </Text>
      </View>
      
      {/* TASK 10: DEV-only export button with Share */}
      {__DEV__ && isDeep && sessionRef.current && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: '#666',
            padding: 10,
            borderRadius: 5,
          }}
          onPress={async () => {
            try {
              const state = sessionRef.current?.exportState?.() ?? sessionRef.current?.getState?.();
              const events = sessionRef.current?.exportEvents?.() ?? sessionRef.current?.getEvents?.();
              const config = sessionRef.current?.getState?.()?.config || {};
              const payload = { state, events, config, timestamp: Date.now() };
              const jsonString = JSON.stringify(payload, null, 2);
              
              // TASK 10: Share JSON string
              await Share.share({
                message: jsonString,
                title: 'Session Export (DEV)',
              });
              
              // Also save to AsyncStorage for backup
              await AsyncStorage.setItem('debug_session_export', jsonString);
              console.log('[DEV] Session exported via Share and AsyncStorage');
            } catch (e) {
              console.error('[DEV] Export failed:', e);
              alert('Export failed: ' + e.message);
            }
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12 }}>DEV: Tap to share JSON</Text>
        </TouchableOpacity>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  counter: { position: 'absolute', bottom: 26, fontSize: 12, fontWeight: '700' },
});
