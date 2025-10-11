import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import useStore from '../store/useStore';
import tinyActions from '../data/tinyActions.v1.json';
import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import { logEvent } from '../utils/telemetry';

export default function L5TinyActionScreen({ navigation }) {
  const decision = useStore(s => s.sessionDraft.decision);
  const pick = useStore(s => s.setL5TinyAction);
  const setCtx = useStore(s => s.setL5Context);
  const [ctx, setLocalCtx] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const theme = useThemeVars();
  const s = makeStyles(theme);

  const candidates = useMemo(() => {
    const emo = decision?.top?.[0];
    let pool = [];
    const byEmo = tinyActions?.[emo];
    // pick list by emotion or fallback to "generic"
    if (Array.isArray(byEmo)) pool = byEmo;
    else if (byEmo && typeof byEmo === 'object') pool = Object.values(byEmo);
    else if (Array.isArray(tinyActions?.generic)) pool = tinyActions.generic;
    else if (tinyActions?.generic && typeof tinyActions.generic === 'object') pool = Object.values(tinyActions.generic);

    // Normalize to { id, title, caption }
    const toNorm = (it, idx) => {
      if (typeof it === 'string') {
        return { id: `s_${idx}`, title: it, caption: '' };
      }
      if (it && typeof it === 'object') {
        // case: { key,title,caption } OR { someTag: "Some text" }
        if (it.title) {
          return { id: it.key ?? `o_${idx}`, title: it.title, caption: it.caption ?? '' };
        }
        const keys = Object.keys(it);
        if (keys.length === 1) {
          const k = keys[0];
          return { id: k, title: String(it[k]), caption: '' };
        }
      }
      // fallback
      return { id: `u_${idx}`, title: 'Action', caption: '' };
    };

    const normalized = Array.isArray(pool) ? pool.map(toNorm).filter(x => !!x.title) : [];
    console.log('[L5] normalized actions:', normalized);
    logEvent('l5_candidates', { emotion: emo, count: normalized.length }, `L5 candidates for ${emo}: ${normalized.length}`);
    return normalized.slice(0, 8);
  }, [decision]);

  if (!decision?.top?.[0]) {
    // no emotion -> fallback to reflection start
    navigation.replace('ReflectionFlow');
    return;
  }

  const onContinue = () => {
    console.log('[L5] continue, ctx:', ctx);
    setCtx(ctx);
    logEvent('l5_continue', { context: ctx }, `L5 continue, context: ${ctx || '-'}`);
    navigation.navigate('L6Summary');
  };

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: theme.bgcolor }}>
      <View style={s.wrap}>
        <Text style={s.title}>Pick 1 tiny action for the next hour</Text>

        {candidates.length === 0 ? (
          <Text style={s.empty}>No tiny actions configured for this emotion</Text>
        ) : (
          <FlatList
            data={candidates}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.card, selectedId === item.id && s.cardActive]}
              onPress={() => {
                // We save the visible text as the chosen action for Summary
                console.log('[L5] pick tiny action (normalized):', item);
                setSelectedId(item.id);
                pick(item.title); // store title directly
                logEvent('l5_action_pick', { id: item.id, title: item.title }, `Picked tiny action: ${item.title}`);
              }}
            >
              <Text style={s.cardTitle}>{item.title}</Text>
              {!!item.caption && <Text style={s.cardText}>{item.caption}</Text>}
            </TouchableOpacity>
            )}
          />
        )}

        <Text style={s.subtitle}>Context (optional)</Text>
        <TextInput
          value={ctx}
          onChangeText={setLocalCtx}
          placeholder="Where/when/how will you do it?"
          placeholderTextColor={theme.textSub}
          style={s.input}
        />

        <TouchableOpacity style={[s.btn, !selectedId && s.btnDisabled]} disabled={!selectedId} onPress={onContinue}>
          <Text style={s.btnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    wrap: { flex: 1, padding: 16, backgroundColor: t.bgcolor },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: t.textMain },
    empty: { color: t.textSub, marginVertical: 12 },
    card: {
      padding: 14,
      borderRadius: 12,
      backgroundColor: t.cardBg,
      marginVertical: 6,
      borderWidth: 1,
      borderColor: '#00000022',
    },
    cardActive: { borderColor: t.button, borderWidth: 2 },
    cardTitle: { color: t.textMain, fontWeight: '700', marginBottom: 4 },
    cardText: { color: t.textSub },
    subtitle: { marginTop: 12, fontWeight: '600', color: t.textMain },
    input: {
      marginTop: 8,
      padding: 12,
      borderRadius: 10,
      backgroundColor: t.cardBg,
      color: t.textMain,
      borderWidth: 1,
      borderColor: '#00000022',
    },
    btn: { marginTop: 16, padding: 14, backgroundColor: t.button, borderRadius: 12, alignItems: 'center' },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: '#FFFFFF', fontWeight: '700' },
  });
