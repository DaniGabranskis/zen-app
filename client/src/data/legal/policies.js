// src/data/legal/policies.js
// Local legal documents (Terms, Privacy, AI & Medical Disclaimer)
// Structured data for display in UI

import { CONSENT_VERSION } from '../../utils/consent/consentConfig';

export const legalDocs = {
  terms: {
    title: 'Terms of Service',
    version: CONSENT_VERSION,
    sections: [
      {
        h: '1. Acceptance of Terms',
        p: [
          'By downloading, installing, accessing, or using the Zen? mobile application (the "App"), you agree to these Terms of Service (the "Terms"). If you do not agree, do not use the App.',
          'If you use the App on behalf of an organization, you represent that you have authority to bind that organization.',
        ],
      },
      {
        h: '2. Eligibility and Age Requirement',
        p: [
          'The App is intended for individuals aged 16 and older. By using the App, you represent that you meet this requirement. If you do not meet this requirement, you must not use the App.',
        ],
      },
      {
        h: '3. What the App Is (and Is Not)',
        p: [
          'Zen? is a self-reflection and emotional state tracking tool designed to help you notice patterns and build healthier habits through guided sessions and summaries.',
          'No medical or professional advice. The App does not provide medical, mental health, psychiatric, therapeutic, legal, or financial advice, diagnosis, or treatment. The App\'s outputs (including AI-generated or AI-assisted content) are for informational purposes only.',
          'No reliance for decisions. You agree not to rely on the App for medical, mental health, legal, financial, or other high-stakes decisions.',
        ],
      },
      {
        h: '4. Emergency Disclaimer',
        p: [
          'The App is not an emergency service. If you believe you may harm yourself or others, or you are in immediate danger, call your local emergency number immediately and seek professional help.',
        ],
      },
      {
        h: '5. No Account; Local-First Data',
        p: [
          'No account. The App currently does not require account creation.',
          'Local-first storage. Your entries and reflections are stored locally on your device by default. We do not currently provide cloud backup or synchronization (this may be introduced in future versions).',
          'Data responsibility. You are responsible for maintaining the security of your device (e.g., screen lock, OS updates) and for any device-level backups you choose to use. We are not responsible for loss of data due to device failure, OS updates, deletion by you, or third-party backup tools.',
        ],
      },
      {
        h: '6. AI Processing and Third-Party Provider (OpenAI)',
        p: [
          'The App includes AI-assisted features that may generate readable summaries, identify patterns, and provide general suggestions during certain results (including "L5" outputs).',
          'Third-party processing. When AI-assisted results are generated, text and relevant context you provide in the App may be transmitted to and processed by a third-party AI provider (currently OpenAI) to generate outputs.',
          'AI limitations. AI outputs may be inaccurate, incomplete, biased, or inappropriate. You are solely responsible for how you interpret and use any AI output.',
          'Not medical advice. AI outputs are not medical, mental health, legal, or financial advice and must not be used as a substitute for professional judgment.',
          'Controls. The App may introduce settings in the future to disable or limit AI-assisted processing. Disabling AI may limit or remove certain features.',
        ],
      },
      {
        h: '7. Plans, Limits, and Feature Availability',
        p: [
          'The App may offer different plans (including free and paid plans). Plan features and limits may change over time.',
        ],
      },
      {
        h: '7.1 Free Tier (Core Habit)',
        p: [
          'The free tier is designed to support a sustainable daily habit while keeping the experience lightweight:',
          'Sessions: up to 2 sessions per day (typically morning and evening), or an equivalent weekly allowance (e.g., 14 sessions per week, depending on implementation).',
          'History window: access to the most recent 7 days (or up to 14 most recent entries, depending on implementation). Older entries may be archived locally on your device and may not be accessible from the free tier.',
          'Basic statistics window: certain charts/metrics (including DonutChart and EmotionalBalanceBar) may be limited to a 7-day window.',
          'Streak and activity: streak progress and weekly activity indicators may remain available.',
          'Advanced insights: advanced insights and deep analysis (including patterns/triggers/insights and "Deep Dive") are not included in the free tier.',
          'Personalization: limited to basic settings (e.g., light/dark theme and core preferences).',
          'AI: AI-assisted generation may remain available in the free tier.',
        ],
      },
      {
        h: '7.2 Paid Plan (Planned)',
        p: [
          'If a paid plan is offered, it may include:',
          'Extended history: access to archived entries beyond the free history window, including past archived entries stored on your device.',
          'Advanced analytics: deeper statistics and extended time windows.',
          'Patterns/Triggers/Insights: advanced features that identify patterns and triggers and provide richer insight outputs.',
          'Deep Dive: additional guided sessions and analysis.',
          'Delta comparisons: enhanced morning vs evening comparisons (e.g., beyond 24 hours), as offered by the plan.',
          'Enhanced personalization: additional settings and personalization features.',
        ],
      },
      {
        h: '8. Subscriptions and Free Trial (Planned)',
        p: [
          'The App may offer paid subscriptions in the future, including a one-month free trial. Payments and subscription management are handled through the Apple App Store and/or Google Play, and purchases are subject to the applicable store terms and policies.',
          'When subscriptions are enabled: subscriptions may renew automatically unless cancelled before the renewal date (store rules apply).',
          'Cancellation: you manage or cancel subscriptions via your Apple/Google account settings (uninstalling the App does not cancel a subscription).',
          'Refunds: refund requests are handled according to store policies and applicable law.',
          'We may modify subscription pricing, packages, or features. If required, we will provide notice in the App.',
        ],
      },
      {
        h: '9. User Content',
        p: [
          '"User Content" includes text and information you enter into the App. You retain ownership of your User Content.',
          'You grant us a limited right to process your User Content solely to provide App functionality, including local processing and AI-assisted processing via third-party providers as described in these Terms and the Privacy Policy.',
          'You represent that you have the rights needed to submit User Content and that it does not violate laws or third-party rights.',
        ],
      },
      {
        h: '10. Acceptable Use',
        p: [
          'You agree not to: misuse the App in any unlawful manner; attempt to access, probe, or interfere with the App\'s security or integrity; bypass feature gating, subscription checks, or other technical restrictions; reverse engineer, decompile, or attempt to extract source code, except where permitted by law.',
        ],
      },
      {
        h: '11. Intellectual Property',
        p: [
          'The App and all associated intellectual property (including branding, design, and software) are owned by us or our licensors and are protected by applicable laws. No rights are granted except as expressly stated in these Terms.',
        ],
      },
      {
        h: '12. Changes to the App and Terms',
        p: [
          'We may update the App and these Terms from time to time. If we make material changes, we will provide notice in the App. Continued use may require renewed acceptance before you can continue using the App.',
        ],
      },
      {
        h: '13. Disclaimer of Warranties',
        p: [
          'To the maximum extent permitted by law, the App is provided "as is" and "as available" without warranties of any kind. We do not warrant uninterrupted operation, error-free performance, or that the App will meet your requirements.',
        ],
      },
      {
        h: '14. Limitation of Liability',
        p: [
          'To the maximum extent permitted by law: we are not liable for indirect, incidental, special, consequential, or punitive damages; we are not liable for decisions you make based on App outputs (including AI outputs); we are not liable for loss of locally stored data.',
          'Our total liability for claims relating to the App is limited to the amount you paid for the App in the 12 months preceding the event giving rise to the claim, or EUR 0 if you paid nothing, unless mandatory law requires otherwise.',
        ],
      },
      {
        h: '15. Indemnity',
        p: [
          'You agree to indemnify and hold us harmless from claims, damages, liabilities, and expenses arising out of your misuse of the App, your User Content, or your violation of these Terms.',
        ],
      },
      {
        h: '16. Governing Law and Disputes',
        p: [
          'These Terms are governed by the laws of Latvia. Disputes shall be resolved in the courts of Riga, Latvia, unless mandatory consumer protection law provides otherwise.',
        ],
      },
      {
        h: '17. Contact',
        p: [
          'Questions about these Terms: zen@gmail.com (placeholder).',
        ],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    version: CONSENT_VERSION,
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
    version: CONSENT_VERSION,
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
  return legalDocs[key] || null;
}

/**
 * Get all policy keys
 * @returns {string[]} Array of policy keys
 */
export function getPolicyKeys() {
  return Object.keys(legalDocs);
}
