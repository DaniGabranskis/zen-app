// src/utils/consent/consentStorage.js
// Utilities for loading/saving consent in AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from './consentConfig';

/**
 * Load consent data from AsyncStorage
 * @returns {Promise<Object|null>} Consent object or null if not found/corrupted
 */
export async function loadConsent() {
  try {
    const raw = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    
    // Basic validation
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('[consent] Failed to load consent:', error?.message || error);
    return null;
  }
}

/**
 * Save consent data to AsyncStorage
 * Storage layer is the source of truth - it adds accepted, acceptedAt, version automatically
 * @param {Object} checks - Object with checks: { terms: boolean, privacy: boolean, aiMedical: boolean }
 * @returns {Promise<boolean>} Success status
 */
export async function saveConsent(checks) {
  try {
    if (!checks || typeof checks !== 'object') {
      throw new Error('Invalid checks object');
    }

    // Validate that all required checks are present and true
    if (!checks.terms || !checks.privacy || !checks.aiMedical) {
      throw new Error('All consent checks must be true');
    }

    // Storage layer adds audit-grade fields
    const data = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
      checks: {
        terms: Boolean(checks.terms),
        privacy: Boolean(checks.privacy),
        aiMedical: Boolean(checks.aiMedical),
      },
    };

    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[consent] Failed to save consent:', error?.message || error);
    return false;
  }
}

/**
 * Reset/clear consent (for dev/testing)
 * @returns {Promise<boolean>} Success status
 */
export async function resetConsent() {
  try {
    await AsyncStorage.removeItem(CONSENT_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('[consent] Failed to reset consent:', error?.message || error);
    return false;
  }
}
