// src/components/DischargeReflectionControl.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const REASONS = [
  { key: 'not_match_feel', label: "It's not what I feel" },
  { key: 'emotion_wrong', label: 'Emotion feels wrong' },
  { key: 'questions_off', label: 'Questions did not fit my day' },
  { key: 'too_complicated', label: 'Flow is too complicated / confusing' },
  { key: 'other', label: 'Something else' },
];

function makeStyles(t) {
  return StyleSheet.create({
    iconWrap: {
      marginLeft: 12,
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.cardBackground,
      borderWidth: 1,
      borderColor: '#00000022',
    },
    iconText: {
      fontSize: 20,
      lineHeight: 20,
      color: t.textPrimary,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },

    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      borderRadius: 16,
      backgroundColor: t.cardBackground,
      padding: 16,
      borderWidth: 1,
      borderColor: '#00000022',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: t.textPrimary,
      marginBottom: 8,
    },
    modalText: {
      fontSize: 14,
      color: t.textSecondary,
      marginBottom: 16,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 4,
    },
    btn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
    },
    btnSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#00000033',
      marginRight: 8,
    },
    btnSecondaryText: {
      color: t.textPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    btnPrimary: {
      backgroundColor: t.accent,
    },
    btnPrimaryText: {
      color: t.buttonPrimaryText || '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },

    reasonPill: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#00000022',
      marginBottom: 8,
      backgroundColor:
        t.themeName === 'dark' ? '#FFFFFF0F' : '#00000005',
    },
    reasonText: {
      fontSize: 14,
      color: t.textPrimary,
    },
    skipBtn: {
      marginTop: 8,
      alignSelf: 'flex-end',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    skipBtnText: {
      fontSize: 13,
      fontWeight: '500',
      color: t.textSecondary,
      textDecorationLine: 'underline',
    },
  });
}

const DischargeReflectionControl = ({ theme, onDischarge }) => {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const handleDischarge = (reasonKey) => {
    console.log('[DischargeReflection] reason:', reasonKey || 'skip');
    setFeedbackVisible(false);
    setConfirmVisible(false);
    if (typeof onDischarge === 'function') {
      onDischarge(reasonKey || 'skip');
    }
  };

  return (
    <>
      {/* Top-right button with cross in circle */}
      <TouchableOpacity
        style={styles.iconWrap}
        onPress={() => setConfirmVisible(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>×</Text>
        </View>
      </TouchableOpacity>

      {/* Modal #1: confirm discharge */}
      <Modal
        transparent
        animationType="fade"
        visible={confirmVisible}
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Discharge reflection?</Text>
            <Text style={styles.modalText}>
              Do you want to discharge this reflection? It will not be saved to your
              history.
            </Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.btnSecondaryText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={() => {
                  setConfirmVisible(false);
                  setFeedbackVisible(true);
                }}
              >
                <Text style={styles.btnPrimaryText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal #2: feedback reasons + Skip */}
      <Modal
        transparent
        animationType="fade"
        visible={feedbackVisible}
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Why do you want to discharge?
            </Text>
            <Text style={styles.modalText}>
              Pick one option so we can improve this reflection flow in the future.
            </Text>

            {REASONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={styles.reasonPill}
                onPress={() => handleDischarge(r.key)}
              >
                <Text style={styles.reasonText}>{r.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => handleDischarge('skip')}
            >
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default DischargeReflectionControl;
