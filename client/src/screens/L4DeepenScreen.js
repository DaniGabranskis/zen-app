// src/screens/L4DeepenScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import rawProbes from '../data/probes.v1.json';
import { estimateIntensity } from '../utils/intensity';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import { logEvent } from '../utils/telemetry';
import {
  makeHeaderStyles,
  makeBarStyles,
  computeBar,
  BAR_BTN_H,
  getBarColor,
} from '../ui/screenChrome';
import { useBottomSystemBar } from '../hooks/useBottomSystemBar';


export default function L4DeepenScreen({ navigation }) {
  // store actions
  const setTriggers = useStore((s) => s.setL4Triggers);
  const setBodyMind = useStore((s) => s.setL4BodyMind);
  const setIntensity = useStore((s) => s.setL4Intensity);

  // probes source with fallbacks
  const probes = {
    triggers: Array.isArray(rawProbes?.triggers)
      ? rawProbes.triggers
      : Array.isArray(rawProbes?.L4_triggers)
      ? rawProbes.L4_triggers
      : ['Work', 'Conflict', 'Uncertainty', 'Deadlines', 'Fatigue'],
    bodyMind: Array.isArray(rawProbes?.bodyMind)
      ? rawProbes.bodyMind
      : Array.isArray(rawProbes?.L4_bodyMind)
      ? rawProbes.L4_bodyMind
      : ['Tight chest', 'Racing thoughts', 'Shallow breathing', 'Low energy', 'Irritable'],
  };

  // local UI state
  const [stage, setStage] = useState(0); // 0: Triggers, 1: Body & Mind
  const [localTriggers, setLocalTriggers] = useState([]);
  const [localBM, setLocalBM] = useState([]);

  const theme = useThemeVars();
  const insets = useSafeAreaInsets();
  const { height: WIN_H } = useWindowDimensions();

  // bottom bar sizing (using shared helper)
  const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);
  const sHead = makeHeaderStyles(theme);
  const sBar = makeBarStyles(theme, BAR_BASE_H);

  const barColor = getBarColor(theme);
  const isDarkTheme = theme.themeName === 'dark' || theme.mode === 'dark';
  useBottomSystemBar(barColor, isDarkTheme);

  const s = makeStyles(theme, BAR_BASE_H);
  const chips = pillStyles(theme);

  // stage navigation
  const next = () => {
    console.log('[L4] next from stage', stage);
    setStage((v) => {
      const to = v + 1;
      logEvent('l4_next', { from: v, to }, `L4 stage ${v} → ${to}`);
      return to;
    });
  };

  // finalize and navigate to L5Summary
  const finish = () => {
    // persist selections
    setTriggers(localTriggers);
    setBodyMind(localBM);
    console.log('[L4] finish with', { localTriggers, localBM });

    // estimate intensity using evidence + selections
    const EMPTY_ARR = Object.freeze([]);
    const evidenceTags = useStore.getState().sessionDraft?.evidenceTags ?? EMPTY_ARR;

    const { intensity, confidence, breakdown } = estimateIntensity({
      tags: evidenceTags,
      bodyMind: localBM,
      triggers: localTriggers,
    });

    // smoke log
    console.log('[INTENSITY_SMOKE]', {
      intensity,
      confidence,
      breakdown,
      evidenceTags,
      localBM,
      localTriggers,
    });

    // store & go
    setIntensity(intensity);
    navigation.navigate('L5Summary');
  };

  return (
    <ScreenWrapper
      useFlexHeight
      withBottomBar
      style={{ backgroundColor: theme.background }}
    >
      <View style={s.wrap}>
        {stage === 0 && (
          <View style={s.content}>
            <Text style={sHead.title}>Triggers</Text>
            <Text style={sHead.subtitle}>
              Select the triggers that, in your opinion, have influenced your well-being and
              condition
            </Text>
            {probes.triggers.length === 0 && (
              <Text style={s.hint}>No triggers configured yet</Text>
            )}

            {/* Pills block занимает всё оставшееся место */}
            <View style={s.pillsContainer}>
              <Pills
                theme={theme}
                data={probes.triggers}
                selected={localTriggers}
                onChange={setLocalTriggers}
                chips={chips}
              />
            </View>
          </View>
        )}

        {stage === 1 && (
          <View style={s.content}>
            <Text style={sHead.title}>Body & Mind</Text>
            <Text style={sHead.subtitle}>
              Select the body and mind patterns that, in your opinion, reflect how you’re feeling
              right now.
            </Text>
            {probes.bodyMind.length === 0 && (
              <Text style={s.hint}>No body/mind options configured yet</Text>
            )}

            <View style={s.pillsContainer}>
              <Pills
                theme={theme}
                data={probes.bodyMind}
                selected={localBM}
                onChange={setLocalBM}
                chips={chips}
              />
            </View>
          </View>
        )}

        {/* Bottom action bar: fixed, single CTA (Next/Continue) */}
        <View style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]}>
          <View style={sBar.bottomBarShadow} />
          <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
            <TouchableOpacity
              style={[
                sBar.btn,
                sBar.btnPrimary,
                { height: BAR_BTN_H, paddingHorizontal: 18 },
              ]}
              onPress={stage === 0 ? next : finish}
            >
              <Text style={sBar.btnPrimaryText}>
                {stage === 0 ? 'Next' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

function Pills({ theme, data = [], selected = [], onChange, chips }) {
  const [containerH, setContainerH] = React.useState(0);
  const [contentH, setContentH] = React.useState(0);
  const [hasScrolled, setHasScrolled] = React.useState(false);

  const overflow = contentH > containerH;

  // Animated value for bounce effect
  const bounceAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Start infinite up-down animation
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10, // move up 10px
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0, // back to original
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();

    // Optional cleanup
    return () => {
      anim.stop();
    };
  }, [bounceAnim]);

  return (
    <View
      style={{ flex: 1, position: 'relative' }}
      onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}
    >
      <ScrollView
        contentContainerStyle={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          paddingBottom: 80, // чтобы пилюли не уехали под бар
        }}
        showsVerticalScrollIndicator={false} // стрелка вместо стандартного индикатора
        onContentSizeChange={(_, h) => setContentH(h)}
        onScrollBeginDrag={() => setHasScrolled(true)}
      >
        {data.map((t) => {
          const active = selected.includes(t);
          return (
            <TouchableOpacity
              key={t}
              onPress={() => {
                const next = active ? selected.filter((x) => x !== t) : [...selected, t];
                logEvent(
                  'l4_pill_toggle',
                  { value: t, active: !active, count: next.length },
                  `L4 ${active ? 'remove' : 'add'} "${t}" (${next.length})`,
                );
                onChange(next);
              }}
              style={[chips.pill, active && chips.pillActive]}
            >
              <Text style={chips.pillText}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* subtle scroll hint, fades after first scroll */}
    {overflow && !hasScrolled && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 12,
            right: 0,
            padding: 2,
            transform: [{ translateY: bounceAnim }], // ⬅️ тут магия
          }}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 50, fontWeight: '600' }}>
            ↓
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// --- styles

