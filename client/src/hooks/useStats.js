import { useMemo } from 'react';
import getGroupColor from '../utils/getGroupColor';

function getWeekActivity(history) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const weekStart = new Date(today);
  const wd = today.getDay(); // 0=Sun,1=Mon...
  const offset = wd === 0 ? -6 : 1 - wd;
  weekStart.setDate(today.getDate() + offset);

  return days.map((label, idx) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + idx);
    const key = d.toISOString().split('T')[0];
    const active = history.some(item => item.date.split('T')[0] === key);
    return { day: label, active };
  });
}

  function calcStreak(history) {
    // Приводим все даты к ISO формату yyyy-mm-dd
    const days = history
      .map(item => item && item.date && item.date.split('T')[0])
      .filter(Boolean)
      .sort();

    // Массив уникальных дат (чтобы не было дублей на день)
    const unique = [...new Set(days)];

    let currentStreak = 0;
    let bestStreak = 0;
    let streak = 0;
    let prevDate = null;

    // Обход с конца — от самой свежей даты к старым
    for (let i = unique.length - 1; i >= 0; i--) {
      const d = new Date(unique[i]);
      if (prevDate) {
        // Разница между днями (в сутках)
        const diff = Math.round((prevDate - d) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          streak++;
        } else if (diff === 0) {
          // два рефлексии в один день — streak не меняем
          continue;
        } else {
          break; // streak прерывается
        }
      } else {
        streak = 1;
      }
      prevDate = d;
    }
    currentStreak = streak;

    // Ищем bestStreak — максимальную серию подряд
    let maxStreak = 0;
    let cur = 1;
    for (let i = 1; i < unique.length; i++) {
      const d1 = new Date(unique[i - 1]);
      const d2 = new Date(unique[i]);
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        cur++;
      } else {
        if (cur > maxStreak) maxStreak = cur;
        cur = 1;
      }
    }
    if (cur > maxStreak) maxStreak = cur;
    bestStreak = Math.max(currentStreak, maxStreak);

    // Логируем значения для отладки
    console.log('[STREAK DEBUG] days:', unique, 'current:', currentStreak, 'best:', bestStreak);

    return { currentStreak, bestStreak };
  }

export default function useStats(historyRaw) {
  const history = Array.isArray(historyRaw) ? historyRaw : [];

  // Оставляем только записи за последние 7 дней
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  const filtered = history.filter(item => {
    if (!item || !item.date || !item.dominantGroup) return false;
    const d = new Date(item.date);
    return d >= weekAgo && d <= now && typeof item.dominantGroup === 'string';
  });

  const streaks = calcStreak(history); // вот тут будет расчёт

  // Считаем частоту каждой группы
  const groupCounts = {};
  filtered.forEach(item => {
    const group = item.dominantGroup;
    groupCounts[group] = (groupCounts[group] || 0) + 1;
  });

  // Сортируем по количеству, берём топ-5
  const pieData = Object.entries(groupCounts)
    .map(([group, count]) => ({
      name: group,
      population: count,
      color: getGroupColor(group),
      legendFontColor: '#333',
      legendFontSize: 14,
    }))
    .sort((a, b) => b.population - a.population)
    .slice(0, 5);

  // Остальные статы не трогаем пока!
  return { pieData, series: [], streaks , week: getWeekActivity(history) };
}
