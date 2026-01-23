// components/SwipeCard.js
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import useThemeVars from '../hooks/useThemeVars';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.05);
const SWIPE_THRESHOLD = 0.25 * width;

// Optional swipe-up threshold for "Not sure"
const SWIPE_UP_THRESHOLD = 0.22 * CARD_HEIGHT;

/**
 * SwipeCard — interactive card for swipe questions.
 *
 * Props:
 *   - card: { text: string, leftOption: {text, tags}, rightOption: {text, tags} }
 *   - onSwipeLeft: () => void
 *   - onSwipeRight: () => void
 *   - onNotSure?: () => void
 *   - notSureLabel?: string (default: "Not sure")
 *   - enableSwipeUpNotSure?: boolean (default: false)
 *   - onSwipeProgressChange?: (isSwiping: boolean) => void
 */
export default function SwipeCard({
  card,
  onSwipeLeft,
  onSwipeRight,
  onNotSure,
  notSureLabel = 'Not sure',
  enableSwipeUpNotSure = false,
  onSwipeProgressChange,
}) {
  const { cardBackground, textPrimary, cardChoiceText } = useThemeVars();

  // X and Y translation values (for animation)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Animated card style for reanimated
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${translateX.value * 0.0015}rad` },
      ],
    };
  });

  // Reset position when card changes
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [card]);

  // Main pan gesture handler for swiping card
  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Notify parent that swipe started (optional)
      if (onSwipeProgressChange) runOnJS(onSwipeProgressChange)(true);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      // Notify parent that swipe ended (optional)
      if (onSwipeProgressChange) runOnJS(onSwipeProgressChange)(false);

      const x = translateX.value;
      const y = translateY.value;

      // Optional "Swipe Up" as Not sure, guarded to avoid breaking left/right UX
      if (
        enableSwipeUpNotSure &&
        typeof onNotSure === 'function' &&
        y < -SWIPE_UP_THRESHOLD &&
        Math.abs(x) < SWIPE_THRESHOLD * 0.6
      ) {
        runOnJS(onNotSure)();
        return;
      }

      // If card swiped left/right enough — trigger callback
      if (x < -SWIPE_THRESHOLD) {
        runOnJS(onSwipeLeft)();
      } else if (x > SWIPE_THRESHOLD) {
        runOnJS(onSwipeRight)();
      } else {
        // Otherwise, animate card back to original position
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  return (
    <View style={styles.fullscreen}>
      <View style={styles.cardWrapper}>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: cardBackground,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                shadowColor: textPrimary,
              },
              animatedStyle,
            ]}
          >
            {/* Top label = LEFT swipe option */}
            <View style={styles.edgeTop}>
              <View style={styles.edgeRow}>
                <Icon name="chevron-left" size={20} color={cardChoiceText} />
                <Text
                  allowFontScaling={false}
                  style={[styles.edgeText, { color: cardChoiceText }]}
                  numberOfLines={2}
                >
                  {card?.leftOption?.text}
                </Text>
              </View>
            </View>

            {/* Centered question */}
            <Text style={[styles.event, { color: textPrimary }]} numberOfLines={2}>
              {card?.text}
            </Text>

            {/* Bottom label = RIGHT swipe option */}
            <View style={styles.edgeBottom}>
              <View style={styles.edgeRow}>
                <Text
                  allowFontScaling={false}
                  style={[styles.edgeText, { color: cardChoiceText }]}
                  numberOfLines={2}
                >
                  {card?.rightOption?.text}
                </Text>
                <Icon name="chevron-right" size={20} color={cardChoiceText} />
              </View>
            </View>
          </Animated.View>
        </GestureDetector>

        {/* "Not sure" CTA under the card (always available if onNotSure provided) */}
        {typeof onNotSure === 'function' ? (
          <Pressable
            onPress={onNotSure}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.notSureBtn,
              {
                backgroundColor: cardBackground, // same background as the main card
                shadowColor: textPrimary,        // match card shadow color
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.notSureText, { color: cardChoiceText }]}>
              {notSureLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 24,
    padding: width * 0.06,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  event: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  edgeTop: {
    position: 'absolute',
    top: Math.round(width * 0.1),
    left: Math.round(width * 0.0),
    right: Math.round(width * 0.04),
    alignItems: 'center',
    justifyContent: 'center',
  },
  edgeBottom: {
    position: 'absolute',
    bottom: Math.round(width * 0.1),
    left: Math.round(width * 0.04),
    right: Math.round(width * 0.0),
    alignItems: 'center',
    justifyContent: 'center',
  },
  edgeText: {
    fontSize: Math.round(width * 0.048),
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.9,
  },
  edgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Not sure button
notSureBtn: {
  position: 'absolute',
  bottom: '17%', // Position below the card (negative value places it below the card's bottom edge)
  alignSelf: 'center',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 999,

  // Shadow similar to the main card, but smaller/lighter
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,

  // Ensure it stays clickable above the card area if they ever overlap
  zIndex: 2,
},
  notSureText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
