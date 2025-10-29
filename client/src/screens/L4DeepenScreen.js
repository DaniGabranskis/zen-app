// src/screens/L4DeepenScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import rawProbes from '../data/probes.v1.json';
import { estimateIntensity } from '../utils/intensity';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import { logEvent } from '../utils/telemetry';
import { makeHeaderStyles, makeBarStyles, computeBar, BAR_BTN_H } from '../ui/screenChrome';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function computePillsMaxHeight({
  windowHeight,
  insetsBottom = 0,
  titleBlock = 120,      // approx height of headings/subheadings
  buttonBlock = 64,      // visual height of the bottom bar (fixed)
  topBottomPadding = 32, // screen paddings
  fraction = 0.48,       // portion of available height
  minH = 200,            // lower limit
  maxH = 560,            // upper limit
}) {
  const available =
    windowHeight - insetsBottom - titleBlock - buttonBlock - topBottomPadding;
  const target = available * fraction;
  return clamp(target, minH, maxH);
}

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

  // bottom bar sizing (fixed height + platform-safe inset on iOS only)
  const BAR_BTN_H = 44;                    // fixed button height
  const BAR_VPAD = 10;                     // vertical padding inside the bar
  const BAR_TOTAL_H = BAR_BASE_H + BAR_SAFE; // total overlap height
  const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);
  const sHead = makeHeaderStyles(theme);
  const sBar  = makeBarStyles(theme, BAR_BASE_H);

  // compute max height for pills container (adaptive by screen)
  const pillsMaxHeight = computePillsMaxHeight({
    windowHeight: WIN_H,
    insetsBottom: BAR_SAFE, // only the extra safe-area affects available height
    titleBlock: 120,
    buttonBlock: BAR_BASE_H,
    fraction: 0.85,
    minH: 220,
    maxH: 520,
  });
  console.log('[L4] pillsMaxHeight=', pillsMaxHeight, 'WIN_H=', WIN_H, 'insets.bottom=', insets.bottom);

  const s = makeStyles(theme, BAR_BASE_H);
  const bar = bottomBarStyles(theme);
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
    <ScreenWrapper useFlexHeight style={{ backgroundColor: theme.bgcolor }}>
      <View style={s.wrap}>
        {stage === 0 && (
          <>
          <Text style={sHead.title}>Triggers</Text>
          <Text style={sHead.subtitle}>
            Select the triggers that, in your opinion, have influenced your well-being and condition
          </Text>
            {probes.triggers.length === 0 && (
              <Text style={s.hint}>No triggers configured yet</Text>
            )}

            {/* spacing before pills */}
            <View style={{ marginTop: 6 }}>
              <Pills
                theme={theme}
                data={probes.triggers}
                selected={localTriggers}
                onChange={setLocalTriggers}
                maxHeight={pillsMaxHeight}
                chips={chips}
              />
            </View>
          </>
        )}

        {stage === 1 && (
          <>
            <Text style={sHead.title}>Body & Mind</Text>
            <Text style={sHead.subtitle}>
              Select the body and mind patterns that, in your opinion, reflect how you’re feeling right now.
            </Text>
            {probes.bodyMind.length === 0 && (
              <Text style={s.hint}>No body/mind options configured yet</Text>
            )}

            {/* spacing before pills */}
            <View style={{ marginTop: 6 }}>
              <Pills
                theme={theme}
                data={probes.bodyMind}
                selected={localBM}
                onChange={setLocalBM}
                maxHeight={pillsMaxHeight}
                chips={chips}
              />
            </View>
          </>
        )}

        {/* Bottom action bar: fixed, single CTA (Next/Continue) */}
        <View style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]}>
          <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
            <TouchableOpacity
              style={[sBar.btn, sBar.btnPrimary, { height: BAR_BTN_H }]}
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

function Pills({ theme, data = [], selected = [], onChange, maxHeight = 470, chips }) {
  const [containerH, setContainerH] = React.useState(0);
  const [contentH, setContentH] = React.useState(0);
  const [hasScrolled, setHasScrolled] = React.useState(false);

  const overflow = contentH > containerH;

  return (
    <View
      style={{ maxHeight, position: 'relative' }}
      onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}
    >
      <ScrollView
        contentContainerStyle={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          paddingBottom: 80, // ensure pills won't hide behind the bottom bar
        }}
        showsVerticalScrollIndicator
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
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
            paddingVertical: 8,
            backgroundColor: 'rgba(0,0,0,0.04)',
          }}
        >
          <Text style={{ color: theme.textSub, fontSize: 12 }}>Scroll to see more</Text>
        </View>
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
      backgroundColor: t.bgcolor,
    },
    title: {
      fontSize: 30,
      fontWeight: '900',
      marginBottom: 12,
      textAlign: 'center',
      color: t.textMain,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: '300',
      marginBottom: 12,
      textAlign: 'center',
      color: t.card_choice_text,
    },
    hint: { color: t.textSub, marginBottom: 8 },
    intVal: { marginTop: 8, marginBottom: 8, color: t.textSub, fontWeight: '600' },
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
      backgroundColor: t.cardBg,
      margin: 6,
      borderWidth: 1,
      borderColor: '#00000022',
    },
    pillActive: { backgroundColor: t.button },
    pillText: { color: t.textMain },
  });

const bottomBarStyles = (t) =>
  StyleSheet.create({
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.navBar,
    },
    bottomInner: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      // height is injected from the component to keep it predictable
      backgroundColor: t.navBar,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#00000016',
    },
    btnPrimary: {
      backgroundColor: t.button,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    btnPrimaryText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 17,
      textAlign: 'center',
      letterSpacing: 0.2,
    },
  });
