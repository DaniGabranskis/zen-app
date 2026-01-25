// src/utils/consent/consentConfig.js
// Consent version configuration

/**
 * Current consent version.
 * Increment this when policies change to force re-consent.
 */
export const CONSENT_VERSION = '1.0.0';

/**
 * Storage key for consent data in AsyncStorage
 */
export const CONSENT_STORAGE_KEY = 'zen_app_consent';

/**
 * Determines if consent modal should be shown
 * @param {Object|null} consent - Consent object from storage (or null)
 * @returns {boolean} true if consent modal should be shown
 */
export function needsConsent(consent) {
  // If no consent data exists, show modal
  if (!consent) {
    return true;
  }

  // If consent was not accepted, show modal
  if (consent.accepted !== true) {
    return true;
  }

  // If version mismatch, show modal (force re-consent)
  if (consent.version !== CONSENT_VERSION) {
    return true;
  }

  // If data is corrupted (missing required fields), fail-safe: show modal
  if (!consent.acceptedAt || !consent.version) {
    return true;
  }

  // All checks passed - no need to show modal
  return false;
}
