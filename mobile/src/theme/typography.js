// Typography scale aligned with the Web React app (Geist Variable font).
export const fontFamily = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  extrabold: 'Geist_800ExtraBold',
};

// Base font sizes (medium scale)
export const baseFontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

// Font size multipliers for different preferences
export const fontSizeMultipliers = {
  small: 0.85,
  medium: 1,
  large: 1.15,
};

// Function to get dynamic font sizes based on preference
export const getDynamicFontSizes = (sizePreference = 'medium') => {
  const multiplier = fontSizeMultipliers[sizePreference] || 1;
  const dynamicSizes = {};
  
  Object.keys(baseFontSize).forEach(key => {
    dynamicSizes[key] = Math.round(baseFontSize[key] * multiplier);
  });
  
  return dynamicSizes;
};

// Legacy export for backward compatibility
export const fontSize = baseFontSize;

export default { fontFamily, fontSize: baseFontSize, getDynamicFontSizes, fontSizeMultipliers };
