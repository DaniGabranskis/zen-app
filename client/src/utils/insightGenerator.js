// src/utils/insightGenerator.js

// --- Basic constants and helpers ---
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const lastNDays = (history, days) => {
  const cutoff = Date.now() - days * 24 * 3600 * 1000;
  return history.filter(h => new Date(h.date).getTime() >= cutoff);
};

const pct = (value, total) => total > 0 ? Math.round((value / total) * 100) : 0;
const plural = (n, one, many) => (n === 1 ? one : many);

const POSITIVE = new Set(['Joy', 'Gratitude', 'Calm', 'Clarity']);
const NEGATIVE = new Set(['Sadness', 'Anger', 'Frustration', 'Anxious', 'Overload', 'Disconnected', 'Confusion', 'Tension']);

const dayName = (iso) => WEEKDAYS[new Date(iso).getDay()];

// --- Text cleaning & limiter (1–2 sentences) ---
const stripMarkdown = (s) =>
  String(s || '')
    .replace(/\*\*/g, '')
    .replace(/__+/g, '')
    .replace(/[_`]+/g, '');

const tidy = (s) =>
  stripMarkdown(s)
    .replace(/\s+/g, ' ')
    .replace(/\s([,.;!?])/g, '$1')
    .trim();

const sentenceClamp = (text, maxSentences = 2) => {
  const chunks = text
    .replace(/[\r\n]+/g, '\n')
    .split(/(?<=[.!?])\s+|\n+/)
    .filter(Boolean);

  const clipped = chunks.slice(0, maxSentences).join(' ').trim();
  if (!clipped) return '';

  const capped = clipped.replace(/^([a-zа-я])/iu, (m) => m.toUpperCase());
  return /[.!?]$/.test(capped) ? capped : capped + '.';
};

const emit = (raw) => sentenceClamp(tidy(raw), 2);

// --- Core aggregations ---
function consecutiveWeekdayEmotion(history, weekdayName, emotion, weeksBack = 8) {
  const byWeek = new Map();
  const msWeek = 7 * 24 * 3600 * 1000;
  const now = Date.now();
  history.forEach(h => {
    const d = new Date(h.date);
    if (WEEKDAYS[d.getDay()] !== weekdayName) return;
    const w = Math.floor((now - d.getTime()) / msWeek);
    if (w >= 0 && w < weeksBack) {
      const emo = h.dominantGroup || h.session?.l3?.emotionKey;
      if (!emo) return;
      const prev = byWeek.get(w);
      if (!prev || new Date(h.date) > new Date(prev.date)) {
        byWeek.set(w, { emotion: emo, date: h.date });
      }
    }
  });

  let count = 0;
  for (let w = 0; w < weeksBack; w++) {
    const v = byWeek.get(w);
    if (!v || v.emotion !== emotion) break;
    count++;
  }
  return count;
}

function aggregate(history) {
  const byEmotion = new Map();
  const tagCount = new Map();
  let pos = 0, neg = 0;

  history.forEach(h => {
    const emo = h.dominantGroup || h.session?.l3?.emotionKey;
    if (!emo) return;
    byEmotion.set(emo, (byEmotion.get(emo) || 0) + 1);
    if (POSITIVE.has(emo)) pos++;
    if (NEGATIVE.has(emo)) neg++;

    const tags = Array.isArray(h.session?.evidenceTags) ? h.session.evidenceTags : [];
    tags.forEach(t => tagCount.set(t, (tagCount.get(t) || 0) + 1));
  });

  const emotionsSorted = [...byEmotion.entries()].sort((a, b) => b[1] - a[1]);
  const tagsSorted = [...tagCount.entries()].sort((a, b) => b[1] - a[1]);
  return { emotionsSorted, tagsSorted, pos, neg };
}

function avgIntensity(rows) {
  const vals = rows.map(r => Number(r.session?.l4?.intensity ?? 0)).filter(Number.isFinite);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function computeWindowSlices(H, compareWindow) {
  const thisWeek = lastNDays(H, compareWindow);
  const prevWeek = lastNDays(H, compareWindow * 2)
    .filter(h => new Date(h.date).getTime() < (Date.now() - compareWindow * 24 * 3600 * 1000));
  return { thisWeek, prevWeek };
}

// --- Feature extractors ---
function getDominantEmotion(H) {
  const { emotionsSorted } = aggregate(H);
  if (!emotionsSorted.length) return null;
  const [emo, cnt] = emotionsSorted[0];
  return { emo, share: H.length ? cnt / H.length : 0, count: cnt };
}

function trendChange(thisWeek, prevWeek) {
  const aggThis = aggregate(thisWeek);
  const aggPrev = aggregate(prevWeek);
  const pNow = pct(aggThis.pos, thisWeek.length);
  const pPrev = pct(aggPrev.pos, prevWeek.length);
  const deltaP = pNow - pPrev;
  return { enough: thisWeek.length >= 5 && prevWeek.length >= 5, deltaP };
}

function getIntensityDrift(thisWeek, prevWeek) {
  const a = avgIntensity(thisWeek);
  const b = avgIntensity(prevWeek);
  if (a == null || b == null) return null;
  return { drift: a - b };
}

function getTopRecurringTag(H) {
  const { tagsSorted } = aggregate(H);
  const recurring = tagsSorted.filter(([tag, c]) => c >= 3);
  if (!recurring.length) return null;
  const [tag, c] = recurring[0];
  return { tag, count: c };
}

function getStrongestWeekdayPattern(H, weeksBack = 8) {
  const byDayEmotion = new Map();
  H.forEach(h => {
    const emo = h.dominantGroup || h.session?.l3?.emotionKey;
    if (!emo) return;
    const dn = dayName(h.date);
    const key = `${dn}|${emo}`;
    byDayEmotion.set(key, (byDayEmotion.get(key) || 0) + 1);
  });
  if (!byDayEmotion.size) return null;

  let best = null;
  for (const [key, count] of byDayEmotion.entries()) {
    const [weekday, emo] = key.split('|');
    const consec = consecutiveWeekdayEmotion(H, weekday, emo, weeksBack);
    if (!best ||
        consec > best.consec ||
        (consec === best.consec && count > best.count)) {
      best = { weekday, emo, consec, count };
    }
  }
  return best;
}

// --- Topic ranking (multi-template system) ---
function rankTopics(H, thisWeek, prevWeek) {
  const topics = [];

  const bestPat = getStrongestWeekdayPattern(H, 8);
  if (bestPat) {
    const score = bestPat.consec * 100 + bestPat.count;
    topics.push({ kind: 'dayPattern', data: bestPat, score });
  }

  const dom = getDominantEmotion(H);
  if (dom) {
    const score = Math.round(dom.share * 100);
    topics.push({ kind: 'dominantEmotion', data: dom, score });
  }

  const tc = trendChange(thisWeek, prevWeek);
  if (tc.enough) {
    const score = Math.abs(tc.deltaP);
    topics.push({ kind: 'trendChange', data: tc, score });
  }

  const inten = getIntensityDrift(thisWeek, prevWeek);
  if (inten) {
    const score = Math.round(Math.abs(inten.drift) * 10);
    topics.push({ kind: 'intensityDrift', data: inten, score });
  }

  const tag = getTopRecurringTag(H);
  if (tag) {
    const score = tag.count;
    topics.push({ kind: 'tagRecurrence', data: tag, score });
  }

  if (!topics.length) {
    topics.push({ kind: 'fallback', data: {}, score: -1 });
  }

  topics.sort((a, b) => b.score - a.score);
  return topics;
}

// --- Insight renderer ---
function renderInsight(topic, H) {
  switch (topic.kind) {
    case 'dayPattern': {
      const { weekday, emo, consec, count } = topic.data;
      const seriesText = consec >= 2
        ? `${consec} ${plural(consec, 'week', 'weeks')} in a row`
        : `${count} ${plural(count, 'time', 'times')} this month`;

      const { tagsSorted } = aggregate(H);
      const topTag = tagsSorted[0]?.[0];
      const same = topTag && topTag.toLowerCase() === String(emo).toLowerCase();

      return emit(
        `A pattern stands out: ${emo} on ${weekday} for ${seriesText}.` +
        `${same || !topTag ? '' : ` Often alongside ${topTag}.`}`
      );
    }
    case 'dominantEmotion': {
      const { emo, share } = topic.data;
      const fraction = Math.round(share * 100);
      if (POSITIVE.has(emo))
        return emit(`${emo} is your most frequent emotion (${fraction}%). Keep noticing what supports this state.`);
      if (NEGATIVE.has(emo))
        return emit(`${emo} appears most often (${fraction}%). A small routine tweak like better sleep or a walk could help balance it.`);
      return emit(`${emo} shows up the most (${fraction}%). Keep tracking to see what influences it.`);
    }
    case 'trendChange': {
      const { deltaP } = topic.data;
      return emit(`Your positive share is ${deltaP > 0 ? 'up' : 'down'} by ${Math.abs(deltaP)}% compared to last week.`);
    }
    case 'intensityDrift': {
      const { drift } = topic.data;
      return emit(`Your average intensity ${drift > 0 ? 'increased' : 'decreased'} by ${Math.abs(drift).toFixed(1)} compared to last week.`);
    }
    case 'tagRecurrence': {
      const { tag, count } = topic.data;
      return emit(`The tag ${tag} appears ${count} ${plural(count, 'time', 'times')}. Observe what triggers it and what helps ease it.`);
    }
    default:
      return emit(`Keep tracking your emotions — consistent notes reveal patterns.`);
  }
}

// --- Main exported function ---
export function generateInsights(history = [], opts = {}) {
  const {
    maxItems = 1,
    horizonDays = 35,
    compareWindow = 7,
    mode = 'single', // 'single' or 'multi'
  } = opts;

  const H = lastNDays(history, horizonDays);
  if (!H.length) return [];

  const { thisWeek, prevWeek } = computeWindowSlices(H, compareWindow);
  const ranked = rankTopics(H, thisWeek, prevWeek);

  if (mode === 'single') {
    const best = ranked[0];
    const one = renderInsight(best, H);
    return one ? [one] : [];
  }

  const out = [];
  for (const t of ranked) {
    if (out.length >= maxItems) break;
    const txt = renderInsight(t, H);
    if (txt) out.push(txt);
  }
  return out;
}
