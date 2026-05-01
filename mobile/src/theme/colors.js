// Shared orange-first palette aligned with the Web React app.
export const lightColors = {
  // Base surfaces
  background: '#fff8f1',
  surface: '#ffffff',
  surfaceAlt: '#fff1e6',

  // Text
  text: '#24160f',
  textMuted: '#7a5a46',
  textSubtle: '#b78b70',

  // Borders
  border: '#fed7aa',
  borderSoft: '#ffedd5',

  // Brand
  primary: '#f97316',
  primaryDark: '#ea580c',
  primaryLight: '#fb923c',
  primarySoft: '#fff7ed',
  primarySoftBorder: '#fed7aa',
  brandShadow: '#f97316',

  // Accents
  amber: '#f97316',
  success: '#f97316',
  danger: '#ef4444',
  info: '#f97316',

  dark: '#24160f',
};

export const darkColors = {
  background: '#0c0a09',
  surface: '#1c1917',
  surfaceAlt: '#292524',
  text: '#fafaf9',
  textMuted: '#e7e5e4',
  textSubtle: '#a8a29e',
  border: '#44403c',
  borderSoft: '#292524',
  primary: '#f97316',
  primaryDark: '#fb923c',
  primaryLight: '#fdba74',
  primarySoft: '#431407',
  primarySoftBorder: '#7c2d12',
  brandShadow: '#f97316',
  amber: '#f59e0b',
  success: '#22c55e',
  danger: '#ef4444',
  info: '#3b82f6',
  dark: '#0c0a09',
};

export function getColors(mode = 'light') {
  return mode === 'dark' ? darkColors : lightColors;
}

export const colors = lightColors;

export default colors;
