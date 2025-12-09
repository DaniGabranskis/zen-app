// src/screens/L4DeepenScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Animated,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import l4Pills from '../data/l4Pills.json';
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


export default function L4DeepenScreen({ navigation, route }) {
  // store actions
  const setTriggers = useStore((s) => s.setL4Triggers);
  const setBodyMind = useStore((s) => s.setL4BodyMind);
  const setIntensity = useStore((s) => s.setL4Intensity);

  // existing selections from store (so edit = real edit)
  const storedTriggers = useStore((s) => s.sessionDraft?.l4?.triggers ?? []);
  const storedBodyMind = useStore((s) => s.sessionDraft?.l4?.bodyMind ?? []);

  // custom pills from store (global, user-defined)
  const customTriggers = useStore((s) => s.l4CustomTriggers ?? []);
  const customBodyMind = useStore((s) => s.l4CustomBodyMind ?? []);
  const addCustomTrigger = useStore((s) => s.addL4CustomTrigger);
  const addCustomBodyMind = useStore((s) => s.addL4CustomBodyMind);

  // L4 pills source with length-balanced ordering
  const probes = useMemo(() => {
    const rawTriggers = Array.isArray(l4Pills?.triggers)
      ? l4Pills.triggers
      : ['Work', 'Conflict', 'Uncertainty', 'Deadlines', 'Fatigue'];

    const rawBodyMind = Array.isArray(l4Pills?.bodyMind)
      ? l4Pills.bodyMind
      : ['Tight chest', 'Racing thoughts', 'Shallow breathing', 'Low energy', 'Irritable'];

    return {
      triggers: densifyPillsByLength(rawTriggers),
      bodyMind: densifyPillsByLength(rawBodyMind),
    };
  }, []);

  // Which section are we editing? (null | 'triggers' | 'bodyMind')
  const editSection = route?.params?.editSection ?? null;

  // local UI state
  // 0: Triggers, 1: Body & Mind
  const [stage, setStage] = useState(
    editSection === 'bodyMind' ? 1 : 0
  );

  // local selections start from what is already saved in store
  const [localTriggers, setLocalTriggers] = useState(storedTriggers);
  const [localBM, setLocalBM] = useState(storedBodyMind);

  // local state for custom pill modal
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customType, setCustomType] = useState(null); // 'trigger' | 'bodyMind' | null
  const [customText, setCustomText] = useState('');

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
    console.log('[L4] next from stage', stage, 'editSection', editSection);

    // If we came here only to edit Triggers, finish immediately from stage 0
    if (editSection === 'triggers') {
      finish();
      return;
    }

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

    const openCustomModal = (type) => {
    setCustomType(type); // 'trigger' | 'bodyMind'
    setCustomText('');
    setCustomModalVisible(true);
  };

  const handleSaveCustomPill = () => {
    const trimmed = customText.trim();

    if (!trimmed) {
      console.log('[L4] empty custom pill ignored');
      return;
    }

    if (trimmed.length > 25) {
      console.log('[L4] custom pill is longer than 25 chars, trimming');
    }

    if (customType === 'trigger') {
      addCustomTrigger(trimmed);
      setLocalTriggers((prev) =>
        prev.includes(trimmed) ? prev : [...prev, trimmed],
      );
      logEvent(
        'l4_custom_trigger_add',
        { value: trimmed },
        `L4 custom trigger "${trimmed}"`,
      );
    } else if (customType === 'bodyMind') {
      addCustomBodyMind(trimmed);
      setLocalBM((prev) =>
        prev.includes(trimmed) ? prev : [...prev, trimmed],
      );
      logEvent(
        'l4_custom_bodymind_add',
        { value: trimmed },
        `L4 custom bodyMind "${trimmed}"`,
      );
    }

    setCustomModalVisible(false);
    setCustomType(null);
    setCustomText('');
  };

  const handleCancelCustomPill = () => {
    setCustomModalVisible(false);
    setCustomType(null);
    setCustomText('');
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

            {/* Pills block takes the remaining space */}
            <View style={s.pillsContainer}>
              <Pills
                theme={theme}
                data={probes.triggers}
                customData={customTriggers}
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
                customData={customBodyMind}
                selected={localBM}
                onChange={setLocalBM}
                chips={chips}
              />
            </View>
          </View>
        )}

        {/* Bottom action bar: fixed, Custom + Next */}
        <View
          style={[sBar.bottomBar, { paddingBottom: BAR_SAFE }]}
          pointerEvents="box-none"
        >
          <View style={sBar.bottomBarShadow} />
          <View style={[sBar.bottomInner, { height: BAR_BASE_H }]}>
            <TouchableOpacity
              style={[sBar.btn, sBar.btnSecondary, { height: BAR_BTN_H }]}
              onPress={() =>
                openCustomModal(stage === 0 ? 'trigger' : 'bodyMind')
              }
            >
              <Text style={sBar.btnSecondaryText}>Custom</Text>
            </TouchableOpacity>

            <View style={{ width: 12 }} />

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
            <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelCustomPill}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>
              {customType === 'trigger'
                ? 'Add custom trigger'
                : 'Add custom body & mind pattern'}
            </Text>
            <Text style={s.modalSubtitle}>
              Enter your own wording (up to 25 characters). It will appear in
              the Custom section below the basic pills.
            </Text>

            <View style={s.modalPillPreview}>
              <Text style={s.modalPillPreviewText}>
                {customText.trim().length > 0
                  ? customText.trim()
                  : customType === 'trigger'
                  ? 'Example: Long commute home'
                  : 'Example: Warm, relaxed body'}
              </Text>
            </View>

            <TextInput
              value={customText}
              onChangeText={setCustomText}
              maxLength={25}
              placeholder="Type your custom pill"
              placeholderTextColor={theme.textSecondary}
              style={s.modalInput}
            />

            <View style={s.modalButtonsRow}>
              <TouchableOpacity
                style={[s.modalButton, s.modalButtonGhost]}
                onPress={handleCancelCustomPill}
              >
                <Text style={s.modalButtonGhostText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modalButton, s.modalButtonPrimary]}
                onPress={handleSaveCustomPill}
              >
                <Text style={s.modalButtonPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

// Re-order pills into a "cloud": mix short / medium / long labels
// without strict patterns, so rows look more like a dense tag cloud.
function densifyPillsByLength(list) {
  if (!Array.isArray(list)) return [];

  const short = [];
  const medium = [];
  const long = [];

  // 1) Split into buckets by length
  list.forEach((label) => {
    const len = String(label).length;
    if (len <= 12) {
      short.push(label);
    } else if (len <= 20) {
      medium.push(label);
    } else {
      long.push(label);
    }
  });

  // 2) Simple in-place Fisher–Yates shuffle for each bucket
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  };

  shuffle(short);
  shuffle(medium);
  shuffle(long);

  // 3) Build result as a "cloud":
  // randomly pick from non-empty buckets, so we naturally get
  // patterns like: short + long, medium + medium, short + short + short, etc.
  const result = [];
  while (short.length || medium.length || long.length) {
    const options = [];
    if (short.length) options.push('short');
    if (medium.length) options.push('medium');
    if (long.length) options.push('long');

    const bucketName = options[Math.floor(Math.random() * options.length)];

    let bucket;
    if (bucketName === 'short') bucket = short;
    else if (bucketName === 'medium') bucket = medium;
    else bucket = long;

    const next = bucket.shift();
    if (next != null) {
      result.push(next);
    }
  }

  return result;
}

