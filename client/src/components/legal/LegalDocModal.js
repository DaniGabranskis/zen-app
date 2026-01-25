// src/components/legal/LegalDocModal.js
// Modal for viewing legal documents (Terms, Privacy, AI & Medical Disclaimer)

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeVars from '../../hooks/useThemeVars';

/**
 * LegalDocModal - Displays a legal document with title, version, and sections
 * @param {Object} props
 * @param {boolean} props.visible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.doc - Document object with title, version, sections[]
 */
export default function LegalDocModal({ visible, onClose, doc }) {
  const t = useThemeVars();

  // Safety check: don't render if no doc or not visible
  if (!visible || !doc) {
    return null;
  }

  const s = makeStyles(t);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={[s.modal, { backgroundColor: t.cardBackground }]}>
          {/* Header */}
          <View style={s.header}>
            <Text style={[s.title, { color: t.textPrimary }]}>
              {doc.title}
            </Text>
            <Text style={[s.version, { color: t.textSecondary }]}>
              Version {doc.version}
            </Text>
            <TouchableOpacity
              style={s.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={t.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={s.scrollView}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {doc.sections && doc.sections.length > 0 ? (
              doc.sections.map((section, index) => (
                <View key={index} style={s.section}>
                  <Text style={[s.sectionHeading, { color: t.textPrimary }]}>
                    {section.heading}
                  </Text>
                  <Text style={[s.sectionContent, { color: t.textSecondary }]}>
                    {section.content}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[s.emptyText, { color: t.textSecondary }]}>
                No content available.
              </Text>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity
              style={[s.closeButtonLarge, { backgroundColor: t.accent }]}
              onPress={onClose}
            >
              <Text style={s.closeButtonText}>Close</Text>
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
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.dividerColor,
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  version: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.dividerColor,
  },
  closeButtonLarge: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
