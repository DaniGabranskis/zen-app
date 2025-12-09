// src/utils/theme.js

/**
 * Centralized theme tokens for light and dark mode.
 * Old names (bgcolor, textMain, cardBg, ...) are kept for now
 * so other screens do not break. New names are the clearer ones:
 * background, textPrimary, cardBackground, etc.
 */

export const themes = {
  light: {
    // --- NEW canonical names ---
    background: '#FAFAFB',
    textPrimary: '#1A1A1A',
    textSecondary: '#999999',
    accent: '#A78BFA',

    cardBackground: '#FFFFFF',
    cardBackgroundPressed: '#E8E5FF',

    navBackground: '#FFFFFF',
    navBorder: '#EEEEEE',
    navText: '#999999',
    navActive: '#6C63FF',

    dataText: '#555555',
    dividerColor: '#E0E0E0',
    cardChoiceText: '#919191',

    dangerBackground: '#FFEBEE',
    dangerText: '#C62828',
    
    surfaceSecondary:'#FFFFFF',

    // --- OLD names (backward compatibility) ---
    bgcolor: '#FAFAFB',
    textMain: '#1A1A1A',
    textSub: '#999999',
    textCommon: '#1A1A1A',
    button: '#A78BFA',
    cardBg: '#FFFFFF',
    presscardBg: '#E8E5FF',
    navBar: '#FFFFFF',
    navBorder: '#EEEEEE',
    navText: '#999999',
    navActive: '#6C63FF',
    data: '#555555',
    divider: '#E0E0E0',
    card_choice_text: '#919191',
  },

  dark: {
    // --- NEW canonical names ---
    background: '#222224',
    textPrimary: '#FFFFFF',
    textSecondary: '#BBBBBB',
    accent: '#7C62FF',

    cardBackground: '#484852',
    cardBackgroundPressed: '#3A3A40',

    navBackground: '#202024',
    navBorder: '#39394E',
    navText: '#BBBBBB',
    navActive: '#A78BFA',

    dataText: '#D6D4D4',
    dividerColor: '#3F3F4A',
    cardChoiceText: '#D1CFCF',

    dangerBackground: '#3A191B',
    dangerText: '#FF9EA5',

    surfaceSecondary:'#3d3d46ff',

    // --- OLD names (backward compatibility) ---
    bgcolor: '#222224',
    textMain: '#FFFFFF',
    textSub: '#BBBBBB',
    textCommon: '#FFFFFF',
    button: '#7C62FF',
    cardBg: '#2B2B30',
    presscardBg: '#3A3A40',
    navBar: '#202024',
    navBorder: '#39394E',
    navText: '#BBBBBB',
    navActive: '#A78BFA',
    data: '#D6D4D4',
    divider: '#3F3F4A',
    card_choice_text: '#D1CFCF',
  },
};
