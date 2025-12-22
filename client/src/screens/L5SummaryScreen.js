// src/screens/L5SummaryScreen.js
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '../components/ScreenWrapper';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';
import { estimateIntensity } from '../utils/intensity';
import { getEmotionMeta } from '../utils/evidenceEngine';
import { makeHeaderStyles, makeBarStyles, computeBar, BAR_BTN_H } from '../ui/screenChrome';
import { generateShortDescription } from '../utils/aiService';
import MiniInsightCard from '../components/MiniInsightCard';
import { Ionicons } from '@expo/vector-icons';


const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const EMPTY_ARR = Object.freeze([]);
const EMPTY_STR = '';

// --- AI summary (hoisted helper) ---
function aiSummaryFromState(dominant) {
  if (!dominant) return 'We analyzed your answers. Here is a short actionable suggestion.';
  return `Current state leans toward “${dominant}”. Try a short, concrete action below to consolidate progress.`;
}

// --- Local stats-based mini insight (human style, 1 sentence) ---------------
function daysBetween(d1, d2) {
  const MS = 24*60*60*1000;
  return Math.floor((d2 - d1) / MS);
}

function titleCase(s) {
  return (s || '').replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, m => m.toUpperCase())
    .trim();
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getTimeOfDayBucket(hour) {
  if (hour >= 5 && hour < 11) return 'mornings';
  if (hour >= 11 && hour < 17) return 'afternoons';
  if (hour >= 17 && hour < 22) return 'evenings';
  return 'late nights';
}

