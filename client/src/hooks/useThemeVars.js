// src/hooks/useThemeVars.js

// Hook that returns current theme tokens (colors etc.)
import useStore from '../store/useStore';
import { themes } from '../utils/theme';

/**
 * Returns color tokens for the active theme ("light" or "dark").
 * No mapping here – we just return the theme object as is.
 */
export default function useThemeVars() {
  const themeName = useStore((state) => state.theme) || 'light';
  const base = themes[themeName] || themes.light;

  return {
    ...base,
    themeName,
  };
}
