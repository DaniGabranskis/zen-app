// Hook to provide current theme variables (colors, etc.) to any component
import useStore from '../store/useStore';
import { themes } from '../utils/theme';

/**
 * Returns color variables for the active theme ("light" or "dark").
 * Used everywhere in the app to ensure dynamic theming.
 */
export default function useThemeVars() {
  // Get current theme name from Zustand store
  const theme = useStore(state => state.theme);
  // Return the corresponding color map (default to light)
  return themes[theme] || themes.light;
}