function computeMiniInsightFromHistory(history = [], emotionKey = '') {
  if (!emotionKey) {
    return 'There is no pattern at the moment, your days are very varied.';
  }

  const ekRaw = String(emotionKey);
  const ekNorm = ekRaw.toLowerCase();
  const ekTitle = titleCase(ekRaw);

  // Normalize history: keep only rows with a valid timestamp
  const withTs = (history || [])
    .map((it) => {
      const ts = new Date(it.date || it.createdAt || 0).getTime();
      return { ...it, _ts: ts };
    })
    .filter((it) => Number.isFinite(it._ts) && it._ts > 0);

  if (!withTs.length) {
    return 'There is no pattern at the moment, your days are very varied.';
  }

  const now = Date.now();

  // Same-emotion slice
  const same = withTs.filter((it) => {
    const emo = (it?.dominantGroup || it?.session?.l3?.emotionKey || '').toLowerCase();
    return emo === ekNorm;
  });

  if (!same.length) {
    return 'There is no pattern at the moment, your days are very varied.';
  }

  // Basic stats for this emotion
  const latestTs = same
    .map((it) => it._ts)
    .sort((a, b) => b - a)[0];

  const lastDays = Number.isFinite(latestTs) ? daysBetween(latestTs, now) : null;

  const last7 = now - 7 * 24 * 60 * 60 * 1000;
  const last30 = now - 30 * 24 * 60 * 60 * 1000;
  const count7 = same.filter((it) => it._ts >= last7).length;
  const count30 = same.filter((it) => it._ts >= last30).length;

  const sortedAll = [...withTs].sort((a, b) => a._ts - b._ts);
  const earliestTs = sortedAll[0]._ts;
  const horizonDays = daysBetween(earliestTs, now);

  const totalSame = same.length;

  // 1) Uniqueness: rare emotion or long gap since last occurrence
  if (totalSame <= 2 && horizonDays >= 7) {
    const span = Math.max(horizonDays, 1);
    const label = totalSame === 1 ? 'entry' : 'entries';
    return `This emotion is quite rare for you — you've logged ${totalSame} ${label} with ${ekTitle.toLowerCase()} in the last ${span} days.`;
  }

  if (lastDays !== null && lastDays >= 14) {
    return `Today's ${ekTitle.toLowerCase()} stands out — you haven't logged it for about ${lastDays} days.`;
  }

  // 2) Time-of-day pattern
  const timeBuckets = {
    mornings: 0,
    afternoons: 0,
    evenings: 0,
    'late nights': 0,
  };

  same.forEach((it) => {
    const d = new Date(it.date || it.createdAt || 0);
    if (!Number.isFinite(d.getTime())) return;
    const bucket = getTimeOfDayBucket(d.getHours());
    timeBuckets[bucket] += 1;
  });

  const bucketEntries = Object.entries(timeBuckets);
  const [bestBucket, bestBucketCount] =
    bucketEntries.reduce(
      (acc, [name, count]) => (count > acc[1] ? [name, count] : acc),
      ['', 0]
    );

  if (bestBucket && bestBucketCount >= 3 && bestBucketCount / totalSame >= 0.6) {
    return `You tend to feel ${ekTitle.toLowerCase()} mostly in the ${bestBucket}.`;
  }

  // 3) Weekday pattern for this emotion
  const weekdayCounts = new Array(7).fill(0);
  same.forEach((it) => {
    const d = new Date(it.date || it.createdAt || 0);
    const idx = d.getDay();
    if (Number.isNaN(idx)) return;
    weekdayCounts[idx] += 1;
  });

  let maxDayIdx = -1;
  let maxDayCount = 0;
  weekdayCounts.forEach((count, idx) => {
    if (count > maxDayCount) {
      maxDayCount = count;
      maxDayIdx = idx;
    }
  });

  if (maxDayIdx >= 0 && maxDayCount >= 3 && maxDayCount / totalSame >= 0.6) {
    const dayName = WEEKDAYS[maxDayIdx];
    return `${ekTitle} often shows up on ${dayName}s — ${maxDayCount} of your last ${totalSame} entries with this emotion.`;
  }

  // 4) Context of the last few check-ins (micro-summary)
  const recent = sortedAll.slice(-5);
  if (recent.length >= 3) {
    const freq = new Map();
    recent.forEach((it) => {
      const emo = (it?.dominantGroup || it?.session?.l3?.emotionKey || '').toLowerCase();
      if (!emo) return;
      freq.set(emo, (freq.get(emo) || 0) + 1);
    });

    const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length === 1) {
      const [k1, c1] = ranked[0];
      const e1 = titleCase(k1);
      return `Over your last ${recent.length} check-ins, ${e1.toLowerCase()} has been the main tone.`;
    }
    if (ranked.length >= 2) {
      const [k1, c1] = ranked[0];
      const [k2, c2] = ranked[1];
      const e1 = titleCase(k1);
      const e2 = titleCase(k2);
      return `Over your last ${recent.length} check-ins, your emotional tone has moved mostly between ${e1.toLowerCase()} and ${e2.toLowerCase()}, with ${ekTitle.toLowerCase()} fitting into that same space.`;
    }
  }

  // 5) Fallback: old frequency-based logic (7/30 days window)
  if (count7 >= 3) {
    return `Lately you've been feeling ${ekTitle.toLowerCase()} often — ${count7} times in the last 7 days.`;
  }

  if (lastDays !== null && lastDays <= 3) {
    const when =
      lastDays === 0
        ? 'today'
        : lastDays === 1
        ? 'yesterday'
        : `${lastDays} days ago`;
    return `You've felt ${ekTitle.toLowerCase()} recently — ${when}.`;
  }

  if (count30 >= 4) {
    return `${ekTitle} showed up ${count30} times in the last 30 days.`;
  }

  // Default: no strong pattern
  return 'There is no clear pattern yet — your days look varied.';
}

