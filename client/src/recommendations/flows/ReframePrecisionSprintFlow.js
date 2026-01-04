// src/recommendations/flows/ReframePrecisionSprintFlow.js
import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// English-only comments as requested.

const CHECK_PATH = 'M7 15L12 20L21 8';

const CLAIM_PRESETS = [
  { key: 'loss_control', text: "I'm losing control of everything." },
  { key: 'perfectionism', text: "If I don’t do this perfectly, I’ll fail." },
  { key: 'too_much', text: "This is too much for me." },
];

const PRECISION_UPGRADES = [
  { key: 'timeframe', title: 'Timeframe', hint: 'Make it time-bound (right now / today).' },
  { key: 'scope', title: 'Scope', hint: 'Shrink “everything” to the specific part.' },
  { key: 'unknown_yet', title: 'Unknown-yet', hint: 'Replace certainty with “not sure yet”.' },
  { key: 'evidence', title: 'Fact vs story', hint: 'Separate facts from interpretation.' },
];

const LEVERS = [
  {
    key: 'define_done',
    title: 'Define “Done”',
    hint: 'Pick 1 clear criterion for what counts as done.',
  },
  {
    key: 'now_next_not_today',
    title: 'Now / Next / Not today',
    hint: 'Sort the mess into 3 buckets (30 seconds).',
  },
  {
    key: 'ugly_step',
    title: 'First ugly step',
    hint: 'Start with the smallest “bad” version to break inertia.',
  },
  {
    key: 'ask_clarify',
    title: 'Ask / Clarify',
    hint: 'Write one question that would unblock you.',
  },
  {
    key: 'reduce_scope',
    title: 'Reduce scope',
    hint: 'Cut the task down to a v0.1 you can finish.',
  },
  {
    key: 'custom',
    title: 'Custom lever',
    hint: 'Write your own 10-min lever.',
  },
];

