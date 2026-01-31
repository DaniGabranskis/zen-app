// profiles.js (Task P2.3, P2.25)
// User response profiles for realistic simulation
// Comments in English only.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for smoke calibration data (P2.25)
let smokeCalibrationCache = null;

/**
 * Load smoke calibration data (P2.25)
 */
function loadSmokeCalibration(calibPath) {
  if (smokeCalibrationCache) return smokeCalibrationCache;
  
  if (!calibPath) {
    // Try default path
    calibPath = path.join(__dirname, 'out', 'smoke_calibration.json');
  }
  
  if (!fs.existsSync(calibPath)) {
    console.warn(`[profiles] Smoke calibration file not found: ${calibPath}, using default mix profile`);
    return null;
  }
  
  try {
    const content = fs.readFileSync(calibPath, 'utf8');
    smokeCalibrationCache = JSON.parse(content);
    console.log(`[profiles] Loaded smoke calibration from: ${calibPath}`);
    return smokeCalibrationCache;
  } catch (e) {
    console.warn(`[profiles] Failed to load smoke calibration: ${e.message}, using default mix profile`);
    return null;
  }
}

/**
 * Sample user answer based on profile and card characteristics.
 * @param {Object} card - Card object with id, options, etc.
 * @param {string} profile - Profile name ('decisive', 'uncertain', 'somatic', 'cognitive', 'mix', 'smoke-calibrated')
 * @param {Function} rng - Random number generator (0-1)
 * @param {string} smokeCalibPath - Optional path to smoke calibration JSON (for smoke-calibrated profile)
 * @returns {'A'|'B'|'NS'} Answer choice
 */
export function sampleAnswer(card, profile, rng, smokeCalibPath = null) {
  // Handle smoke-calibrated profile (P2.25)
  if (profile === 'smoke-calibrated') {
    const calib = loadSmokeCalibration(smokeCalibPath);
    if (calib) {
      // Use calibrated notSureRate
      const notSureRate = (calib.notSureRate || 25) / 100;
      if (rng() < notSureRate) {
        return 'NS';
      }
      // Otherwise use 50/50 (can be enhanced with calibrated bias if available)
      return rng() < 0.5 ? 'A' : 'B';
    } else {
      // Fallback to mix if calibration not available
      profile = 'mix';
    }
  }
  
  // Handle mix profile by randomly selecting a sub-profile
  let effectiveProfile = profile;
  if (profile === 'mix') {
    const subProfiles = ['decisive', 'uncertain', 'somatic', 'cognitive'];
    effectiveProfile = subProfiles[Math.floor(rng() * subProfiles.length)];
  }
  
  // Get profile-specific notSureRate
  const profileRates = {
    decisive: 0.10,
    uncertain: 0.35,
    somatic: 0.20,
    cognitive: 0.20,
    mix: 0.25, // Fallback (shouldn't be used if mix is handled above)
  };
  
  const notSureRate = profileRates[effectiveProfile] || 0.25;
  
  // Check for "not sure" first
  if (rng() < notSureRate) {
    return 'NS';
  }
  
  // Otherwise choose A or B with potential bias
  const bias = getProfileBias(card, effectiveProfile);
  if (bias === 'A') {
    return rng() < 0.7 ? 'A' : 'B'; // 70% A, 30% B
  } else if (bias === 'B') {
    return rng() < 0.3 ? 'A' : 'B'; // 30% A, 70% B
  }
  
  // Default: 50/50
  return rng() < 0.5 ? 'A' : 'B';
}

/**
 * Get profile-specific bias for a card.
 * @param {Object} card - Card object
 * @param {string} profile - Profile name
 * @returns {'A'|'B'|null} Bias direction or null for neutral
 */
function getProfileBias(card, profile) {
  const cardId = String(card?.id || '').toLowerCase();
  const cardCategory = card?.cluster || card?.meta?.group || '';
  
  // Somatic profile: prefers body-related options
  if (profile === 'somatic') {
    if (cardId.includes('body') || cardId.includes('energy') || cardId.includes('pressure')) {
      // Somatic users often choose options that lead to body tags
      // This is a simplified heuristic - can be enhanced with actual tag analysis
      return 'A'; // Bias towards first option (often body-related)
    }
  }
  
  // Cognitive profile: prefers cognitive-related options
  if (profile === 'cognitive') {
    if (cardId.includes('clarity') || cardId.includes('control') || cardId.includes('expect')) {
      // Cognitive users prefer options leading to rumination/scattered/blank tags
      return 'A'; // Simplified heuristic
    }
  }
  
  // Uncertain profile: slightly more likely to choose "unknown" patterns
  // This is handled via higher notSureRate, but can also bias towards certain options
  if (profile === 'uncertain') {
    // No specific bias, but higher NS rate already handled
  }
  
  // Decisive profile: no bias (already has low NS rate)
  
  return null; // No bias
}

/**
 * Get profile metadata for reporting.
 */
export function getProfileMetadata(profile, smokeCalibPath = null) {
  // Handle smoke-calibrated profile (P2.25)
  if (profile === 'smoke-calibrated') {
    const calib = loadSmokeCalibration(smokeCalibPath);
    if (calib) {
      return {
        name: 'smoke-calibrated',
        notSureRate: (calib.notSureRate || 25) / 100,
        description: `Calibrated from ${calib.totalSessions} real smoke sessions`,
        calibration: calib,
      };
    }
  }
  
  const profiles = {
    decisive: {
      name: 'decisive',
      notSureRate: 0.10,
      description: 'Low uncertainty, clear choices',
    },
    uncertain: {
      name: 'uncertain',
      notSureRate: 0.35,
      description: 'High uncertainty, frequent "not sure"',
    },
    somatic: {
      name: 'somatic',
      notSureRate: 0.20,
      description: 'Body-focused responses',
    },
    cognitive: {
      name: 'cognitive',
      notSureRate: 0.20,
      description: 'Cognitive/mental state focused',
    },
    mix: {
      name: 'mix',
      notSureRate: 0.25,
      description: 'Mixed profile distribution',
    },
  };
  
  return profiles[profile] || profiles.mix;
}
