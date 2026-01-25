// src/utils/consent/consentStorage.js
// Utilities for loading/saving consent in AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONSENT_STORAGE_KEY } from './consentConfig';

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
 * @param {Object} consent - Consent object with acceptedAt, version, checks
 * @returns {Promise<boolean>} Success status
 */
export async function saveConsent(consent) {
  try {
    if (!consent || typeof consent !== 'object') {
      throw new Error('Invalid consent object');
    }

    const data = {
      accepted: true,
      acceptedAt: consent.acceptedAt || new Date().toISOString(),
      version: consent.version,
      checks: consent.checks || {},
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
