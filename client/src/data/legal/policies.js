// src/data/legal/policies.js
// Local legal documents (Terms, Privacy, AI & Medical Disclaimer)
// Structured data for display in UI

/**
 * Policy version should align with CONSENT_VERSION conceptually
 * (or be explicitly versioned separately)
 */
const POLICY_VERSION = '1.0.0';

export const policies = {
  terms: {
    title: 'Terms of Service',
    version: POLICY_VERSION,
    sections: [
      {
        heading: '1. Acceptance of Terms',
        content: 'By accessing and using Zen, you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use the application.',
      },
      {
        heading: '2. Description of Service',
        content: 'Zen is a personal reflection and emotional awareness application. It helps you track your emotional state and provides insights based on your input. Zen is not a medical device, therapy service, or diagnostic tool.',
      },
      {
        heading: '3. User Responsibilities',
        content: 'You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You agree to provide accurate and complete information when using the service.',
      },
      {
        heading: '4. Limitations of Service',
        content: 'Zen provides general wellness information and is not intended to replace professional medical advice, diagnosis, or treatment. Always seek the advice of qualified health providers with any questions you may have regarding a medical condition.',
      },
      {
        heading: '5. Intellectual Property',
        content: 'All content, features, and functionality of Zen are owned by the application developers and are protected by copyright, trademark, and other intellectual property laws.',
      },
      {
        heading: '6. Modifications to Terms',
        content: 'We reserve the right to modify these terms at any time. Continued use of the application after changes constitutes acceptance of the modified terms.',
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    version: POLICY_VERSION,
    sections: [
      {
        heading: '1. Information We Collect',
        content: 'Zen collects information you provide directly, including emotional state data, reflection entries, and preferences. This data is stored locally on your device by default.',
      },
      {
        heading: '2. How We Use Your Information',
        content: 'Your information is used to provide personalized insights and improve your experience. We do not sell your personal data to third parties.',
      },
      {
        heading: '3. Data Storage',
        content: 'Your data is stored locally on your device using secure storage mechanisms. You can delete your data at any time through the application settings.',
      },
      {
        heading: '4. Third-Party Services',
        content: 'If you choose to use optional features that connect to third-party services, those services may have their own privacy policies. Please review them carefully.',
      },
      {
        heading: '5. Data Security',
        content: 'We implement reasonable security measures to protect your information. However, no method of transmission over the internet or electronic storage is 100% secure.',
      },
      {
        heading: '6. Your Rights',
        content: 'You have the right to access, modify, or delete your personal data at any time. You can do this through the application settings or by contacting support.',
      },
    ],
  },

  aiMedical: {
    title: 'AI & Medical Disclaimer',
    version: POLICY_VERSION,
    sections: [
      {
        heading: '1. Not a Medical Device',
        content: 'Zen is not a medical device, diagnostic tool, or treatment. It is a wellness application designed for personal reflection and emotional awareness.',
      },
      {
        heading: '2. No Medical Advice',
        content: 'The insights, suggestions, and information provided by Zen are for general wellness purposes only. They do not constitute medical, psychological, or professional health advice.',
      },
      {
        heading: '3. AI-Generated Content',
        content: 'Some content in Zen may be generated using artificial intelligence. This content is provided for informational purposes only and should not be relied upon as professional advice.',
      },
      {
        heading: '4. Limitations of AI',
        content: 'AI-generated content may contain errors or inaccuracies. Always use your judgment and consult qualified professionals for health-related decisions.',
      },
      {
        heading: '5. Emergency Situations',
        content: 'If you are experiencing a medical emergency or mental health crisis, please contact emergency services immediately. Do not rely on Zen for emergency assistance.',
      },
      {
        heading: '6. Professional Consultation',
        content: 'For any health concerns, mental health issues, or medical questions, please consult with qualified healthcare professionals. Zen cannot and does not provide medical diagnosis or treatment.',
      },
    ],
  },
};

/**
 * Get a specific policy by key
 * @param {string} key - 'terms' | 'privacy' | 'aiMedical'
 * @returns {Object|null} Policy object or null if not found
 */
export function getPolicy(key) {
  return policies[key] || null;
}

/**
 * Get all policy keys
 * @returns {string[]} Array of policy keys
 */
export function getPolicyKeys() {
  return Object.keys(policies);
}
