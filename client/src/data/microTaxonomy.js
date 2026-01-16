// Micro Taxonomy Data (from MICRO_TAXONOMY_V1.md)
// This is the single source of truth for micro states

export const MICRO_TAXONOMY = {
  grounded: {
    macro: 'grounded',
    micros: [
      {
        microKey: 'grounded.steady',
        evidenceTags: ['sig.micro.grounded.steady'],
        optionalWeights: { 'sig.clarity.high': 1.2 },
        examples: ['ровно, устойчиво, без суеты'],
      },
      {
        microKey: 'grounded.present',
        evidenceTags: ['sig.micro.grounded.present'],
        optionalWeights: { 'sig.clarity.high': 1.2 },
        examples: ['в моменте, ясная голова'],
      },
      {
        microKey: 'grounded.recovered',
        evidenceTags: ['sig.micro.grounded.recovered'],
        optionalWeights: { 'sig.context.work.deadline': 0.8 },
        examples: ['восстановился после напряжения/усталости'],
      },
    ],
  },
  
  engaged: {
    macro: 'engaged',
    micros: [
      {
        microKey: 'engaged.focused',
        evidenceTags: ['sig.micro.engaged.focused'],
        optionalWeights: { 'sig.arousal.high': 1.1 },
        examples: ['энергия + фокус'],
      },
      {
        microKey: 'engaged.curious',
        evidenceTags: ['sig.micro.engaged.curious'],
        optionalWeights: { 'sig.context.work.performance': 1.1 },
        examples: ['интерес/исследование'],
      },
      {
        microKey: 'engaged.inspired',
        evidenceTags: ['sig.micro.engaged.inspired'],
        optionalWeights: { 'sig.arousal.high': 1.2 },
        examples: ['драйв/вдохновение, "хочу делать"'],
      },
    ],
  },
  
  connected: {
    macro: 'connected',
    micros: [
      {
        microKey: 'connected.warm',
        evidenceTags: ['sig.micro.connected.warm'],
        optionalWeights: { 'sig.context.social.support': 1.2 },
        examples: ['тепло/поддержка'],
      },
      {
        microKey: 'connected.social_flow',
        evidenceTags: ['sig.micro.connected.social_flow'],
        optionalWeights: { 'sig.social.high': 1.1 },
        examples: ['легко общаться, "в потоке"'],
      },
      {
        microKey: 'connected.seen',
        evidenceTags: ['sig.micro.connected.seen'],
        optionalWeights: { 'sig.context.social.support': 1.1 },
        examples: ['ощущение "меня понимают/видят"'],
      },
    ],
  },
  
  capable: {
    macro: 'capable',
    micros: [
      {
        microKey: 'capable.deciding',
        evidenceTags: ['sig.micro.capable.deciding'],
        optionalWeights: { 'sig.agency.high': 1.2 },
        examples: ['решительность/определённость'],
      },
      {
        microKey: 'capable.executing',
        evidenceTags: ['sig.micro.capable.executing'],
        optionalWeights: { 'sig.agency.high': 1.1 },
        examples: ['эффективно делаю и двигаюсь'],
      },
      {
        microKey: 'capable.structured',
        evidenceTags: ['sig.micro.capable.structured'],
        optionalWeights: { 'sig.clarity.high': 1.1 },
        examples: ['порядок, контроль, план'],
      },
    ],
  },
  
  pressured: {
    macro: 'pressured',
    micros: [
      {
        microKey: 'pressured.rushed',
        evidenceTags: ['sig.micro.pressured.rushed'],
        optionalWeights: { 'sig.context.work.deadline': 1.2 },
        examples: ['спешка/дедлайны'],
      },
      {
        microKey: 'pressured.performance',
        evidenceTags: ['sig.micro.pressured.performance'],
        optionalWeights: { 'sig.context.work.performance': 1.2 },
        examples: ['"надо соответствовать", напряжение из-за оценки'],
      },
      {
        microKey: 'pressured.tense_functional',
        evidenceTags: ['sig.micro.pressured.tense_functional'],
        optionalWeights: { 'sig.tension.high': 1.1 },
        examples: ['давит, но я функционирую'],
      },
    ],
  },
  
  blocked: {
    macro: 'blocked',
    micros: [
      {
        microKey: 'blocked.stuck',
        evidenceTags: ['sig.micro.blocked.stuck'],
        optionalWeights: { 'sig.cognition.rumination': 1.2 },
        examples: ['"не могу начать", вязкость'],
      },
      {
        microKey: 'blocked.avoidant',
        evidenceTags: ['sig.micro.blocked.avoidant'],
        optionalWeights: { 'sig.trigger.uncertainty': 1.2 },
        examples: ['избегание, откладывание, сопротивление'],
      },
      {
        microKey: 'blocked.frozen',
        evidenceTags: ['sig.micro.blocked.frozen'],
        optionalWeights: { 'sig.cognition.blank': 1.2 },
        examples: ['"замер", внутренний стоп'],
      },
    ],
  },
  
  overloaded: {
    macro: 'overloaded',
    micros: [
      {
        microKey: 'overloaded.cognitive',
        evidenceTags: ['sig.micro.overloaded.cognitive'],
        optionalWeights: { 'sig.cognition.racing': 1.2 },
        examples: ['голова перегружена, "слишком много вкладок"'],
      },
      {
        microKey: 'overloaded.too_many_tasks',
        evidenceTags: ['sig.micro.overloaded.too_many_tasks'],
        optionalWeights: { 'sig.context.work.overcommit': 1.2 },
        examples: ['много обязательств, нет приоритета'],
      },
      {
        microKey: 'overloaded.overstimulated',
        evidenceTags: ['sig.micro.overloaded.overstimulated'],
        optionalWeights: { 'sig.body.headache': 1.1 },
        examples: ['сенсорная/информационная перегрузка'],
      },
    ],
  },
  
  exhausted: {
    macro: 'exhausted',
    micros: [
      {
        microKey: 'exhausted.drained',
        evidenceTags: ['sig.micro.exhausted.drained'],
        optionalWeights: { 'sig.body.heavy_limbs': 1.2 },
        examples: ['выжатость'],
      },
      {
        microKey: 'exhausted.sleepy_fog',
        evidenceTags: ['sig.micro.exhausted.sleepy_fog'],
        optionalWeights: { 'sig.cognition.fog': 1.2 },
        examples: ['сонливость/туман'],
      },
      {
        microKey: 'exhausted.burnout',
        evidenceTags: ['sig.micro.exhausted.burnout'],
        optionalWeights: { 'sig.context.work.overcommit': 1.2 },
        examples: ['хроническая усталость + отвращение к нагрузке'],
      },
    ],
  },
  
  down: {
    macro: 'down',
    micros: [
      {
        microKey: 'down.sad_heavy',
        evidenceTags: ['sig.micro.down.sad_heavy'],
        optionalWeights: { 'sig.context.social.isolation': 1.1 },
        examples: ['грусть/тяжесть'],
      },
      {
        microKey: 'down.discouraged',
        evidenceTags: ['sig.micro.down.discouraged'],
        optionalWeights: { 'sig.trigger.rejection': 1.2 },
        examples: ['подавленность/безнадёга'],
      },
      {
        microKey: 'down.lonely_low',
        evidenceTags: ['sig.micro.down.lonely_low'],
        optionalWeights: { 'sig.context.social.isolation': 1.2 },
        examples: ['"одиноко" как оттенок down (не равно detached)'],
      },
    ],
  },
  
  averse: {
    macro: 'averse',
    micros: [
      {
        microKey: 'averse.irritated',
        evidenceTags: ['sig.micro.averse.irritated'],
        optionalWeights: { 'sig.trigger.interruption': 1.2 },
        examples: ['раздражение/нетерпимость'],
      },
      {
        microKey: 'averse.angry',
        evidenceTags: ['sig.micro.averse.angry'],
        optionalWeights: { 'sig.trigger.conflict': 1.2 },
        examples: ['злость/готовность конфликтовать'],
      },
      {
        microKey: 'averse.disgust_avoid',
        evidenceTags: ['sig.micro.averse.disgust_avoid'],
        optionalWeights: { 'sig.trigger.rejection': 1.1 },
        examples: ['отторжение/"не могу это видеть/делать"'],
      },
    ],
  },
  
  detached: {
    macro: 'detached',
    micros: [
      {
        microKey: 'detached.numb',
        evidenceTags: ['sig.micro.detached.numb'],
        optionalWeights: { 'sig.cognition.blank': 1.2 },
        examples: ['онемение, "ничего не чувствую"'],
      },
      {
        microKey: 'detached.disconnected',
        evidenceTags: ['sig.micro.detached.disconnected'],
        optionalWeights: { 'sig.context.social.isolation': 1.2 },
        examples: ['социальное отключение'],
      },
      {
        microKey: 'detached.autopilot',
        evidenceTags: ['sig.micro.detached.autopilot'],
        optionalWeights: { 'sig.cognition.scattered': 1.1 },
        examples: ['"делаю на автомате"'],
      },
    ],
  },
  
  // uncertain has no micros (macro-only, extreme uncertainty)
  uncertain: {
    macro: 'uncertain',
    micros: [],
  },
};

/**
 * Get all micro keys from taxonomy
 * @returns {string[]} Array of all micro keys (e.g., ['grounded.steady', 'grounded.present', ...])
 */
export function getAllMicroKeys() {
  const microKeys = [];
  for (const macroEntry of Object.values(MICRO_TAXONOMY)) {
    for (const micro of macroEntry.micros || []) {
      if (micro.microKey) {
        microKeys.push(micro.microKey);
      }
    }
  }
  return microKeys;
}

// Helper: Get all micro keys for a macro
export function getMicrosForMacro(macroKey) {
  return MICRO_TAXONOMY[macroKey]?.micros || [];
}

// Helper: Get micro by full key (e.g., 'pressured.rushed')
export function getMicroByKey(microKey) {
  const [macro, micro] = microKey.split('.');
  const macroData = MICRO_TAXONOMY[macro];
  if (!macroData) return null;
  return macroData.micros.find(m => m.microKey === microKey) || null;
}

// Helper: Check if micro belongs to macro
export function microBelongsToMacro(microKey, macroKey) {
  return microKey.startsWith(`${macroKey}.`);
}
