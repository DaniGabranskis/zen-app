import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// English-only comments as requested.

/**
 * Grounding: 3 mini tasks (2-step flow)
 * Step 1 (write): user drafts 3 tasks
 * Step 2 (check): user checks them off
 *
 * Design goals:
 * - Bigger inputs + check circles
 * - More spacing (less dense)
 * - No heavy borders/dividers inside the card
 * - Input and text share identical typography to hide "mode switch"
 * - Use brand accent #A78BFA for check fill
 */

function FilledCheckCircle({ checked, size, color, offColor }) {
  const strokeW = 3.2;

  // English-only comment: No borders in Zen style; unchecked state is a soft filled circle.
  const fallbackOff = '#E0E0E0';
  const bg = checked ? color : (offColor || fallbackOff);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      {checked ? (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Path
            d="M7 15L12 20L21 8"
            stroke="#fff"
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </View>
  );
}

export function GroundingMiniTasksStep({ theme, state, setState, step, stepIndex }) {
  const t = theme || {};
  const s = useMemo(() => makeStyles(t), [t]);

  // Brand accent (forced as requested).
  const accent = '#A78BFA';

  const tasks = Array.isArray(state?.tasks)
    ? state.tasks
    : [
        { text: '', done: false },
        { text: '', done: false },
        { text: '', done: false },
      ];

  const mode = String(step?.mode || (stepIndex === 0 ? 'write' : 'check'));
  const isWrite = mode === 'write';

  const remainingFields = tasks.reduce(
    (acc, it) => acc + (String(it?.text || '').trim().length ? 0 : 1),
    0
  );

  const remainingTasks = tasks.reduce((acc, it) => acc + (it?.done ? 0 : 1), 0);

  const setTaskText = (index, value) => {
    setState((prev) => {
      const prevTasks = Array.isArray(prev?.tasks) ? prev.tasks : tasks;
      const next = prevTasks.map((it, i) => {
        if (i !== index) return it;
        return { ...(it || {}), text: String(value || '') };
      });

      return { ...(prev || {}), tasks: next };
    });
  };

  const toggleDone = (index) => {
    setState((prev) => {
      const prevTasks = Array.isArray(prev?.tasks) ? prev.tasks : tasks;
      const next = prevTasks.map((it, i) => {
        if (i !== index) return it;
        return { ...(it || {}), done: !it?.done };
      });

      return { ...(prev || {}), tasks: next };
    });
  };

  return (
    <View>
      <Text style={[s.kicker, { color: t.textSub }]}>
        {isWrite ? 'Set a calmer tone for the evening' : 'Keep it simple — finish what you wrote'}
      </Text>

      <View style={s.list}>
        {tasks.map((item, idx) => {
          const text = String(item?.text || '');
          const isDone = !!item?.done;

          const textStyle = [
            s.taskText,
            { color: t.textMain },
            !isWrite && isDone ? s.taskTextDone : null,
          ];

          return (
            <View key={`task-${idx}`} style={s.row}>
              {/* Keep left slot consistent across steps to avoid layout jumps */}
              {isWrite ? (
                <View style={s.leftSlot}>
                    <FilledCheckCircle
                    checked={false}
                    size={s.circleBase.width}
                    color={accent}
                    offColor={t.navBorder || t.dividerColor}
                    />
                </View>
              ) : (
                <TouchableOpacity
                  style={s.leftSlot}
                  onPress={() => toggleDone(idx)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={isDone ? 'Mark as not done' : 'Mark as done'}
                >
                <FilledCheckCircle
                    checked={isDone}
                    size={s.circleBase.width}
                    color={accent}
                    offColor={t.navBorder || t.dividerColor}
                />
                </TouchableOpacity>
              )}

              {isWrite ? (
                <TextInput
                  value={text}
                  onChangeText={(v) => setTaskText(idx, v)}
                  placeholder={`Mini task ${idx + 1}`}
                  placeholderTextColor={t.textSub}
                  style={textStyle}
                  autoCorrect={false}
                  autoCapitalize="sentences"
                  returnKeyType={idx === 2 ? 'done' : 'next'}
                  underlineColorAndroid="transparent"
                  selectionColor={accent}
                />
              ) : (
                <Text style={textStyle} numberOfLines={2}>
                  {text}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={s.counterWrap}>
        {isWrite ? (
          <Text style={[s.counterText, { color: t.textSub }]}>
            Remaining to write: {Math.max(0, remainingFields)}
          </Text>
        ) : (
          <Text style={[s.counterText, { color: t.textSub }]}>
            Remaining to finish: {Math.max(0, remainingTasks)}
          </Text>
        )}
      </View>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    kicker: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 14,
    },

    list: {
      // Avoid relying on gap in case of RN version differences.
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 54,
      marginBottom: 20,
    },

    leftSlot: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 18,
    },

    // Used as a "source of truth" for circle size in the component.
    circleBase: {
      width: 36,
      height: 36,
    },

    // Shared typography for BOTH TextInput and Text to hide the mode switch.
    taskText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '800',
      paddingVertical: 0,
      paddingHorizontal: 0,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },

    taskTextDone: {
      textDecorationLine: 'line-through',
      opacity: 0.55,
    },

    // No hard divider line — only spacing.
    counterWrap: {
      marginTop: 8,
    },

    counterText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
  });
}
