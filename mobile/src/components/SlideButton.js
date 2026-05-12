import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  Easing,
} from 'react-native';

/**
 * SlideButton - Button with minimal slide effect on press
 * @param {Object} props
 * @param {Function} props.onPress - Press handler
 * @param {Object} props.style - Custom styles
 * @param {React.ReactNode} props.children - Button content
 * @param {boolean} props.disabled - Disabled state
 * @param {number} props.activeOpacity - Touch opacity (default: 0.85)
 * @param {number} props.slideDistance - Slide distance in pixels (default: 2)
 */
function SlideButton({
  onPress,
  style,
  children,
  disabled = false,
  activeOpacity = 0.85,
  slideDistance = 2,
  ...props
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, slideDistance],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={[st.button, style]}
      {...props}
    >
      <Animated.View style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  button: {
    // Base styles - customize via style prop
  },
});

export default SlideButton;
