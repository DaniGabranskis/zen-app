// src/screens/L6ActionsScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import useStore from '../store/useStore';

import { makeHeaderStyles, makeBarStyles, computeBar, BAR_BTN_H } from '../ui/screenChrome';
import { selectRecommendations } from '../utils/recommendationsEngine';

const EMPTY_ARR = Object.freeze([]);

export default function L6ActionsScreen({ navigation }) {
  const t = useThemeVars();
  const insets = useSafeAreaInsets();
  const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);

  const sHead = makeHeaderStyles(t);
  const sBar = makeBarStyles(t, BAR_BASE_H);
  const s = makeStyles(t);

  // Use Zen theme tokens instead of a non-existing `t.border`.
  const borderColor = t.dividerColor || t.navBorder;

  const finishSession = useStore((st) => st.finishSession);

  // Prefer the explicitly picked emotion (L3) over the engine's top guess.
  // In probe mode decision.top[0] can differ from the final picked emotion.
  const dominant = useStore((st) => st.sessionDraft?.l3?.emotionKey || st.sessionDraft?.decision?.top?.[0] || '');
  const intensity = useStore((st) => Number(st.sessionDraft?.l4?.intensity || 0));
  const evidenceTags = useStore((st) => st.sessionDraft?.evidenceTags || EMPTY_ARR);
  const triggers = useStore((st) => st.sessionDraft?.l4?.triggers || EMPTY_ARR);
  const bodyMind = useStore((st) => st.sessionDraft?.l4?.bodyMind || EMPTY_ARR);

  // Prevents double-tap navigation and race conditions (Start/Skip pressed multiple times).
  const navLockRef = useRef(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const recs = useMemo(() => {
    return selectRecommendations({
      dominant,
      intensity,
      evidenceTags,
      triggers,
      bodyMind,
    });
  }, [dominant, intensity, evidenceTags, triggers, bodyMind]);

  useEffect(() => {
    // English-only comment: When recommendations change, reset selection to the first item.
    setSelectedIndex(0);
  }, [recs]);

  useEffect(() => {
    // When user returns to this screen, unlock navigation again.
    const unsub = navigation.addListener('focus', () => {
      navLockRef.current = false;
    });
    return unsub;
  }, [navigation]);
  const hasRecs = recs.length > 0;
  const safeIndex = hasRecs ? Math.min(selectedIndex, recs.length - 1) : 0;
  const selectedRec = hasRecs ? recs[safeIndex] : null;

  const onStart = () => {
    if (!selectedRec) return;
    if (navLockRef.current) return;
    navLockRef.current = true;

    const params = { recommendation: selectedRec, dominant };

    if (typeof navigation.push === 'function') {
      navigation.push('Recommendation', params);
    } else {
      navigation.navigate('Recommendation', params);
    }
  };

  const onSkip = () => {
    if (navLockRef.current) return;
    navLockRef.current = true;

    Promise.resolve(finishSession({ skip: true, recommendation: selectedRec }))
      .finally(() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }));
  };

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: t.bg }}>
      <View style={s.wrap}>
        <Text style={sHead.title}>Recommendations</Text>
        <Text style={sHead.subtitle}>
          These are general recommendations, not medical advice.
        </Text>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: BAR_BASE_H + BAR_SAFE + 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.card, { backgroundColor: t.cardBg }]}>
            <Text style={[s.cardTitle, { color: t.textMain }]}>Recommended</Text>

            {selectedRec ? (
              <View style={[s.recItem, s.recItemSelected, { borderColor }]}>
                <Text style={[s.recTitle, { color: t.textMain }]}>{selectedRec.title}</Text>
                <Text style={[s.recDetail, { color: t.textSub }]}>
                  {selectedRec.description || selectedRec.detail}
                </Text>

                {typeof selectedRec.durationSec === 'number' ? (
                  <Text style={[s.recMeta, { color: t.textSub }]}>
                    Duration: {Math.max(10, selectedRec.durationSec)}s
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={[s.cardBody, { color: t.textSub }]}>No recommendation available.</Text>
            )}
          </View>

          {recs.length > 1 ? (
            <View style={[s.card, { backgroundColor: t.cardBg, marginTop: 12 }]}>
              <Text style={[s.cardTitle, { color: t.textMain }]}>Other options</Text>

              {recs.map((r, idx) => {
                const active = idx === selectedIndex;
                return (
                  <TouchableOpacity
                    key={`${r.key}-${idx}`}
                    style={[
                      s.recItem,
                      { borderColor },
                      active ? s.recItemSelected : null,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedIndex(idx)}
                  >
                    <Text style={[s.recTitle, { color: t.textMain }]}>{r.title}</Text>
                    <Text style={[s.recDetail, { color: t.textSub }]}>
                      {r.description || r.detail}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </ScrollView>

        <View style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]} pointerEvents="box-none">
          <View style={sBar.bottomBarShadow} />
          <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
            <TouchableOpacity
              style={[sBar.btn, sBar.btnSecondary, { height: BAR_BTN_H }]}
              onPress={onSkip}
              activeOpacity={0.85}
            >
              <Text style={sBar.btnSecondaryText}>Skip</Text>
            </TouchableOpacity>

            <View style={{ width: 12 }} />

            <TouchableOpacity
              style={[sBar.btn, sBar.btnPrimary, { height: BAR_BTN_H }]}
              onPress={onStart}
              activeOpacity={0.85}
              disabled={!selectedRec}
            >
              <Text style={sBar.btnPrimaryText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? 14 : 18,
    },
    card: {
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: t.dividerColor || t.navBorder,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 10,
    },
    cardBody: {
      fontSize: 13,
      lineHeight: 18,
    },
    recItem: {
      borderRadius: 16,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    recItemSelected: {
      borderWidth: 2,
    },
    recTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 6,
    },
    recDetail: {
      fontSize: 13,
      lineHeight: 18,
    },
    recMeta: {
      marginTop: 8,
      fontSize: 12,
    },
  });
}
