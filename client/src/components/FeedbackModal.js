// FeedbackModal.js (AJ2 - Ground Truth Lite)
// Simple feedback modal for user validation of state classification

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeVars from '../hooks/useThemeVars';

/**
 * Feedback modal for user validation
 * @param {Object} props
 * @param {boolean} props.visible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSubmit - Submit handler (rating, closestState)
 * @param {string} props.stateKey - Current state key
 * @param {string|null} props.microKey - Current micro key (if any)
 */
export default function FeedbackModal({
  visible,
  onClose,
  onSubmit,
  stateKey,
  microKey,
}) {
  const t = useThemeVars();
  const [rating, setRating] = useState(null);
  const [closestState, setClosestState] = useState(null);
  
  // Cluster-based closest states (4-6 options)
  const getClosestStates = (currentState) => {
    const clusters = {
      stress: ['pressured', 'blocked', 'overloaded'],
      low_energy: ['exhausted', 'down', 'averse', 'detached'],
      positive: ['grounded', 'engaged', 'connected', 'capable'],
    };
    
    // Find cluster for current state
    let cluster = 'stress';
    if (clusters.low_energy.includes(currentState)) cluster = 'low_energy';
    if (clusters.positive.includes(currentState)) cluster = 'positive';
    
    // Return states from same cluster (excluding current)
    return clusters[cluster].filter(s => s !== currentState);
  };
  
  const closestStates = getClosestStates(stateKey);
  
  const handleSubmit = () => {
    if (rating !== null) {
      onSubmit({
        rating,
        closestState: rating < 4 ? closestState : null,
        stateKey,
        microKey,
      });
      setRating(null);
      setClosestState(null);
    }
  };
  
  const handleSkip = () => {
    onClose();
    setRating(null);
    setClosestState(null);
  };
  
  const s = makeStyles(t);
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={s.overlay}>
        <View style={[s.modal, { backgroundColor: t.cardBackground }]}>
          <Text style={[s.title, { color: t.textPrimary }]}>
            Насколько это попало?
          </Text>
          
          {/* Rating buttons (1-5) */}
          <View style={s.ratingRow}>
            {[1, 2, 3, 4, 5].map(num => (
              <TouchableOpacity
                key={num}
                style={[
                  s.ratingButton,
                  rating === num && { backgroundColor: t.accent },
                  { borderColor: t.dividerColor || '#00000033' },
                ]}
                onPress={() => setRating(num)}
              >
                <Text
                  style={[
                    s.ratingText,
                    { color: rating === num ? (t.themeName === 'dark' ? '#000000' : '#FFFFFF') : t.textPrimary },
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Closest state selection (if rating < 4) */}
          {rating !== null && rating < 4 && (
            <View style={s.closestSection}>
              <Text style={[s.subtitle, { color: t.textSecondary }]}>
                Если мимо — что ближе?
              </Text>
              <View style={s.closestRow}>
                {closestStates.map(state => (
                  <TouchableOpacity
                    key={state}
                    style={[
                      s.closestButton,
                      closestState === state && { backgroundColor: t.accent },
                      { borderColor: t.dividerColor || '#00000033' },
                    ]}
                    onPress={() => setClosestState(state)}
                  >
                    <Text
                      style={[
                        s.closestText,
                        { color: closestState === state ? (t.themeName === 'dark' ? '#000000' : '#FFFFFF') : t.textPrimary },
                      ]}
                    >
                      {state.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
          {/* Action buttons */}
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={[s.skipButton, { borderColor: t.dividerColor || '#00000033' }]}
              onPress={handleSkip}
            >
              <Text style={[s.skipText, { color: t.textSecondary }]}>Пропустить</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                s.submitButton,
                { backgroundColor: rating !== null ? t.accent : t.dividerColor },
                rating === null && { opacity: 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={rating === null}
            >
              <Text
                style={[
                  s.submitText,
                  { color: rating !== null ? (t.themeName === 'dark' ? '#000000' : '#FFFFFF') : t.textSecondary },
                ]}
              >
                Отправить
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  ratingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 20,
    fontWeight: '600',
  },
  closestSection: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  closestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  closestButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    margin: 4,
  },
  closestText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
