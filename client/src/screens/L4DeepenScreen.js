import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Slider } from 'react-native';
import useStore from '../store/useStore';
import probes from '../data/probes.v1.json';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';

export default function L4DeepenScreen({ navigation }) {
  const setTriggers = useStore(s => s.setL4Triggers);
  const setBodyMind = useStore(s => s.setL4BodyMind);
  const setIntensity = useStore(s => s.setL4Intensity);

  const [stage, setStage] = useState(0);
  const [localTriggers, setLocalTriggers] = useState([]);
  const [localBM, setLocalBM] = useState([]);
  const [localInt, setLocalInt] = useState(0);

  const next = () => setStage((v) => v + 1);

  const finish = () => {
    setTriggers(localTriggers);
    setBodyMind(localBM);
    setIntensity(localInt);
    navigation.navigate('L5TinyAction');
  };

  const { bgcolor, textMain, textSub, button, cardBg } = useThemeVars();

  return (
  <ScreenWrapper useFlexHeight style={{ backgroundColor: bgcolor }}>
    <View style={[styles.wrap, { backgroundColor: bgcolor }]}>
      {stage === 0 && (
        <>
          <Text style={styles.title}>Triggers (pick a few)</Text>
          {/* render pills from probes.triggers */}
          <Pills data={probes.triggers} selected={localTriggers} onChange={setLocalTriggers} />
          <Primary onPress={next} label="Next" />
        </>
      )}
      {stage === 1 && (
        <>
          <Text style={styles.title}>Body & Mind patterns</Text>
          <Pills data={probes.bodyMind} selected={localBM} onChange={setLocalBM} />
          <Primary onPress={next} label="Next" />
        </>
      )}
      {stage === 2 && (
        <>
          <Text style={styles.title}>Intensity (0–10)</Text>
          <Slider minimumValue={0} maximumValue={10} step={1} value={localInt} onValueChange={setLocalInt} />
          <Primary onPress={finish} label="Continue" />
        </>
      )}
    </View>
  </ScreenWrapper>
  );
}

function Pills({ data = [], selected = [], onChange }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {data.map((t) => {
        const active = selected.includes(t);
        return (
          <TouchableOpacity
            key={t}
            onPress={() => {
              const next = active ? selected.filter(x => x !== t) : [...selected, t];
              onChange(next);
            }}
            style={[styles.pill, active && styles.pillActive]}>
            <Text style={styles.pillText}>{t}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Primary({ onPress, label }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#111827', margin: 6 },
  pillActive: { backgroundColor: '#2563EB' },
  pillText: { color: 'white' },
  btn: { marginTop: 16, padding: 14, backgroundColor: '#2563EB', borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700' },
});
