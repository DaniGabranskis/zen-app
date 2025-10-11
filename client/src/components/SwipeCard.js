// components/SwipeCard.js
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
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

/**
 * SwipeCard — interactive card for swipe questions (used in L1 and L2).
 * Handles left/right swipes to select emotional answers.
 * Props:
 *   - card: { text: string, options: { ... } }
 *   - onSwipeLeft: function() (called on left swipe)
 *   - onSwipeRight: function() (called on right swipe)
 *   - onSwipeProgressChange: function(isSwiping: bool) (optional, for parent animations)
 */

export default function SwipeCard({ card, onSwipeLeft, onSwipeRight, onSwipeProgressChange }) {
  const { cardBg, textMain, card_choice_text } = useThemeVars();

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

    // If card swiped left/right enough — trigger callback
    if (translateX.value < -SWIPE_THRESHOLD) {
      runOnJS(onSwipeLeft)();
    } else if (translateX.value > SWIPE_THRESHOLD) {
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
        <Animated.View style={[
            styles.card,
            {
              backgroundColor: cardBg,
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              shadowColor: textMain,
            },
            animatedStyle,
          ]}>
            {/* Main question text */}
          {/* Top label = LEFT swipe option */}
          <View style={styles.edgeTop}>
          <View style={styles.edgeRow}>
            <Icon name="chevron-left" size={20} color={card_choice_text} />
            <Text
              allowFontScaling={false}
              style={[styles.edgeText, { color: card_choice_text }]}
              numberOfLines={2}
            >
              {card?.leftOption?.text}
            </Text>
          </View>
        </View>

          {/* Centered question */}
          <Text style={styles.event} numberOfLines={2}>
            {card?.text}
          </Text>

          {/* Bottom label = RIGHT swipe option */}
          <View style={styles.edgeBottom}>
          <View style={styles.edgeRow}>
            <Text
              allowFontScaling={false}
              style={[styles.edgeText, { color: card_choice_text }]}
              numberOfLines={2}
            >
              {card?.rightOption?.text}
            </Text>
            <Icon name="chevron-right" size={20} color={card_choice_text} />
          </View>
        </View>
        </Animated.View>
      </GestureDetector>
    </View>
  </View>
);
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: width * 0.06,
    shadowColor: '#000',
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
    color: '#1A1A1A',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  optionStack: {
    width: '100%',
    alignItems: 'center',
    marginVertical: Math.round(width * 0.03),
    gap: Math.round(width * 0.015),
  },
  optionLeft: {
    fontSize: Math.round(width * 0.038),
    color: '#444',
    textAlign: 'left',
    width: '100%',
    alignSelf: 'flex-start',
    paddingLeft: Math.round(width * 0.03),
    flexWrap: 'wrap',
  },
  optionRight: {
    fontSize: Math.round(width * 0.038),
    color: '#444',
    textAlign: 'right',
    width: '100%',
    alignSelf: 'flex-end',
    paddingRight: Math.round(width * 0.03),
    flexWrap: 'wrap',
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
    gap: 6, // небольшой отступ между стрелкой и текстом
  },
});
