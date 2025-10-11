import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import useStore from '../store/useStore';
import rawProbes from '../data/probes.v1.json';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import { logEvent } from '../utils/telemetry';

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
  const [localInt, setLocalInt] = useState(0);

  const theme = useThemeVars();
  const s = makeStyles(theme);

  const next = () => {
    setStage(v => {
      const to = v + 1;
      logEvent('l4_next', { from: v, to }, `L4 stage ${v} → ${to}`);
      return to;
    });
  };
  const finish = () => {
    logEvent('l4_finish', {
      triggers: localTriggers,
      bodyMind: localBM,
      intensity: localInt,
    }, `L4 done. Intensity=${localInt}, triggers=${localTriggers.join(', ') || '-'}`);
    setTriggers(localTriggers);
    setBodyMind(localBM);
    setIntensity(localInt);
    navigation.navigate('L5TinyAction');
  };

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: theme.bgcolor }}>
      <View style={s.wrap}>
        {stage === 0 && (
          <>
            <Text style={s.title}>Triggers (pick a few)</Text>
            {probes.triggers.length === 0 && (
              <Text style={s.hint}>No triggers configured yet</Text>
            )}
            <Pills theme={theme} data={probes.triggers} selected={localTriggers} onChange={setLocalTriggers} />
            <Primary theme={theme} onPress={next} label="Next" />
          </>
        )}

        {stage === 1 && (
          <>
            <Text style={s.title}>Body & Mind patterns</Text>
            {probes.bodyMind.length === 0 && (
              <Text style={s.hint}>No body/mind options configured yet</Text>
            )}
            <Pills theme={theme} data={probes.bodyMind} selected={localBM} onChange={setLocalBM} />
            <Primary theme={theme} onPress={next} label="Next" />
          </>
        )}

        {stage === 2 && (
          <>
            <Text style={[s.title, { textAlign: 'center' }]}>Intensity of current feeling (0–10)</Text>
            {/* Center whole block vertically */}
            <View style={s.centerPage}>
              {/* Slider needs explicit width to render the track */}
              <View style={s.sliderWrap}>
                <Slider
                  minimumValue={0}
                  maximumValue={10}
                  step={1}
                  value={localInt}
                  onValueChange={(v) => {
                    console.log('[L4] intensity change:', v);
                    setLocalInt(v);
                  }}
                  minimumTrackTintColor={theme.button}
                  maximumTrackTintColor={theme.textSub}
                  thumbTintColor={theme.button}
                  style={{ width: '100%', height: 40 }}
                />
              </View>

              <Text style={[s.intVal, { textAlign: 'center' }]}>{localInt}</Text>
            </View>

            <Primary theme={theme} onPress={finish} label="Continue" />
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

function Pills({ theme, data = [], selected = [], onChange }) {
  const s = pillStyles(theme);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {data.map((t) => {
        const active = selected.includes(t);
        return (
          <TouchableOpacity
            key={t}
            onPress={() => {
              const next = active ? selected.filter(x => x !== t) : [...selected, t];
              // diagnostic log
              logEvent('l4_pill_toggle', {
                value: t,
                active: !active,
                count: next.length,
              }, `L4 ${active ? 'remove' : 'add'} "${t}" (${next.length})`);
              onChange(next);
            }}
            style={[s.pill, active && s.pillActive]}>
            <Text style={s.pillText}>{t}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Primary({ theme, onPress, label }) {
  const s = btnStyles(theme);
  return (
    <TouchableOpacity style={s.btn} onPress={onPress}>
      <Text style={s.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// styles
const makeStyles = (t) =>
  StyleSheet.create({
    wrap: { flex: 1, padding: 16, backgroundColor: t.bgcolor },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: t.textMain },
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

const btnStyles = (t) =>
  StyleSheet.create({
    btn: {
      marginTop: 16,
      padding: 14,
      backgroundColor: t.button,
      borderRadius: 12,
      alignItems: 'center',
    },
    btnText: { color: '#FFFFFF', fontWeight: '700' },
  });
