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
 * Normalize sections from various formats to a consistent structure
 * Supports: { h, p }, { heading, content }, { content: string }
 */
function normalizeSections(doc) {
  if (!doc) return [];

  // English comments only:
  // Support multiple legacy/new formats to avoid silent empty content.
  if (Array.isArray(doc.sections)) {
    return doc.sections.map((s) => {
      const heading = s?.h ?? s?.heading ?? '';
      const paragraphsRaw = s?.p ?? s?.content ?? s?.text ?? '';
      const paragraphs = Array.isArray(paragraphsRaw)
        ? paragraphsRaw.filter(Boolean)
        : String(paragraphsRaw || '')
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean);

      return { heading, paragraphs };
    }).filter((x) => x.heading || x.paragraphs.length);
  }

  // If doc has a single `content` string
  if (typeof doc.content === 'string' && doc.content.trim()) {
    return [{
      heading: '',
      paragraphs: doc.content.split('\n').map((x) => x.trim()).filter(Boolean),
    }];
  }

  return [];
}

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
  const sections = normalizeSections(doc);

  // Debug: log sections to verify normalization
  React.useEffect(() => {
    if (visible && doc) {
      console.log('[LegalDocModal] Doc title:', doc.title);
      console.log('[LegalDocModal] Sections normalized:', sections.length);
      console.log('[LegalDocModal] First section:', sections[0]);
    }
  }, [visible, doc, sections]);

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
            style={s.body}
            contentContainerStyle={s.bodyContent}
            showsVerticalScrollIndicator={true}
          >
            {sections.length === 0 ? (
              <Text style={[s.emptyText, { color: t.textSecondary }]}>
                No content available.
              </Text>
            ) : (
              sections.map((s, idx) => (
                <View key={`${idx}-${s.heading}`} style={s.section}>
                  {s.heading ? (
                    <Text style={[s.sectionHeading, { color: t.textPrimary }]}>{s.heading}</Text>
                  ) : null}

                  {s.paragraphs.map((para, pIdx) => (
                    <Text
                      key={`${idx}-${pIdx}`}
                      style={[s.paragraph, { color: t.textSecondary }]}
                    >
                      {para}
                    </Text>
                  ))}
                </View>
              ))
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
    flexDirection: 'column',
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
  bodyContainer: {
    flex: 1,
    minHeight: 200,
  },
  body: {
    flex: 1,
    width: '100%',
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  section: {
    marginTop: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
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
