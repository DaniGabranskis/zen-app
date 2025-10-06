export function generateLocalAdvice(answers = []) {
  const tags = answers.flatMap(a => a.tags || []).map(s => String(s).toLowerCase());
  const has = t => tags.includes(t);

  let insight = 'Your reflection hints at mixed signals. Notice what gave/used your energy.';
  const tips = [];
  let encouragement = 'You showed up for yourself today — that matters.';

  if (has('anxiety') || has('tension')) {
    insight = 'There was tension/anxiety. Your mind anticipated risks; your body asked for safety.';
    tips.push('Do box-breathing 3× (4-4-4-4).', 'Silence notifications for 60 minutes.');
  }
  if (has('overload') || has('burnout')) {
    insight = 'Signals of overload. Maybe too many tasks or expectations at once.';
    tips.push('Write a 3-item to-do and stop after them.', 'Take a 10-minute screen-free break.');
  }
  if (has('sadness') || has('frustration')) {
    insight = 'Emotional weight suggests unmet needs or expectations.';
    tips.push('Name the feeling and unmet need in one sentence.', 'Plan one nurturing activity tonight.');
  }
  if (has('gratitude') || has('joy')) {
    insight = 'Positive tone (joy/gratitude). Capture the sources — they stabilize you.';
    tips.push('Write 2 lines of what went right.', 'Share one appreciation with someone.');
  }

  const uniq = Array.from(new Set(tips)).slice(0, 4);
  return { insight, tips: uniq.length ? uniq : ['Take one small, kind action within an hour.'], encouragement };
}
