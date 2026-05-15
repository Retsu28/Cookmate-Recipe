import React, { useState, useCallback } from 'react';
import { View, Image, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

/**
 * OptimizedImage - Wrapper around React Native Image with:
 * - Fade-in animation on load
 * - Loading placeholder with blur effect
 * - Error fallback
 * - Optimized image sizing
 */
function OptimizedImage({
  source,
  style,
  resizeMode = 'cover',
  placeholderColor,
  fallbackIcon = 'image-outline',
  showLoader = true,
}) {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fadeAnim = useState(() => new Animated.Value(0))[0];

  const onLoad = useCallback(() => {
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const onError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const bgColor = placeholderColor || colors.surfaceAlt;

  // Optimize URL for smaller size (add w=800 param for Unsplash/Cloudinary images)
  const optimizedSource = React.useMemo(() => {
    if (!source?.uri) return source;
    let uri = source.uri;
    
    // Add width parameter for common image hosts to get smaller images
    if (uri.includes('unsplash.com') && !uri.includes('w=')) {
      uri = uri.replace(/\?.*$/, '') + '?w=600&q=80&auto=format';
    }
    if (uri.includes('picsum.photos')) {
      // Picsum already returns optimized sizes based on requested dimensions
      uri = uri.replace(/\/\d+\/\d+$/, '/400/300');
    }
    
    return { uri };
  }, [source]);

  return (
    <View style={[style, st.container]}>
      {/* Loading placeholder */}
      {showLoader && loading && (
        <View style={[st.placeholder, { backgroundColor: bgColor }]}>
          <Ionicons name="image" size={24} color={colors.textSubtle} />
        </View>
      )}

      {/* Error fallback */}
      {error ? (
        <View style={[st.placeholder, { backgroundColor: bgColor }]}>
          <Ionicons name={fallbackIcon} size={28} color={colors.textMuted} />
        </View>
      ) : (
        <Animated.Image
          source={optimizedSource}
          style={[style, { opacity: fadeAnim }]}
          resizeMode={resizeMode}
          onLoad={onLoad}
          onError={onError}
          // Progressive loading - load lower quality first (Android only)
          progressiveRenderingEnabled={true}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(OptimizedImage);
