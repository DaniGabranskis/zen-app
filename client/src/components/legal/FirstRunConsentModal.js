import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import useThemeVars from '../../hooks/useThemeVars';
import { legalDocs } from '../../data/legal/policies';
import { saveConsent, loadConsent } from '../../utils/consent/consentStorage';
import { CONSENT_VERSION } from '../../utils/consent/consentConfig';
import LegalDocModal from './LegalDocModal';

function getSafeTheme(t) {
  // English comments only:
  // Provide safe fallbacks so text never becomes invisible due to missing theme keys.
  // Use theme-aware defaults based on themeName
  const isDark = t?.themeName === 'dark';
  
  return {
    bg: t?.background ?? (isDark ? '#222224' : '#FAFAFB'),
    card: t?.cardBackground ?? (isDark ? '#484852' : '#FFFFFF'),
    text: t?.textPrimary ?? (isDark ? '#FFFFFF' : '#1A1A1A'),
    textSecondary: t?.textSecondary ?? (isDark ? '#BBBBBB' : '#999999'),
    border: t?.dividerColor ?? (isDark ? '#3F3F4A' : '#E0E0E0'),
    brand: t?.accent ?? (isDark ? '#7C62FF' : '#A78BFA'),
    muted: t?.background ?? (isDark ? '#222224' : '#FAFAFB'),
  };
}

function CheckboxRow({ checked, label, onToggle, onView, colors }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onToggle} style={styles.rowLeft} hitSlop={10}>
        <View
          style={[
            styles.checkbox,
            { borderColor: colors.border, backgroundColor: checked ? colors.brand : 'transparent' },
          ]}
        >
          {checked ? <Text style={[styles.checkmark, { color: '#FFFFFF' }]}>✓</Text> : null}
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      </Pressable>

      <Pressable onPress={onView} style={[styles.viewBtn, { borderColor: colors.border }]} hitSlop={10}>
        <Text style={[styles.viewBtnText, { color: colors.textSecondary }]}>View</Text>
      </Pressable>
    </View>
  );
}

export default function FirstRunConsentModal({ visible, onAccepted }) {
  const t = useThemeVars();
  const colors = useMemo(() => getSafeTheme(t), [t]);

  const [checks, setChecks] = useState({
    terms: false,
    privacy: false,
    aiMedical: false,
  });

  const [openDocKey, setOpenDocKey] = useState(null);

  const allChecked = checks.terms && checks.privacy && checks.aiMedical;

  const onToggle = (key) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onStart = async () => {
    if (!allChecked) return;

    // Save consent - storage layer adds accepted, acceptedAt, version
    const saved = await saveConsent(checks);

    if (saved && typeof onAccepted === 'function') {
      // Load the saved consent to get the full audit-grade payload
      const savedConsent = await loadConsent();
      onAccepted(savedConsent);
      // Reset state for next time (if version changes)
      setChecks({
        terms: false,
        privacy: false,
        aiMedical: false,
      });
    }
  };

  // Guarantee content is always rendered when visible === true
  // No early returns or conditional rendering that would hide content
  if (!visible) {
    return null;
  }

  return (
    <Modal visible={!!visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: colors.text }]}>Welcome to Zen</Text>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Zen helps you track emotional state patterns and build healthier self-reflection habits.
            </Text>

            <View style={[styles.infoBox, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Important</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Zen is not a medical device and does not provide medical advice, diagnosis, or treatment.
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Agreements</Text>

            <CheckboxRow
              checked={checks.terms}
              label={`I agree to the Terms of Service (v${legalDocs.terms?.version || CONSENT_VERSION})`}
              onToggle={() => onToggle('terms')}
              onView={() => setOpenDocKey('terms')}
              colors={colors}
            />

            <CheckboxRow
              checked={checks.privacy}
              label={`I agree to the Privacy Policy (v${legalDocs.privacy?.version || CONSENT_VERSION})`}
              onToggle={() => onToggle('privacy')}
              onView={() => setOpenDocKey('privacy')}
              colors={colors}
            />

            <CheckboxRow
              checked={checks.aiMedical}
              label={`I understand and agree to the AI & Medical Disclaimer (v${legalDocs.aiMedical?.version || CONSENT_VERSION})`}
              onToggle={() => onToggle('aiMedical')}
              onView={() => setOpenDocKey('aiMedical')}
              colors={colors}
            />

            <Text style={[styles.clickwrap, { color: colors.textSecondary }]}>
              By tapping "Let's get started!", you agree to the Terms, Privacy Policy, and AI & Medical Disclaimer.
            </Text>

            <Pressable
              onPress={onStart}
              disabled={!allChecked}
              style={[
                styles.startBtn,
                {
                  backgroundColor: allChecked ? colors.brand : colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.startBtnText, { color: allChecked ? '#FFFFFF' : colors.textSecondary }]}>
                Let's get started!
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      <LegalDocModal
        visible={!!openDocKey}
        doc={openDocKey ? legalDocs[openDocKey] : null}
        onClose={() => setOpenDocKey(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: -1,
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  viewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 10,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clickwrap: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 16,
  },
  startBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
