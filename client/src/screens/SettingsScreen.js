import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';
import ScreenWrapper from '../components/ScreenWrapper';
import { resetConsent, loadConsent } from '../utils/consent/consentStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const P = Math.round(SCREEN_WIDTH * 0.05);
const P_LARGE = Math.round(SCREEN_WIDTH * 0.08);

/**
 * SettingsScreen — app settings and options.
 * Allows changing theme and clearing all history.
 */
export default function SettingsScreen({ navigation }) {
  // Theme colors for this screen
  const {
    background,
    textPrimary,
    textSecondary,
    cardBackground,
    dividerColor,
    dangerBackground,
    dangerText,
    themeName,
  } = useThemeVars();

    const rowDividerColor =
      themeName === 'light'
        ? 'rgba(0,0,0,0.06)'
        : 'rgba(255,255,255,0.16)';

  // Store methods: reset history
  const resetHistory = useStore((state) => state.resetHistory);

  // Shows alert confirmation before clearing all data
  const confirmReset = () => {
    Alert.alert(
      'Clear all history',
      'This will delete all your reflections permanently. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: resetHistory },
      ]
    );
  };

  // Dev utility: Reset consent (for testing)
  const handleResetConsent = async () => {
    Alert.alert(
      'Reset Consent (Dev)',
      'This will clear your consent and show the consent modal again on next app restart. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const success = await resetConsent();
            if (success) {
              Alert.alert(
                'Consent Reset',
                'Consent has been cleared. The consent modal will appear on next app restart.',
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert(
                'Error',
                'Failed to reset consent. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  // Dev utility: Print consent (for verification)
  const handlePrintConsent = async () => {
    const consent = await loadConsent();
    if (consent) {
      console.log('[consent] Current consent payload:', JSON.stringify(consent, null, 2));
      Alert.alert(
        'Consent Payload (Dev)',
        JSON.stringify(consent, null, 2),
        [{ text: 'OK' }]
      );
    } else {
      console.log('[consent] No consent found');
      Alert.alert(
        'Consent Payload (Dev)',
        'No consent found. Consent modal will appear on next app restart.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: textPrimary }]}>Settings</Text>
        <View style={[styles.divider, { backgroundColor: rowDividerColor }]} />
      </View>

      <View style={styles.content}>
        {/* P0: Personalize reflection windows */}
        <TouchableOpacity
          style={[
            styles.option,
            { borderTopWidth: 1, borderTopColor: rowDividerColor },
          ]}
          onPress={() => {
            // Navigate to Personalize screen
            if (navigation) {
              navigation.navigate('Personalize');
            }
          }}
        >
          <Text style={[styles.optionText, { color: textPrimary }]}>
            Personalize
          </Text>
        </TouchableOpacity>

        {/* Privacy Policy stub (no action yet) */}
        <TouchableOpacity
          style={[styles.option, { borderBottomColor: rowDividerColor }]}
          onPress={() => {
            // TODO: Show privacy policy screen
          }}
        >
          <Text style={[styles.optionText, { color: textPrimary }]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>

        {/* Feedback stub (no action yet) */}
        <TouchableOpacity
          style={[styles.option, { borderBottomColor: rowDividerColor }]}
          onPress={() => {
            // TODO: Send feedback
          }}
        >
          <Text style={[styles.optionText, { color: textPrimary }]}>
            Send Feedback
          </Text>
        </TouchableOpacity>

        {/* Divider and version number */}
        <View style={[styles.divider, { backgroundColor: rowDividerColor }]} />
        <Text style={[styles.version, { color: textSecondary }]}>
          Version 1.0.0
        </Text>

        {/* Button to clear all history, with confirmation */}
        <TouchableOpacity
          style={[
            styles.clearButton,
            { backgroundColor: dangerBackground },
          ]}
          onPress={confirmReset}
        >
          <Text
            style={[
              styles.clearText,
              { color: dangerText },
            ]}
          >
            🗑 Clear reflection history
          </Text>
        </TouchableOpacity>

        {/* Dev utilities: only visible in development */}
        {__DEV__ ? (
          <>
            <TouchableOpacity
              style={[
                styles.devButton,
                { backgroundColor: cardBackground, borderColor: dividerColor },
              ]}
              onPress={handleResetConsent}
            >
              <Text
                style={[
                  styles.devText,
                  { color: textSecondary },
                ]}
              >
                🔧 Reset consent (dev)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.devButton,
                { backgroundColor: cardBackground, borderColor: dividerColor },
              ]}
              onPress={handlePrintConsent}
            >
              <Text
                style={[
                  styles.devText,
                  { color: textSecondary },
                ]}
              >
                📄 Print consent (dev)
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </ScreenWrapper>
  );
}

// ======= RESPONSIVE STYLES =======
const styles = StyleSheet.create({
  container: {
    minHeight: '100%',
    flex: 1,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: P_LARGE,
    marginTop: P_LARGE,
  },
  title: {
    fontSize: Math.round(SCREEN_WIDTH * 0.08),
    fontWeight: '800',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: P,
  },
  divider: {
    height: 1,
    width: Math.round(SCREEN_WIDTH * 0.5),
    alignSelf: 'center', 
    marginBottom: P_LARGE,
    borderRadius: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    paddingHorizontal: P_LARGE,
    paddingBottom: P_LARGE,
  },
  option: {
    paddingVertical: Math.round(SCREEN_WIDTH * 0.048),
    borderBottomWidth: 1,
    minHeight: Math.round(SCREEN_WIDTH * 0.12),
    justifyContent: 'center',
  },
  optionText: {
    fontSize: Math.round(SCREEN_WIDTH * 0.042),
  },
  clearButton: {
    marginTop: P_LARGE,
    padding: Math.round(SCREEN_WIDTH * 0.04),
    borderRadius: Math.round(SCREEN_WIDTH * 0.03),
    alignItems: 'center',
  },
  clearText: {
    fontWeight: '700',
    fontSize: Math.round(SCREEN_WIDTH * 0.045),
  },
  version: {
    fontSize: Math.round(SCREEN_WIDTH * 0.037),
    textAlign: 'center',
    marginTop: Math.round(P_LARGE * 0.7),
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  devButton: {
    marginTop: P,
    padding: Math.round(SCREEN_WIDTH * 0.04),
    borderRadius: Math.round(SCREEN_WIDTH * 0.03),
    alignItems: 'center',
    borderWidth: 1,
  },
  devText: {
    fontWeight: '600',
    fontSize: Math.round(SCREEN_WIDTH * 0.04),
  },
});