export function ReframePrecisionSprintStep({ step, theme, state, setState }) {
  const s = makeStyles(theme);
  const stage = step?.stage || 'claim';

  const reframe = state?.reframe || {};
  const beforeControl = typeof reframe.beforeControl === 'number' ? reframe.beforeControl : null;
  const afterControl = typeof reframe.afterControl === 'number' ? reframe.afterControl : null;

  const claimText = String(reframe.claimText || '');
  const reframedText = String(reframe.reframedText || '');

  const selectedPresetKey = reframe.claimPresetKey || null;
  const selectedUpgradeKey = reframe.precisionUpgrade || null;
  const selectedLeverKey = reframe.leverKey || null;

  const customLeverText = String(reframe.customLeverText || '');

  const setReframe = (patch) => {
    setState((prev) => ({
      ...(prev || {}),
      reframe: {
        ...(prev?.reframe || {}),
        ...patch,
      },
    }));
  };

  const derivedReframed = useMemo(() => {
    // Keep computed value in sync, but do not override user edits unless they haven't typed yet.
    if (!selectedUpgradeKey) return '';
    return applyUpgrade({ claimText, upgradeKey: selectedUpgradeKey });
  }, [claimText, selectedUpgradeKey]);

  const accent = theme.accent || '#A78BFA';
  const border = theme.dividerColor || theme.navBorder || theme.border || '#00000022';
  const softFill = theme.presscardBg || '#E8E5FF';

  const renderControlRow = (value, onPick) => {
    return (
      <View style={s.ratingRow}>
        {[0, 1, 2, 3].map((n) => {
          const active = value === n;
          return (
            <TouchableOpacity
              key={String(n)}
              onPress={() => onPick(n)}
              activeOpacity={0.9}
              style={[
                s.ratingPill,
                {
                  borderColor: active ? accent : border,
                  backgroundColor: active ? softFill : 'transparent',
                },
              ]}
            >
              <Text style={[s.ratingText, { color: theme.textMain }]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (stage === 'claim') {
    return (
      <View>
        <Text style={[s.kicker, { color: theme.textSub }]}>Precision Sprint</Text>
        <Text style={[s.title, { color: theme.textMain }]}>Name the claim</Text>

        <View style={s.block}>
          <Text style={[s.label, { color: theme.textMain }]}>Control right now</Text>
          {renderControlRow(beforeControl, (n) => setReframe({ beforeControl: n }))}
        </View>

        <View style={s.block}>
          <Text style={[s.label, { color: theme.textMain }]}>Pick one (or edit)</Text>

          {CLAIM_PRESETS.map((p) => {
            const active = selectedPresetKey === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                onPress={() => setReframe({ claimPresetKey: p.key, claimText: p.text })}
                activeOpacity={0.9}
                style={[
                  s.choice,
                  {
                    borderColor: active ? accent : border,
                    backgroundColor: active ? softFill : 'transparent',
                  },
                ]}
              >
                <Text style={[s.choiceText, { color: theme.textMain }]}>{p.text}</Text>
                <CheckBadge checked={active} color={accent} border={border} />
              </TouchableOpacity>
            );
          })}

          <View style={[s.editorWrap, { borderColor: border, backgroundColor: theme.bg }]}>
            <TextInput
              value={claimText}
              onChangeText={(v) => setReframe({ claimText: v })}
              placeholder="Or write your own short claim…"
              placeholderTextColor={theme.textSub}
              style={[s.editorText, { color: theme.textMain }]}
              multiline
              autoCorrect
              autoCapitalize="sentences"
              underlineColorAndroid="transparent"
            />
          </View>

          <Text style={[s.hint, { color: theme.textSub }]}>
            Keep it short. One sentence is enough.
          </Text>
        </View>
      </View>
    );
  }

  if (stage === 'precision') {
    const showReframed = selectedUpgradeKey ? (reframedText || derivedReframed) : '';

    return (
      <View>
        <Text style={[s.kicker, { color: theme.textSub }]}>Precision Sprint</Text>
        <Text style={[s.title, { color: theme.textMain }]}>Add one precision</Text>

        <View style={s.block}>
          <Text style={[s.label, { color: theme.textMain }]}>Your claim</Text>
          <View style={[s.quoteWrap, { borderColor: border, backgroundColor: theme.bg }]}>
            <Text style={[s.quoteText, { color: theme.textMain }]} numberOfLines={4}>
              {claimText.trim().length ? claimText.trim() : '—'}
            </Text>
          </View>
        </View>

        <View style={s.block}>
          <Text style={[s.label, { color: theme.textMain }]}>Choose one upgrade</Text>

          {PRECISION_UPGRADES.map((u) => {
            const active = selectedUpgradeKey === u.key;
            return (
              <TouchableOpacity
                key={u.key}
                onPress={() => {
                  const next = applyUpgrade({ claimText, upgradeKey: u.key });
                  setReframe({
                    precisionUpgrade: u.key,
                    // Only replace reframedText if user hasn't edited it yet (or it was empty).
                    reframedText: String(reframe.reframedText || '').trim().length ? reframe.reframedText : next,
                  });
                }}
                activeOpacity={0.9}
                style={[
                  s.choice,
                  {
                    borderColor: active ? accent : border,
                    backgroundColor: active ? softFill : 'transparent',
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.choiceTitle, { color: theme.textMain }]}>{u.title}</Text>
                  <Text style={[s.choiceHint, { color: theme.textSub }]}>{u.hint}</Text>
                </View>
                <CheckBadge checked={active} color={accent} border={border} />
              </TouchableOpacity>
            );
          })}

          <View style={[s.editorWrap, { borderColor: border, backgroundColor: theme.bg }]}>
            <TextInput
              value={showReframed}
              onChangeText={(v) => setReframe({ reframedText: v })}
              placeholder="Your precise version will appear here…"
              placeholderTextColor={theme.textSub}
              style={[s.editorText, { color: theme.textMain }]}
              multiline
              autoCorrect
              autoCapitalize="sentences"
              underlineColorAndroid="transparent"
            />
          </View>

          <Text style={[s.hint, { color: theme.textSub }]}>
            Goal: smaller scope, less certainty, more accuracy.
          </Text>
        </View>
      </View>
    );
  }

  // stage === 'lever'
  return (
    <View>
      <Text style={[s.kicker, { color: theme.textSub }]}>Precision Sprint</Text>
      <Text style={[s.title, { color: theme.textMain }]}>Pick one lever</Text>

      <View style={s.block}>
        <Text style={[s.label, { color: theme.textMain }]}>Your precise version</Text>
        <View style={[s.quoteWrap, { borderColor: border, backgroundColor: theme.bg }]}>
          <Text style={[s.quoteText, { color: theme.textMain }]} numberOfLines={4}>
            {String((reframedText || derivedReframed) || '').trim().length ? (reframedText || derivedReframed) : '—'}
          </Text>
        </View>
      </View>

      <View style={s.block}>
        <Text style={[s.label, { color: theme.textMain }]}>One 10-minute lever</Text>

        {LEVERS.map((lv) => {
          const active = selectedLeverKey === lv.key;
          return (
            <View key={lv.key} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setReframe({ leverKey: lv.key })}
                activeOpacity={0.9}
                style={[
                  s.choice,
                  {
                    borderColor: active ? accent : border,
                    backgroundColor: active ? softFill : 'transparent',
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.choiceTitle, { color: theme.textMain }]}>{lv.title}</Text>
                  <Text style={[s.choiceHint, { color: theme.textSub }]}>{lv.hint}</Text>
                </View>
                <CheckBadge checked={active} color={accent} border={border} />
              </TouchableOpacity>

              {lv.key === 'custom' && active ? (
                <View style={[s.editorWrap, { borderColor: border, backgroundColor: theme.bg }]}>
                  <TextInput
                    value={customLeverText}
                    onChangeText={(v) => setReframe({ customLeverText: v })}
                    placeholder="Write your lever in one sentence…"
                    placeholderTextColor={theme.textSub}
                    style={[s.editorText, { color: theme.textMain }]}
                    multiline
                    autoCorrect
                    autoCapitalize="sentences"
                    underlineColorAndroid="transparent"
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={s.block}>
        <Text style={[s.label, { color: theme.textMain }]}>Control now</Text>
        {renderControlRow(afterControl, (n) => setReframe({ afterControl: n }))}
        <Text style={[s.hint, { color: theme.textSub }]}>
          Quick check: did control shift even a little?
        </Text>
      </View>
    </View>
  );
}

function CheckBadge({ checked, color, border }) {
  const size = 28;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: checked ? color : border,
        backgroundColor: checked ? color : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
      }}
    >
      {checked ? (
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d={CHECK_PATH} stroke="#FFFFFF" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}

function applyUpgrade({ claimText, upgradeKey }) {
  const raw = String(claimText || '').trim();
  if (!raw.length) return '';

  if (upgradeKey === 'timeframe') {
    // Add a time anchor to reduce global, timeless interpretation.
    if (/^right now\b/i.test(raw) || /^today\b/i.test(raw)) return raw;
    return `Right now, ${lowercaseFirst(raw)}`;
  }

  if (upgradeKey === 'scope') {
    // Shrink “everything” / global words into a specific slice.
    let v = raw;
    v = v.replace(/\beverything\b/gi, 'this part');
    v = v.replace(/\balways\b/gi, 'often');
    v = v.replace(/\bnever\b/gi, 'rarely');
    // If the sentence is still global, add a scope prefix.
    if (!/^in this\b/i.test(v) && !/^for this\b/i.test(v)) {
      v = `In this situation, ${lowercaseFirst(v)}`;
    }
    return v;
  }

  if (upgradeKey === 'unknown_yet') {
    // Convert certainty into “not sure yet” without denying the feeling.
    if (/don'?t know yet/i.test(raw) || /not sure yet/i.test(raw)) return raw;
    return `I’m not sure yet, but ${lowercaseFirst(raw)}`;
  }

  if (upgradeKey === 'evidence') {
    // Separate facts from interpretation. Keep it short (two clauses).
    const fact = 'The fact is: I have a lot on my plate.';
    const story = `The story is: ${raw}`;
    return `${fact} ${story}`;
  }

  return raw;
}

function lowercaseFirst(s) {
  const str = String(s || '');
  if (!str.length) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function makeStyles(t) {
  return StyleSheet.create({
    kicker: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 10,
    },
    title: {
      fontSize: 18,
      fontWeight: '900',
      marginBottom: 16,
      letterSpacing: 0.2,
    },

    block: {
      marginBottom: 22, // more spacing, less density
    },

    label: {
      fontSize: 12,
      fontWeight: '900',
      marginBottom: 10,
      letterSpacing: 0.3,
    },

    ratingRow: {
      flexDirection: 'row',
    },
    ratingPill: {
      minWidth: 46,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    ratingText: {
      fontSize: 13,
      fontWeight: '900',
    },

    choice: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 18,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 14,
    },
    choiceText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '800',
      lineHeight: 20,
    },
    choiceTitle: {
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 4,
    },
    choiceHint: {
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
    },

    editorWrap: {
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginTop: 8,
    },
    editorText: {
      fontSize: 14,
      fontWeight: '800',
      lineHeight: 20,
      minHeight: 48,
    },

    quoteWrap: {
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    quoteText: {
      fontSize: 14,
      fontWeight: '800',
      lineHeight: 20,
    },

    hint: {
      marginTop: 10,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
    },
  });
}
