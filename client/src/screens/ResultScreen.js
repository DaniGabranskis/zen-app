import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import useStore from '../store/useStore';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import { generateInsight } from '../utils/aiService';
import { routeEmotionFromCards, getEmotionMeta } from '../utils/evidenceEngine';
import tinyActions from '../data/tinyActions.v1.json';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const P = Math.round(SCREEN_WIDTH * 0.05);

export default function ResultScreen() {
  const { bgcolor, textMain, textSub, cardBg, button } = useThemeVars();
  const route = useRoute();
  const acceptedCards = route.params?.acceptedCards ?? null; // new pipeline payload
  const navigation = useNavigation();
  const {
    isGenerating = false,
    keyEmotions = [],
    keyTopics = [],
    aiInsight = "",
    advice = "",
    // legacy props may still arrive:
    answers: legacyAnswers = [],
  } = route.params || {};

  // Backward-compatible input:
  // 1) preferred: acceptedCards from new flow
  // 2) legacy: route.params.answers (old format)
  // 3) legacy store: state.answers (as last resort)
  const storedLegacy = useStore((state) => state.answers) || [];
  const cards = acceptedCards ?? (legacyAnswers.length ? legacyAnswers : storedLegacy);

  console.log('🧾 Loaded cards:', cards);

  // Route emotions using the new evidence engine.
  // NOTE: engine expects "acceptedCards" format. If legacy arrays are passed,
  // engine should still handle or you can convert them before routing.
  const routed = routeEmotionFromCards(cards || []);
  console.log('[ROUTE:RESULT]', JSON.stringify({
    mode: routed.mode,
    dominant: routed.dominant,
    secondary: routed.secondary,
    confidence: routed.confidence,
    top3: Object.entries(routed.probs || {}).sort((a,b)=>b[1]-a[1]).slice(0,3),
  }, null, 2));
  if (!routed?.dominant) {
    // Fallback UI if routing failed for some reason
    return (
      <ScreenWrapper>
        <View style={{ padding: 16 }}>
          <Text>We couldn't determine your dominant emotion this time.</Text>
          <Text>Please try reflecting again.</Text>
        </View>
      </ScreenWrapper>
    );
  }
  const primary = getEmotionMeta(routed.dominant);
  const secondary = routed.secondary ? getEmotionMeta(routed.secondary) : null;

  // Derive a UI score from confidence if "score" wasn't explicitly provided.
  const computedScore = Math.round((routed?.confidence ?? 0) * 100);

  // pick tiny action
  const ta = tinyActions?.[primary.key];
  let action = ta?.base || 'Take one small supportive action today.';
  if (ta?.modifiers) {
  for (const tag of Object.keys(routed.tagFreq || {})) {
    const add = ta.modifiers[tag];
      if (add) { action = `${action} ${add}`; break; }
    }
  }

  const history = useStore((state) => state.history);
  const addHistory = useStore((state) => state.addDay);
  const fallback = history && history.length > 0 ? history[history.length - 1] : {};

  const emotionInfo = route.params?.emotionInfo || fallback.emotionInfo || null;
  const reflection = route.params?.reflection || fallback.reflection || useStore((state) => state.generatedText) || '';
  const fromHistory = route.params?.fromHistory;

  const handleEndOrFinish = () => {
    if (fromHistory) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs', { screen: 'Home' });
    }
  };

  const [loading, setLoading] = useState(isGenerating);
  const [insight, setInsight] = useState(fromHistory ? route.params?.insight : aiInsight || '');
  const [tips, setTips] = useState(fromHistory ? route.params?.tips : (Array.isArray(advice) ? advice : []));
  const [encouragement, setEncouragement] = useState(fromHistory ? route.params?.encouragement : route.params?.encouragement || '');