function EditIcon({ theme }) {
  const isDark = theme.themeName === 'dark';
  const iconColor = isDark ? theme.textPrimary : theme.textSecondary;

  return (
    <View
      style={{
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}
    >
      <Ionicons name="create-outline" size={16} color={iconColor} />
    </View>
  );
}

function buildShortDescKey({ emotionKey, intensity, triggers, bodyMind, evidenceTags }) {
  // Stable serialization: order-insensitive for arrays
  const normArr = (a) => (Array.isArray(a) ? a.slice().sort() : []);
  return JSON.stringify({
    emotionKey: String(emotionKey || ''),
    intensity: Number(intensity || 0),
    triggers: normArr(triggers),
    bodyMind: normArr(bodyMind),
    evidenceTags: normArr(evidenceTags),
  });
}


export default function L5SummaryScreen({ navigation, route }) {
  const params = route?.params || {};
  const skipAi = params?.skipAi === true;
  const forceAi = params?.forceAi === true;
  const prevKey = useStore(s => s.sessionDraft?.l5?.shortDescriptionKey) || '';
  // Cached L5 AI fields from store (so we can avoid re-requesting AI)
  const cachedMiniInsight = useStore(s => s.sessionDraft?.l5?.miniInsight) || '';
  const cachedShortDesc   = useStore(s => s.sessionDraft?.l5?.shortDescription) || '';
  const fromHistory = params?.fromHistory === true;
  const item = params?.item || (fromHistory ? params : null);
  const histSess = (fromHistory && item) ? (item.session || {}) : null;
  const t = useThemeVars();
  const isDarkTheme = t.themeName === 'dark';
  const insets = useSafeAreaInsets();
  const { width: WIN_W } = useWindowDimensions();
    // Bottom bar sizing: fixed height safe-area on iOS only.
    const BAR_VPAD = 8;                      // vertical padding inside the bar
    const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);
    const sHead = makeHeaderStyles(t);
    const sBar  = makeBarStyles(t, BAR_BASE_H);

  // ---- store (стабильные селекторы + фолбэки вне селектора)
  const _evidenceTags     = useStore(s => s.sessionDraft?.evidenceTags);
  const evidenceTags      = (histSess?.evidenceTags) ?? (_evidenceTags ?? EMPTY_ARR);

  // 1) main source - router solution
  const _l3Emotion  = useStore(s => s.sessionDraft?.l3?.emotionKey);

  const emotionKey  = fromHistory
    ? (item?.dominantGroup || histSess?.l3?.emotionKey || EMPTY_STR)
    : (_l3Emotion || EMPTY_STR);


  const historyItems = useStore(s => {
    if (Array.isArray(s.history)) return s.history;
    if (Array.isArray(s.history?.items)) return s.history.items;
    return [];
  });

  const [loading, setLoading] = useState(!fromHistory);
  const [aiDesc, setAiDesc] = useState('');
  const [miniInsight, setMiniInsight] = useState('');
  const [aiSource, setAiSource] = useState(''); // 'ai' | 'local'

  // Feedback about mismatch (L5)
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackOption, setFeedbackOption] = useState('');
  const [feedbackCustom, setFeedbackCustom] = useState('');
  
  const _storeTriggers = useStore(s => s.sessionDraft?.l4?.triggers);
  const _storeBM       = useStore(s => s.sessionDraft?.l4?.bodyMind);

  const storeTriggers  = fromHistory
    ? (histSess?.l4?.triggers ?? EMPTY_ARR)
    : (_storeTriggers ?? EMPTY_ARR);

  const storeBM        = fromHistory
    ? (histSess?.l4?.bodyMind ?? EMPTY_ARR)
    : (_storeBM ?? EMPTY_ARR);

  const setL4Triggers  = useStore(s => s.setL4Triggers);
  const setL4BodyMind  = useStore(s => s.setL4BodyMind);
  const setL4Intensity = useStore(s => s.setL4Intensity);
  const setL5Fields    = useStore(s => s.setL5Fields);

    const editLocks = useStore(s => s.sessionDraft?.l5?.editLocks) || {
    triggersUsed: false,
    bodyMindUsed: false,
  };

  // Use store values directly to avoid stale data after editing in L4.
  const editTrig = storeTriggers;
  const editBM   = storeBM;
  const [intAdj] = useState(0);

  const { intensity: autoIntensity, confidence } = estimateIntensity({
    tags: evidenceTags,
    bodyMind: editBM,
    triggers: editTrig,
  });

  // из истории: intensity и confidence (accuracy 1..5 → 0..1)
  const histIntensity   = fromHistory ? Number(histSess?.l4?.intensity ?? 0) : null;
  const histAccuracy    = fromHistory ? Number(histSess?.l6?.accuracy ?? 3) : null;
  const histConfidence  = fromHistory && Number.isFinite(histAccuracy)
    ? Math.max(0, Math.min(1, (histAccuracy - 1) / 4)) // 1→0, 5→1
    : null;

  // что показывать на экране
  const previewIntensity = fromHistory
    ? clamp(histIntensity ?? 0, 0, 10)
    : clamp(autoIntensity + intAdj, 0, 10);

  const showConfidence = fromHistory
    ? (histConfidence ?? 0.7) // разумный дефолт
    : confidence;

  const intensityBucket  = previewIntensity <= 3 ? 'Low' : previewIntensity <= 6 ? 'Medium' : 'High';

  // ---- визуал круга эмоции
  const meta        = emotionKey ? getEmotionMeta(emotionKey) : null; // meta.color: [start,end], meta.name
  const toTitle     = (s) => (s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase()).trim();
  const emotionTitle= meta?.name || toTitle(emotionKey) || 'Emotion';

  // ---- параметры круга и прогресс-кольца
  const CIRCLE       = Math.min(WIN_W * 0.8, 360);
  const RING_STROKE  = 10;
  const Rpath        = (CIRCLE / 2) - RING_STROKE / 2;  // path radius
  const CIRC         = 2 * Math.PI * Rpath;
  const fillRatio    = previewIntensity / 10;      // 0..1
  const arcLen       = CIRC * fillRatio;
  const s = makeStyles(t, insets, CIRCLE, BAR_BASE_H, BAR_VPAD);

  const onContinue = () => {
    // L4 already persists triggers/bodyMind. Avoid overwriting with stale values.
    setL4Intensity(previewIntensity);
    navigation.navigate('L6Actions');
  };

  const openFeedback = () => {
    // Open feedback modal, reset local state
    setFeedbackVisible(true);
    setFeedbackOption('');
    setFeedbackCustom('');
  };

  const closeFeedback = () => {
    setFeedbackVisible(false);
  };

  const submitFeedback = () => {
    const payload = {
      option: feedbackOption === 'custom' ? 'Other' : feedbackOption,
      comment: feedbackCustom.trim(),
      emotionKey,
      intensity: previewIntensity,
    };

    console.log('[L5] feedback payload', payload);

    // store feedback in draft (for future analytics)
    setL5Fields({ feedback: payload });

    // close modal and reset local state
    setFeedbackVisible(false);
    setFeedbackOption('');
    setFeedbackCustom('');

    // go back to main Home tab
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const FEEDBACK_PRESETS = [
    {
      value: 'emotion_inaccurate',
      label: 'Emotion does not feel accurate',
    },
    {
      value: 'intensity_off',
      label: 'Intensity does not feel correct',
    },
    {
      value: 'triggers_bodymind_off',
      label: 'Triggers / body & mind do not feel right',
    },
    {
      value: 'description_mismatch',
      label: 'Reflection description does not match',
    },
  ];


  const onEditSection = (section) => {
    // section: 'triggers' | 'bodyMind'

    // No edits from History view
    if (fromHistory) return;

    if (section === 'triggers' && editLocks.triggersUsed) return;
    if (section === 'bodyMind' && editLocks.bodyMindUsed) return;

    navigation.navigate('L4Deepen', { editSection: section });
  };

 // Loading effect: we calculate a local mini-insight and request a short AI description
useEffect(() => {
  let isMounted = true;

  if (fromHistory) {
    const histMini  = (histSess?.l5?.miniInsight ?? '');
    const histShort = (histSess?.l5?.shortDescription ?? '');
    setMiniInsight(histMini);
    setAiDesc(histShort || aiSummaryFromState(emotionKey));
    setLoading(false);
    return () => { isMounted = false; };
  }

  // Local mini-insight is always computed locally (no AI cost).
  const localMini = computeMiniInsightFromHistory(historyItems, emotionKey || 'Emotion');
  setMiniInsight(localMini);

  const payload = {
    emotionKey,
    intensity: previewIntensity,
    triggers: Array.isArray(storeTriggers) ? storeTriggers : [],
    bodyMind: Array.isArray(storeBM) ? storeBM : [],
    evidenceTags: Array.isArray(evidenceTags) ? evidenceTags : [],
  };

  const nextKey = buildShortDescKey(payload);
  const hasCached = String(cachedShortDesc || '').trim().length > 0;

  // Decision rules:
  // - Normal flow: call AI only if we have no cached description yet.
  // - Edit flow (forceAi): call AI only if inputs changed (key differs).
  // - If user returned with no changes, key will match and we won't call AI.
  const shouldCallAi =
    skipAi
      ? false
      : forceAi
        ? (nextKey !== prevKey)
        : (!hasCached);

  if (!shouldCallAi) {
    setAiDesc(hasCached ? String(cachedShortDesc).trim() : aiSummaryFromState(emotionKey));
    setAiSource(hasCached ? 'cache' : 'local');
    setLoading(false);

    // Clear transient params so back/forward does not retrigger logic.
    if (forceAi || skipAi) {
      navigation.setParams({ forceAi: false, skipAi: false, noChanges: false });
    }

    return () => { isMounted = false; };
  }

  // We are going to call AI (one time per unique key).
  setLoading(true);

  (async () => {
    try {
      const { result, source } = await generateShortDescription(payload);
      if (!isMounted) return;

      const short = (result?.shortDescription || '').trim();

      setAiDesc(short || aiSummaryFromState(emotionKey));
      setAiSource(source || 'ai');

      setL5Fields({
        miniInsight: localMini,
        shortDescription: short,
        shortDescriptionKey: nextKey,
      });

      navigation.setParams({ forceAi: false, skipAi: false, noChanges: false });
    } catch (e) {
      if (!isMounted) return;
      console.warn('[L5] shortDescription error', e?.message || e);
      setAiDesc(aiSummaryFromState(emotionKey));
      setAiSource('local');
      setLoading(false);
    } finally {
      if (isMounted) setLoading(false);
    }
  })();

  return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [fromHistory, forceAi, skipAi, emotionKey, historyItems, previewIntensity, storeTriggers, storeBM, evidenceTags, prevKey]);


  useEffect(() => {
    console.log('[L5] loading:', loading);
    console.time('[AI] shortDescription');
    console.timeEnd('[AI] shortDescription');
  }, [loading]);

// LOADING SCREEN
if (loading) {
  return (
    <ScreenWrapper
      useFlexHeight
      noTopInset={fromHistory}
      style={{ backgroundColor: t.background }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={t.textSecondary} />
        <Text
          style={{
            marginTop: 12,
            fontSize: 16,
            fontWeight: '700',
            color: t.textPrimary,
          }}
        >
          Analysing...
        </Text>
      </View>
    </ScreenWrapper>
  );
}

// === MAIN SCREEN ===
return (
  <ScreenWrapper useFlexHeight noTopInset={fromHistory} style={{ backgroundColor: t.background }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator
    >
      {!fromHistory && (
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={sHead.title}>Summary</Text>
            <Text style={sHead.subtitle}>
              Here’s a quick recap. Your recommendations will use this.
            </Text>
          </View>
        </View>
      )}

          {/* Feedback modal: "something is wrong with this result" */}
    <Modal
      visible={feedbackVisible}
      animationType="fade"
      transparent
      onRequestClose={closeFeedback}
    >
      {/* Force dark-content icons when feedback modal is open */}
      <StatusBar barStyle="dark-content" />
      <View style={s.modalBackdrop}>
        <View style={[s.modalCard, { backgroundColor: t.cardBackground }]}>
          <Text style={[s.modalTitle, { color: t.textPrimary }]}>
            Something feels off?
          </Text>
          <Text style={[s.modalSubtitle, { color: t.textSecondary }]}>
            Tell us what does not match your experience. This will help us improve future reflections.
          </Text>

          {FEEDBACK_PRESETS.map((opt) => {
            const isActive = feedbackOption === opt.value;

            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  s.modalOption,
                  isActive && {
                    // In dark theme the border matches Cancel text color,
                    // in light theme we keep border as accent.
                    borderColor: isDarkTheme ? t.textSecondary : t.accent,
                    backgroundColor: t.accent,
                  },
                ]}
                onPress={() => setFeedbackOption(opt.value)}
              >
                <Text
                  style={[
                    s.modalOptionText,
                    isActive && {
                      // Use high-contrast text color on accent background
                      color: t.themeName === 'dark' ? '#000000' : '#FFFFFF',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Input for custom reason */}
          <TextInput
            style={[
              s.modalInput,
              {
                color: t.textPrimary,
                borderColor: t.dividerColor || '#00000033',
              },
            ]}
            placeholder="Other (please specify)"
            placeholderTextColor={t.textSecondary}
            value={feedbackCustom}
            onChangeText={(v) => {
              setFeedbackCustom(v);
              if (v.trim().length > 0) {
                setFeedbackOption('custom');
              } else if (feedbackOption === 'custom') {
                setFeedbackOption('');
              }
            }}
          />

          <View style={s.modalActionsRow}>
            <TouchableOpacity
              onPress={closeFeedback}
              style={[
                s.modalBtn,
                s.modalBtnSecondary,
                // Add border in dark theme to match Cancel text color
                isDarkTheme && {
                  borderWidth: 1,
                  borderColor: t.textSecondary,
                },
              ]}
            >
              <Text
                style={[
                  s.modalBtnSecondaryText,
                  { color: t.textSecondary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={submitFeedback}
              disabled={!feedbackOption && !feedbackCustom.trim()}
              style={[
                s.modalBtn,
                s.modalBtnPrimary,
                (!feedbackOption && !feedbackCustom.trim()) && { opacity: 0.5 },
              ]}
            >
              <Text
                style={[
                  s.modalBtnPrimaryText,
                  {
                    color: t.themeName === 'dark' ? '#000000' : '#FFFFFF',
                  },
                ]}
              >
                Send feedback
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

      {/* Emotion circle with thin progress ring */}
      <View style={s.circleWrap}>
        <View style={{ width: CIRCLE, height: CIRCLE }}>
          {/* градиентное «ядро» круга */}
          <LinearGradient
            colors={Array.isArray(meta?.color) ? meta.color : ['#777', '#444']}
            style={s.circle}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
          >
            <Text style={s.circleTitle} numberOfLines={1} adjustsFontSizeToFit>
              {emotionTitle}
            </Text>
            <Text style={s.circleHint}>Dominant emotion</Text>
            <Text style={s.circleHint}>{previewIntensity}/10</Text>
          </LinearGradient>

          {/* тонкое кольцо-прогресс поверх круга */}
          <Svg width={CIRCLE} height={CIRCLE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={CIRCLE / 2}
              cy={CIRCLE / 2}
              r={Rpath}
              fill="none"
              stroke={t.dividerColor  || '#4B4B4B'}
              strokeWidth={RING_STROKE}
            />
            <Circle
              cx={CIRCLE / 2}
              cy={CIRCLE / 2}
              r={Rpath}
              fill="none"
              stroke={t.accent}
              strokeOpacity={0.7}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${arcLen} ${CIRC - arcLen}`}
              rotation={-90}
              originX={CIRCLE / 2}
              originY={CIRCLE / 2}
            />
          </Svg>
        </View>
      </View>

      {/* подпись под кругом */}
      <Text style={s.intensityBadge}>Intensity • {intensityBucket}</Text>
      <Text style={s.confNote}>
        {showConfidence >= 0.7 ? 'Auto • accurate' : 'Auto • check'}
      </Text>

      {/* Mini Insight */}
      <MiniInsightCard theme={t} text={miniInsight} />

      {/* AI Description */}
      <View style={[s.aiCard, { backgroundColor: t.cardBackground }]}>
        <Text style={[s.aiCardText, { color: t.textPrimary, marginBottom: 4 }]}>
          Short description{' '}
          {aiSource === 'local' ? (
            <Text style={{ fontSize: 12, color: t.textSecondary }}>(offline)</Text>
          ) : null}
        </Text>
        <Text style={[s.aiCardText, { color: t.textSecondary }]}>
          {aiDesc}
        </Text>
      </View>

      <View style={s.card}>
        <View style={s.cardHeaderRow}>
          <Text style={[s.aiCardText, { color: t.textPrimary, marginBottom: 4 }]}>
            Triggers (selected)
          </Text>
          <TouchableOpacity
            onPress={() => onEditSection('triggers')}
            disabled={fromHistory || editLocks.triggersUsed}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              s.editIconTouch,
              (fromHistory || editLocks.triggersUsed) && s.editIconTouchDisabled,
            ]}
          >
            <EditIcon theme={t} />
          </TouchableOpacity>
        </View>
        <SelectedChips
          data={editTrig}
          emptyText="No triggers selected."
          theme={t}
        />
      </View>

    <View style={s.card}>
      <View style={s.cardHeaderRow}>
        <Text style={[s.aiCardText, { color: t.textPrimary, marginBottom: 4 }]}>
          Body & Mind (selected)
        </Text>
        <TouchableOpacity
          onPress={() => onEditSection('bodyMind')}
          disabled={fromHistory || editLocks.bodyMindUsed}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[
            s.editIconTouch,
            (fromHistory || editLocks.bodyMindUsed) && s.editIconTouchDisabled,
          ]}
        >
          <EditIcon theme={t} />
        </TouchableOpacity>
      </View>
      <SelectedChips
        data={editBM}
        emptyText="No body & mind patterns selected."
        theme={t}
      />
    </View>
    </ScrollView>

    {/* Bottom action bar */}
    {!fromHistory && (
      <View
        style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]}
        pointerEvents="box-none"
      >
        <View style={sBar.bottomBarShadow} />
        <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
          <TouchableOpacity
            style={[sBar.btn, sBar.btnSecondary, { height: BAR_BTN_H }]}
            onPress={openFeedback}
          >
            <Text style={sBar.btnSecondaryText}>Discharge</Text>
          </TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity
            style={[sBar.btn, sBar.btnPrimary, { height: BAR_BTN_H }]}
            onPress={onContinue}
          >
            <Text style={sBar.btnPrimaryText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
  </ScreenWrapper>
  );
}

function SelectedChips({ data = EMPTY_ARR, emptyText = '—', theme }) {
  if (!data.length) return <Text style={{ color: theme.textSecondary }}>{emptyText}</Text>;

  const isDark = theme.themeName === 'dark';

  const pillBackgroundColor = isDark
    ? (theme.pillSelectedBg || '#3d3d46ff')
    : theme.cardBackground;

  const pillBorderColor = isDark ? '#FFFFFF22' : '#00000022';

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
      {data.map((t) => (
        <View
          key={t}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: pillBackgroundColor,
            margin: 6,
            borderWidth: 1,
            borderColor: pillBorderColor,
          }}
        >
          <Text style={{ color: theme.textPrimary }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

// makeStyles receives bar sizes to avoid capturing undefined locals
const makeStyles = (t, insets, CIRCLE, BAR_BASE_H, BAR_VPAD) => StyleSheet.create({
    scroll: {
        padding: 16,
        // Reserve space under the scroll so content doesn't hide behind the bar.
        // NOTE: we don't add safe-area here to avoid double inset.
        paddingBottom: BAR_BASE_H + 8,
    },

  circleWrap: { alignItems: 'center', marginTop: 8, marginBottom: 8 },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    paddingHorizontal: 16,
  },

  circleTitle: {
    // white в светлой теме, чёрный в тёмной
    color: t.themeName === 'light' ? '#FFFFFF' : '#000000',
    fontWeight: '900',
    fontSize: 26,
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  circleHint: {
    // мягкий белый в светлой, мягкий чёрный в тёмной
    color: t.themeName === 'light' ? '#FFFFFFCC' : '#00000099',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },

  intensityBadge: { fontSize: 14, fontWeight: '700', color: t.textPrimary, textAlign: 'center', marginTop: 12 },
  confNote: { fontSize: 12, fontWeight: '400', color: t.textSecondary, textAlign: 'center', marginTop: 2 },

  card: {
    backgroundColor: t.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#00000012',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  editIconTouch: {
    padding: 4,
  },
  editIconTouchDisabled: {
    opacity: 0.35,
  },
  editIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconText: {
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  aiCard: {
    backgroundColor: t.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#00000012',
  },
  aiCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  aiCardText: { fontSize: 14, lineHeight: 20 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  // Feedback modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  modalOption: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.dividerColor || '#00000022',
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 40,
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 14,
    color: t.textPrimary,
  },
  modalSmallLabel: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  modalInput: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  modalBtnSecondary: {
    marginRight: 8,
  },
  modalBtnPrimary: {
    backgroundColor: t.accent,
  },
  modalBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

