// client/scripts/goldenSessions/wireDeps.js
// Task A3.4.3: Wire real implementations used by GUI/scripts
// Comments in English only.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pickNextL1Card } from '../../src/utils/l1CardSelector.js';
// Note: buildProbePlan imports JSON directly, which causes issues in Node.js scripts
// So we create a local version without JSON imports
import { routeStateFromBaseline } from '../../src/utils/baselineEngine.js';
import { selectMicroDebug } from '../../src/utils/microSelector.js';
import { canonicalizeTags, deriveSigTagsFromArray, GATE_ALLOW_LISTS, hasGateMatch, buildScoringTags } from '../../src/domain/tags/index.js';
import { sampleAnswer } from '../profiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load L1/L2 cards
const L1_PATH = path.join(__dirname, '..', '..', 'src', 'data', 'flow', 'L1.json');
const L2_PATH = path.join(__dirname, '..', '..', 'src', 'data', 'flow', 'L2.json');

const L1_CARDS = JSON.parse(fs.readFileSync(L1_PATH, 'utf8'));
const L2_CARDS = JSON.parse(fs.readFileSync(L2_PATH, 'utf8'));

const L1_CARDS_BY_ID = {};
const L2_CARDS_BY_ID = {};
for (const card of L1_CARDS) L1_CARDS_BY_ID[card.id] = card;
for (const card of L2_CARDS) L2_CARDS_BY_ID[card.id] = card;

/**
 * Answer tagger (unified function for tags)
 */
function answerTagger({ card, choice }) {
  if (choice === 'NS') {
    return ['sig.uncertainty.high', 'sig.axis.unknown'];
  }
  const option = choice === 'A' ? card.options[0] : card.options[1];
  return option?.tags || [];
}

/**
 * L1 selector wrapper
 */
function l1Selector(ctx) {
  const selection = pickNextL1Card({
    macroBase: ctx.macroBase,
    askedIds: ctx.askedIds,
    evidenceTags: ctx.evidenceTags,
    quality: ctx.quality !== false,
    cardsById: ctx.decks,
    askedCount: ctx.askedCount || (ctx.askedIds instanceof Set ? ctx.askedIds.size : (Array.isArray(ctx.askedIds) ? ctx.askedIds.length : 0)),
    baselineMetrics: ctx.baselineMetrics,
    baselineConfidence: ctx.baselineConfidence,
  });
  
  if (!selection || !selection.cardId) {
    return null;
  }
  
  return {
    cardId: selection.cardId,
    reason: selection.reason || 'adaptive',
  };
}

/**
 * GS11-FIX-01: Wrap L1 selector with forced card order (golden-only)
 * If fixture has forcedL1CardOrder, prioritize those cards before default selector
 */
function wrapL1SelectorWithForcedOrder(baseSelector, fixture) {
  const forced = Array.isArray(fixture?.forcedL1CardOrder) ? fixture.forcedL1CardOrder : [];
  if (!forced.length) return baseSelector;

  return (ctx) => {
    // Get asked IDs from context (can be askedIds or alreadyAskedIds)
    const askedIds = ctx?.askedIds || ctx?.alreadyAskedIds || [];
    const asked = askedIds instanceof Set 
      ? askedIds 
      : new Set(Array.isArray(askedIds) ? askedIds : []);

    // Check forced order first
    for (const cardId of forced) {
      if (!asked.has(cardId)) {
        // Verify card exists
        if (L1_CARDS_BY_ID[cardId]) {
          return { cardId, reason: 'golden_forced' };
        }
      }
    }

    // Fall back to default selector
    return baseSelector(ctx);
  };
}

/**
 * L2 planner - local version without JSON imports
 * Based on buildProbePlan from probePlanBuilder.js, but without JSON imports
 */
function buildProbePlanLocal({
  topStates = [],
  alreadyAskedIds = [],
} = {}) {
  const [top1, top2] = topStates || [];
  if (!top1 && !top2) {
    return pickGenericProbeQuestions(alreadyAskedIds, 2);
  }

  const discriminatorMap = {
    'uncertain|capable': ['L2_uncertainty', 'L1_control', 'L2_clarity'],
    'uncertain|grounded': ['L2_clarity', 'L1_expectations'],
    'exhausted|down': ['L2_heavy', 'L2_regulation', 'L1_energy'],
    'exhausted|pressured': ['L2_heavy', 'L1_energy'],
    'detached|down': ['L2_numb', 'L2_positive_moments', 'L2_social_pain'],
    'detached|connected': ['L2_social_pain', 'L1_social'],
    'self_critical|down': ['L2_guilt', 'L2_shame', 'L1_self_worth'],
    'blocked|overloaded': ['L2_source', 'L1_control'],
    'threatened|pressured': ['L1_safety', 'L2_regulation', 'L1_pressure'],
    'pressured|overloaded': ['L2_source', 'L1_pressure'],
    'depressed|exhausted': ['L2_meaning', 'L2_heavy', 'L1_energy'],
  };

  const candidates = [];
  const used = new Set(alreadyAskedIds);

  if (top1 && top2) {
    const key1 = `${top1}|${top2}`;
    const key2 = `${top2}|${top1}`;
    const questions = discriminatorMap[key1] || discriminatorMap[key2] || [];
    
    for (const qId of questions) {
      if (used.has(qId)) continue;
      candidates.push(qId);
      used.add(qId);
      if (candidates.length >= 2) break;
    }
  }

  if (candidates.length < 2 && top1) {
    const stateMap = {
      uncertain: ['L2_uncertainty', 'L1_clarity', 'L2_clarity'],
      exhausted: ['L2_heavy', 'L1_energy'],
      down: ['L2_positive_moments', 'L1_mood'],
      detached: ['L2_numb', 'L2_social_pain', 'L1_social'],
      self_critical: ['L2_guilt', 'L2_shame', 'L1_self_worth'],
      pressured: ['L1_pressure', 'L2_regulation'],
      overloaded: ['L2_source', 'L1_control'],
      threatened: ['L1_safety', 'L2_regulation'],
      blocked: ['L2_source', 'L1_control'],
    };
    const stateQuestions = stateMap[top1] || ['L1_mood', 'L1_body', 'L1_clarity'];
    for (const qId of stateQuestions) {
      if (used.has(qId)) continue;
      candidates.push(qId);
      used.add(qId);
      if (candidates.length >= 2) break;
    }
  }

  if (candidates.length < 2) {
    const generic = pickGenericProbeQuestions(Array.from(used), 2 - candidates.length);
    candidates.push(...generic);
  }

  return candidates.slice(0, 2);
}

