// Shared color palette aligned with the Web React app (src/index.css + tailwind).
// Web source-of-truth: stone-50 bg, stone-200 borders, orange-500 primary.
export const lightColors = {
  // Base surfaces
  background: '#fafaf9',      // stone-50 (web bg)
  surface: '#ffffff',         // cards
  surfaceAlt: '#f5f5f4',      // stone-100 (hover/section)

  // Text
  text: '#1c1917',            // stone-900
  textMuted: '#78716c',       // stone-500
  textSubtle: '#a8a29e',      // stone-400

  // Borders
  border: '#e7e5e4',          // stone-200
  borderSoft: '#f5f5f4',      // stone-100

  // Brand
  primary: '#f97316',         // orange-500
  primaryDark: '#ea580c',     // orange-600
  primarySoft: '#fff7ed',     // orange-50
  primarySoftBorder: '#fed7aa', // orange-200

  // Accents
  amber: '#f59e0b',           // star / rating fills
  success: '#22c55e',
  danger: '#ef4444',
  info: '#3b82f6',

  dark: '#0a0a0a',            // cooking-mode / AI dark panel (web)
};

export const darkColors = {
  background: '#0c0a09',
  surface: '#1c1917',
  surfaceAlt: '#292524',
  text: '#fafaf9',
  textMuted: '#d6d3d1',
  textSubtle: '#a8a29e',
  border: '#292524',
  borderSoft: '#1c1917',
  primary: '#f97316',
  primaryDark: '#fb923c',
  primarySoft: '#431407',
  primarySoftBorder: '#7c2d12',
  amber: '#f59e0b',
  success: '#22c55e',
  danger: '#ef4444',
  info: '#3b82f6',
  dark: '#000000',
};

export function getColors(mode = 'light') {
  return mode === 'dark' ? darkColors : lightColors;
}

export const colors = lightColors;

export default colors;
