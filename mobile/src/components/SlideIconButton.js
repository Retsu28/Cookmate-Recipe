import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * SlideIconButton - Icon button with minimal slide effect on press
 * @param {string} props.name - Ionicons name
 * @param {number} props.size - Icon size
 * @param {string} props.color - Icon color
 * @param {Function} props.onPress - Press handler
 * @param {Object} props.style - Custom styles
 * @param {boolean} props.disabled - Disabled state
 * @param {number} props.slideDistance - Slide distance (default: 2)
 */
function SlideIconButton({
  name,
  size = 24,
  color,
  onPress,
  style,
  disabled = false,
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
      activeOpacity={0.85}
      style={style}
      {...props}
    >
      <Animated.View style={{ transform: [{ translateX }] }}>
        <Ionicons name={name} size={size} color={color} />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default SlideIconButton;