function pickGenericProbeQuestions(alreadyAskedIds, count = 2) {
  const genericPool = [
    'L1_mood',
    'L1_body',
    'L1_clarity',
    'L1_control',
    'L2_uncertainty',
    'L2_clarity',
  ];

  const used = new Set(alreadyAskedIds);
  const picks = [];

  for (const qId of genericPool) {
    if (used.has(qId)) continue;
    picks.push(qId);
    if (picks.length >= count) break;
  }

  return picks;
}

/**
 * L2 planner wrapper
 */
function l2Planner(ctx) {
  const plan = buildProbePlanLocal({
    topStates: ctx.topStates || [],
    alreadyAskedIds: ctx.alreadyAskedIds || [],
  });
  
  return {
    plan: Array.isArray(plan) ? plan : [],
    reason: 'probe_plan',
  };
}

/**
 * Macro engine wrapper
 */
function macroEngine(ctx, fixtureId) {
  // GS-MEANING-07: Remove GS15 override - use real pipeline
  const result = routeStateFromBaseline(ctx.baselineMetrics, {
    evidenceVector: null,
    evidenceWeight: 0.25,
  });
  
  return {
    macro: result.stateKey || result.macroKey,
    meta: {
      confidenceBand: result.confidenceBand,
      clarityFlag: result.clarityFlag,
    },
  };
}

/**
 * Micro engine wrapper
 */
function microEngine(ctx, fixtureId) {
  // GS-MEANING-07: Remove GS15 override - use real pipeline
  const result = selectMicroDebug(ctx.macro, ctx.evidenceTags, {
    threshold: 0.3,
    preferSpecific: true,
  });
  
  return {
    selected: result.selected,
    topCandidate: result.topCandidate,
    reason: result.reason,
    microSource: result.selected ? 'selected' : (result.reason === 'no_evidence' ? 'fallback' : 'axis_only'),
  };
}

/**
 * Answer sampler factory
 */
function answerSamplerFactory({ profile = 'mix', notSureRate = 0.2 } = {}) {
  return {
    sample: ({ fixture, state, nextCardId, stepIndex, rng }) => {
      const card = L1_CARDS_BY_ID[nextCardId] || L2_CARDS_BY_ID[nextCardId];
      if (!card) {
        throw new Error(`Card not found: ${nextCardId}`);
      }
      
      // Check for forced answers first
      const answerPolicy = fixture.answerPolicy || {};
      if (answerPolicy.forcedAnswers && answerPolicy.forcedAnswers[nextCardId]) {
        const forced = answerPolicy.forcedAnswers[nextCardId];
        if (forced === 'left') return 'A';
        if (forced === 'right') return 'B';
        if (forced === 'not_sure') return 'NS';
        return 'A'; // Default
      }
      
      // Use profile-based sampling
      const effectiveProfile = answerPolicy.profile || profile;
      return sampleAnswer(card, effectiveProfile, rng);
    },
  };
}

/**
 * Build runner dependencies
 * @param {Function} rng - Random number generator
 * @param {Object} [fixture] - Optional fixture for golden sessions (supports forcedL1CardOrder)
 */
export function buildRunnerDeps(rng, fixture = null) {
  const answerSampler = answerSamplerFactory({ profile: 'mix', notSureRate: 0.2 });
  
  // GS11-FIX-01: Wrap l1Selector with forced order if fixture provides it
  const baseL1Selector = (ctx) => l1Selector(ctx);
  const wrappedL1Selector = wrapL1SelectorWithForcedOrder(baseL1Selector, fixture);
  
  return {
    rng: () => rng(),
    decks: {
      L1: L1_CARDS,
      L2: L2_CARDS,
    },
    decksById: {
      L1: L1_CARDS_BY_ID,
      L2: L2_CARDS_BY_ID,
    },
    l1Selector: wrappedL1Selector,
    l2Planner: (ctx) => l2Planner(ctx),
    answerTagger: (params) => answerTagger(params),
    macroEngine: {
      computeMacro: (ctx) => macroEngine(ctx, fixture?.id),
    },
    microEngine: {
      selectMicro: (ctx) => microEngine(ctx, fixture?.id),
    },
    tagPipeline: {
      canonicalizeTags,
      deriveSigTagsFromArray,
      buildScoringTags,
    },
    gateEngine: {
      hasGateMatch,
      GATE_ALLOW_LISTS,
    },
    answerSampler,
  };
}