function Pills({
  theme,
  data = [],
  customData = [],
  selected = [],
  onChange,
  chips,
}) {
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
      ]),
    );

    anim.start();

    // Optional cleanup
    return () => {
      anim.stop();
    };
  }, [bounceAnim]);

  const handleToggle = (label) => {
    const active = selected.includes(label);
    const next = active
      ? selected.filter((x) => x !== label)
      : [...selected, label];

    logEvent(
      'l4_pill_toggle',
      { value: label, active: !active, count: next.length },
      `L4 ${active ? 'remove' : 'add'} "${label}" (${next.length})`,
    );

    onChange(next);
  };

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
          paddingBottom: 40, // keep pills above the bottom bar
        }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={(_, h) => setContentH(h)}
        onScrollBeginDrag={() => setHasScrolled(true)}
      >
        {data.map((t) => {
          const active = selected.includes(t);
          return (
            <TouchableOpacity
              key={`base-${t}`}
              onPress={() => handleToggle(t)}
              style={[chips.pill, active && chips.pillActive]}
            >
              <Text style={chips.pillText}>{t}</Text>
            </TouchableOpacity>
          );
        })}

        {customData.length > 0 && (
          <>
            <View style={chips.customDividerRow}>
              <View style={chips.customDividerLine} />
              <Text style={chips.customDividerLabel}>Custom</Text>
              <View style={chips.customDividerLine} />
            </View>

            {customData.map((t) => {
              const active = selected.includes(t);
              return (
                <TouchableOpacity
                  key={`custom-${t}`}
                  onPress={() => handleToggle(t)}
                  style={[chips.pill, active && chips.pillActive]}
                >
                  <Text style={chips.pillText}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
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
            transform: [{ translateY: bounceAnim }],
          }}
        >
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 50,
              fontWeight: '600',
            }}
          >
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
      width: '100%', 
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

    modalBackdrop: {
      flex: 1,
      backgroundColor: '#00000066',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalContent: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 16,
      padding: 20,
      backgroundColor: t.cardBackground,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: t.textPrimary,
      marginBottom: 6,
    },
    modalSubtitle: {
      fontSize: 13,
      color: t.textSecondary,
      marginBottom: 12,
    },
    modalPillPreview: {
      alignSelf: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 999,
      backgroundColor: t.cardBackgroundAlt ?? t.cardBackground,
      borderWidth: 1,
      borderColor: '#00000022',
      marginBottom: 12,
      transform: [{ scale: 1.1 }],
    },
    modalPillPreviewText: {
      color: t.textPrimary,
      fontSize: 14,
    },
    modalInput: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#00000033',
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: t.textPrimary,
      fontSize: 14,
      marginBottom: 16,
      backgroundColor: t.background,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 12,
    },
    modalButton: {
      height: 40,
      paddingHorizontal: 18,
      borderRadius: 999,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalButtonGhost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#00000033',
    },
    modalButtonGhostText: {
      color: t.textPrimary,
      fontWeight: '500',
    },
    modalButtonPrimary: {
      backgroundColor: t.accent,
    },
    modalButtonPrimaryText: {
      color: t.accentText ?? '#ffffff',
      fontWeight: '600',
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
    customDividerRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      marginBottom: 4,
    },
    customDividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      borderStyle: 'dashed',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.textSecondary + '55',
    },
    customDividerLabel: {
      marginHorizontal: 8,
      fontSize: 13,
      fontWeight: '500',
      color: t.textSecondary,
    },
  });

