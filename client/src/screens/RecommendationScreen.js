// src/screens/RecommendationScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenWrapper from '../components/ScreenWrapper';
import useThemeVars from '../hooks/useThemeVars';
import useStore from '../store/useStore';

import { makeHeaderStyles, makeBarStyles, computeBar, BAR_BTN_H } from '../ui/screenChrome';
import { buildRecommendationFlow } from '../recommendations/flowRegistry';

export default function RecommendationScreen({ navigation, route }) {
  const t = useThemeVars();
  const insets = useSafeAreaInsets();
  const { BAR_BASE_H, BAR_SAFE } = computeBar(insets);

  const finishSession = useStore((s) => s.finishSession);

  const recommendation = route?.params?.recommendation || null;

  // Block "back" navigation (no skip once started).
  const allowExitRef = useRef(false);
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (allowExitRef.current) return;
      e.preventDefault();
    });
    return unsub;
  }, [navigation]);

  const recKey = recommendation?.key || recommendation?.id || null;

  const flow = useMemo(() => buildRecommendationFlow(recommendation), [recKey]);

  useEffect(() => {
    setStepIndex(0);
    setFlowState(flow.initialState);
  }, [recKey]);

  const isLast = stepIndex >= flow.steps.length - 1;
  const primaryLabel = flow.getPrimaryLabel
    ? flow.getPrimaryLabel(stepIndex, { isLast }, flowState)
    : (isLast ? 'Finish' : 'Next');

  const canProceed = flow.canProceed ? flow.canProceed(stepIndex, flowState) : true;

  const onPrimary = () => {
    // Special-case: Breath flow should not start automatically.
    if (recommendation?.kind === 'breath' && !flowState?.started) {
      setFlowState((prev) => ({
        ...(prev || {}),
        started: true,
      }));
      return;
    }

    if (!canProceed) return;

    if (!isLast) {
      setStepIndex((v) => Math.min(flow.steps.length - 1, v + 1));
      return;
    }

    // Finish flow → finish session → reset to MainTabs
    allowExitRef.current = true;

    Promise.resolve(finishSession({ skip: false, recommendation }))
      .finally(() => {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      });
  };

  const sHead = makeHeaderStyles(t);
  const sBar = makeBarStyles(t, BAR_BASE_H);
  const s = makeStyles(t);

  const step = flow.steps[stepIndex] || null;
  const StepComponent = step?.Component || null;

  return (
    <ScreenWrapper useFlexHeight style={{ backgroundColor: t.bg }}>
      <View style={s.wrap}>
        <Text style={sHead.title}>{flow.title || 'Recommendation'}</Text>
        <Text style={sHead.subtitle}>{flow.subtitle || 'Follow the steps below.'}</Text>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: BAR_BASE_H + BAR_SAFE + 16 + 44 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.card, { backgroundColor: t.cardBg }]}>
            <View style={s.stepHeader}>
              <Text style={[s.stepKicker, { color: t.textSub }]}>
                Step {Math.min(flow.steps.length, stepIndex + 1)} of {Math.max(1, flow.steps.length)}
              </Text>
              {step?.label ? (
                <Text style={[s.stepLabel, { color: t.textMain }]}>{step.label}</Text>
              ) : null}
            </View>

            {StepComponent ? (
              <StepComponent
                step={step}
                recommendation={recommendation}
                theme={t}
                state={flowState}
                setState={setFlowState}
                stepIndex={stepIndex}
                stepsCount={flow.steps.length}
              />
            ) : (
              <Text style={[s.body, { color: t.textSub }]}>No step content.</Text>
            )}
          </View>
        </ScrollView>
          
          <View style={[s.disclaimerDock, { backgroundColor: t.bg, borderTopColor: t.border }]}>
            <Text style={[s.disclaimerDockText, { color: t.textSub }]}>
              This is a general recommendation and not medical advice.
            </Text>
          </View>

        {/* Bottom bar: only primary, no skip/back */}
        <View style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]} pointerEvents="box-none">
          <View style={sBar.bottomBarShadow} />
          <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
            <TouchableOpacity
              style={[
                sBar.btn,
                sBar.btnPrimary,
                { height: BAR_BTN_H, flex: 1 },
                !canProceed ? { opacity: 0.55 } : null,
              ]}
              onPress={onPrimary}
              activeOpacity={0.85}
              disabled={!canProceed}
            >
              <Text style={sBar.btnPrimaryText}>{primaryLabel}</Text>
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
      borderColor: t.border,
    },
    stepHeader: {
      marginBottom: 10,
    },
    stepKicker: {
      fontSize: 12,
      marginBottom: 6,
    },
    stepLabel: {
      fontSize: 14,
      fontWeight: '800',
    },
    body: {
      fontSize: 13,
      lineHeight: 18,
    },
    disclaimerDock: {
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: 1,
      paddingHorizontal: 14,
    },
    disclaimerDockText: {
      textTransform: 'uppercase',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.8,
      textAlign: 'center',
    },
  });
}