// NOTE: wrap reserves only the bar's visual height (no safe-area) to avoid double-inset.
const makeStyles = (t, BAR_BASE_H) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      padding: 16,
      paddingBottom: BAR_BASE_H + 8, // reserve space so content doesn't overlap the bar
      backgroundColor: t.background,
    },
    content: {
      flex: 1,
    },
    pillsContainer: {
      flex: 1,
      marginTop: 6,
    },
    title: {
      fontSize: 30,
      fontWeight: '900',
      marginBottom: 12,
      textAlign: 'center',
      color: t.textPrimary,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: '300',
      marginBottom: 12,
      textAlign: 'center',
      color: t.cardChoiceText,
    },
    hint: {
      color: t.textSecondary,
      marginBottom: 8,
    },
    intVal: {
      marginTop: 8,
      marginBottom: 8,
      color: t.textSecondary,
      fontWeight: '600',
    },
    centerPage: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 24,
    },
    sliderWrap: {
      width: '86%',
      maxWidth: 500,
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
  });

const pillStyles = (t) =>
  StyleSheet.create({
    pill: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: t.cardBackground,
      margin: 6,
      borderWidth: 1,
      borderColor: '#00000022',
    },
    pillActive: {
      backgroundColor: t.accent,
    },
    pillText: {
      color: t.textPrimary,
    },
  });
