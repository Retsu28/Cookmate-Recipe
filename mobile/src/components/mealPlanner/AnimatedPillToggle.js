import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';

const PILL_WIDTH = 80;
const PILL_PADDING = 6;

/**
 * AnimatedPillToggle - Day/Week view toggle with sliding animation
 */
function AnimatedPillToggle({ view, setView, colors, pillTrack, softShadow }) {
  const slideAnim = useRef(new Animated.Value(view === 'day' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: view === 'day' ? 0 : 1,
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [view, slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PILL_WIDTH],
  });

  return (
    <View style={[st.pill, { backgroundColor: pillTrack }]}>
      <Animated.View
        style={[
          st.pillSlider,
          {
            width: PILL_WIDTH,
            backgroundColor: colors.surface,
            transform: [{ translateX }],
          },
          softShadow,
        ]}
      />

      <TouchableOpacity
        onPress={() => setView('day')}
        activeOpacity={0.85}
        style={[st.pillBtn, { width: PILL_WIDTH }]}
      >
        <Text style={[st.pillText, { color: view === 'day' ? colors.text : colors.textSubtle }]}>
          Day
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setView('week')}
        activeOpacity={0.85}
        style={[st.pillBtn, { width: PILL_WIDTH }]}
      >
        <Text style={[st.pillText, { color: view === 'week' ? colors.text : colors.textSubtle }]}>
          Week
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    padding: PILL_PADDING,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pillSlider: {
    position: 'absolute',
    left: PILL_PADDING,
    top: PILL_PADDING,
    bottom: PILL_PADDING,
    borderRadius: 999,
  },
  pillBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    zIndex: 1,
  },
  pillText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 12,
  },
});

export default AnimatedPillToggle;
