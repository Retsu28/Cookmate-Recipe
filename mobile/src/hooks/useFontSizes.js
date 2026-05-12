import { useAppTheme } from '../context/ThemeContext';

/**
 * Hook to get dynamic font sizes based on user's font size preference
 * Returns an object with font sizes: { xs, sm, base, md, lg, xl, '2xl', '3xl' }
 * 
 * Usage:
 * const { fontSizes } = useFontSizes();
 * <Text style={{ fontSize: fontSizes.base }}>Text</Text>
 */
export function useFontSizes() {
  const { fontSizes } = useAppTheme();
  return { fontSizes };
}

export default useFontSizes;
