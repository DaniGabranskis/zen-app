import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import rawProbes from '../data/probes.v1.json';
import { estimateIntensity } from '../utils/intensity';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import { logEvent } from '../utils/telemetry';

function computePillsMaxHeight({
  windowHeight,
  insetsBottom = 0,
  titleBlock = 120,      // approximate height of headings/subheadings
  buttonBlock = 72,      // actual button height + padding
  topBottomPadding = 32, // internal screen paddings
  fraction = 0.48,       // percentage of available height
  minH = 200,            // lower limit (not too low)
  maxH = 560,            // upper limit (do not inflate on tablets)
}) {
  const available = windowHeight - insetsBottom - titleBlock - buttonBlock - topBottomPadding;
  const target = available * fraction;
  return clamp(target, minH, maxH);
}

export default function L4DeepenScreen({ navigation }) {
  const setTriggers = useStore(s => s.setL4Triggers);
  const setBodyMind = useStore(s => s.setL4BodyMind);
  const setIntensity = useStore(s => s.setL4Intensity);

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

  const [stage, setStage] = useState(0);
  const [localTriggers, setLocalTriggers] = useState([]);
  const [localBM, setLocalBM] = useState([]);

  const theme = useThemeVars();
  const { height: WIN_H } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const pillsMaxHeight = computePillsMaxHeight({
    windowHeight: WIN_H,
    insetsBottom: insets.bottom,
    // If desired, you can adjust the ratings for a specific screen stage 0/1
    titleBlock: 120,
    buttonBlock: 84,
    fraction: 0.85,        
    minH: 220,
    maxH: 520,
  });
  console.log('[L4] pillsMaxHeight=', pillsMaxHeight, 'WIN_H=', WIN_H, 'insets.bottom=', insets.bottom);

  const s = makeStyles(theme, insets);

  const next = () => {
    console.log('[L4] next from stage', stage);
    setStage(v => {
      const to = v + 1;
      logEvent('l4_next', { from: v, to }, `L4 stage ${v} → ${to}`);
      return to;
    });
  };

  const finish = () => {
    // persist L4 selections
    setTriggers(localTriggers);
    setBodyMind(localBM);
    console.log('[L4] finish with', { localTriggers, localBM });

    // estimate intensity from evidence + selections
    const EMPTY_ARR = Object.freeze([]);
    const evidenceTags = useStore.getState().sessionDraft?.evidenceTags ?? EMPTY_ARR;

    const { intensity, confidence, breakdown } = estimateIntensity({
      tags: evidenceTags,
      bodyMind: localBM,
      triggers: localTriggers,
    });

    // --- SMOKE TEST LOG (you asked for it here) ---
    console.log('[INTENSITY_SMOKE]', { intensity, confidence, breakdown, evidenceTags, localBM, localTriggers });

    // store & navigate
    setIntensity(intensity);
    navigation.navigate('L5Summary');
  };


  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: theme.bgcolor }}>
      <View style={s.wrap}>
        {stage === 0 && (
          <>
            <Text style={s.title}>Triggers</Text>
            <Text style={s.subtitle}>Select the triggers that, in your opinion, have influenced your well-being and condition</Text>
            {probes.triggers.length === 0 && (
              <Text style={s.hint}>No triggers configured yet</Text>
            )}
            {/* Push the pills block down a bit without affecting other elements */}
            <View style={{ marginTop: 24 }}>
              <Pills
                theme={theme}
                data={probes.triggers}
                selected={localTriggers}
                onChange={setLocalTriggers}
                maxHeight={pillsMaxHeight}
              />
            </View>
            <Primary theme={theme} insets={insets} onPress={next} label="Next" />
          </>
        )}

        {stage === 1 && (
          <>
            <Text style={s.title}>Body & Mind</Text>
            <Text style={s.subtitle}>Select the body and mind patterns that, in your opinion, reflect how you’re feeling right now.</Text>
            {probes.bodyMind.length === 0 && (
              <Text style={s.hint}>No body/mind options configured yet</Text>
            )}
            {/* Push the pills block down a bit without affecting other elements */}
            <View style={{ marginTop: 24 }}>
              <Pills
                theme={theme}
                data={probes.bodyMind}
                selected={localBM}
                onChange={setLocalBM}
                maxHeight={pillsMaxHeight}
              />
            </View>
            <Primary theme={theme} insets={insets} onPress={finish} label="Continue" />
          </>
        )}

      </View>
    </ScreenWrapper>
  );
}

function Pills({ theme, data = [], selected = [], onChange, maxHeight = 470 }) {
  const s = pillStyles(theme);
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
          paddingBottom: 80, // adequate gap so pills are not hidden by the button
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
              style={[s.pill, active && s.pillActive]}
            >
              <Text style={s.pillText}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Мягкий намёк на скролл — исчезает после первого скролла */}
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


function Primary({ theme, insets, onPress, label }) {
  const s = btnStyles(theme, insets);
  return (
    <TouchableOpacity style={s.btn} onPress={onPress}>
      <Text style={s.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));



// styles
const makeStyles = (t, insets) =>
  StyleSheet.create({
    wrap: { 
      flex: 1, 
      padding: 16, 
      paddingBottom:  (insets?.bottom ?? 0) + 72, 
      backgroundColor: t.bgcolor 
    },
    title: { fontSize: 30, fontWeight: '900', marginBottom: 12, textAlign: 'center', color: t.textMain },
    subtitle: { fontSize: 15, fontWeight: '300', marginBottom: 12, textAlign: 'center', color: t.card_choice_text },
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

const btnStyles = (t, insets) =>
  StyleSheet.create({
    btn: {
      position: 'absolute',
      bottom: 24,
      left: 16,
      right: 16,
      padding: 14,
      backgroundColor: t.button,
      borderRadius: 12,
      alignItems: 'center',
    },
    btnText: { color: '#FFFFFF', fontWeight: '700' },
  });