useEffect(() => {
  // Purpose: Fetch AI (or fallback) once the screen mounts.
  // Why: Keep UI responsive; never let parsing/network break UX.
  if (fromHistory) return;
  let cancelled = false;

  const fetchAI = async () => {
    setLoading(true);
    let parsed = { insight: '', tips: [], encouragement: '' };
    try {
      const { result, source } = await generateInsight(cards); // pass the same payload used for routing
      if (cancelled) return;
      parsed = result;
      setInsight(parsed.insight);
      setTips(parsed.tips);
      setEncouragement(parsed.encouragement);
      if (source === 'local') console.log('ℹ️ local fallback used');
    } catch (err) {
      console.warn('❌ generateInsight failed:', err);
      parsed = { insight: '', tips: [], encouragement: 'You did well reflecting today.' };
      setInsight(parsed.insight);
      setTips(parsed.tips);
      setEncouragement(parsed.encouragement);
    } finally {
      if (!cancelled) setLoading(false);
      // NOTE: save to history regardless of source for consistency
      addHistory({
        date: new Date().toISOString(),
        score: computedScore,                 // derive from routed.confidence
        keyEmotions,
        keyTopics,
        dominantEmotion: primary.key,
        secondaryEmotion: secondary ? secondary.key : null,
        mode: routed.mode,
        confidence: routed.confidence,
        tinyAction: action,
        reflection,
        insight: parsed.insight,
        tips: parsed.tips,
        encouragement: parsed.encouragement,
        answers: cards,                 // legacy field for older views
        acceptedCards: cards,           // new canonical payload
        });
    }
  };

  fetchAI();
  return () => { cancelled = true; };
}, []);


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScreenWrapper style={{ backgroundColor: bgcolor, flex: 1 }}>
        {loading ? (
          <View style={styles.fullScreen}>
            <ActivityIndicator size="large" color="#6C63FF" />
            <Text style={[styles.analyzingText, { color: textSub }]}>Analyzing your reflection...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.MainTitle}>
              Reflection Result
            </Text>

              <LinearGradient
                colors={primary.color}
                style={styles.groupCircle}
                start={{ x: 0.1, y: 0.1 }}
                end={{ x: 0.9, y: 0.9 }}
              >
                <Text style={styles.groupCircleTitle}>
                  {primary.emoji} {primary.name}
                </Text>
                {secondary && (
                  <Text style={styles.groupCircleDescription}>
                    + {secondary.emoji} {secondary.name}
                  </Text>
                )}
                <Text style={styles.groupCircleDescription}>
                  {routed.mode === 'mix' ? 'Mixed emotional tone detected' : 'Dominant emotion'}
                </Text>
              </LinearGradient>

              <Text style={styles.scoreInsideCircle}>
                {computedScore}/100
              </Text>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>AI Insight of the Day</Text>
                <Text style={styles.box}>{insight || 'No insight found.'}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tiny Action</Text>
                <Text style={styles.box}>{action}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tips</Text>
                {tips.length > 0 ? (
                  tips.map((tip, i) => (
                    <Text key={i} style={styles.box}>• {tip}</Text>
                  ))
                ) : (
                  <Text style={styles.box}>No tips available today.</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Encouragement</Text>
                <Text style={styles.box}>{encouragement || '—'}</Text>
              </View>

            <View style={styles.bottomRow}>
              <TouchableOpacity onPress={handleEndOrFinish} style={styles.finishButton}>
                <Text style={styles.finishText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    alignItems: 'center',
    paddingTop: P * 2.5,
    paddingBottom: P * 3,
    width: SCREEN_WIDTH,
    paddingHorizontal: 0,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: P * 1.5,
  },
  tagList: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    flexShrink: 1,
    marginTop: 8,
  },
  MainTitle: {
    fontSize: 35, 
    fontWeight: '600', 
  },
  scoreBadge: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  groupCircleDescription: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginHorizontal: 8,
    opacity: 0.85,
  },
  analyzingText: {
    marginTop: P * 0.6,
    fontSize: Math.round(SCREEN_WIDTH * 0.05),
    color: '#444',
    textAlign: 'center',
  },
  scoreGlowWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 34,
  },
  scoreGlow: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 3,
  },
  scoreInsideCircle: {
    fontSize: 34,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  groupCircle: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 24,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  groupCircleTitle: {
    color: 'white',
    fontWeight: '700',
    fontSize: 26,
  },
  section: {
    fontSize: Math.round(SCREEN_WIDTH * 0.05),
    fontWeight: 'bold',
    marginTop: P * 1.2,
    marginBottom: P * 0.4,
    width: '100%',
    paddingHorizontal: P,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: P * 0.7,
  },
  box: {
    borderRadius: Math.round(SCREEN_WIDTH * 0.04),
    padding: P * 0.8,
    marginBottom: P * 0.5,
    backgroundColor: '#F4F4F4',
    color: '#333',
  },
  text: {
    fontSize: Math.round(SCREEN_WIDTH * 0.043),
    lineHeight: Math.round(SCREEN_WIDTH * 0.058),
  },
  finishButton: {
    width: '85%',
    alignSelf: 'center',
    backgroundColor: '#6C63FF',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 50,
  },
  finishText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
});
