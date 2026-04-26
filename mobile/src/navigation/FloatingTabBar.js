import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

// Mirrors the web mobile bottom nav in src/components/Layout.tsx (rounded-[1.5rem]
// pill, bg-white/95 light / cook-surface-1 dark, active item = bg-orange-500 with
// white icon + label, inactive = stone-500 / stone-400).
const ICONS = {
  Home: ['home', 'home-outline'],
  Search: ['search', 'search-outline'],
  Planner: ['calendar', 'calendar-outline'],
  Camera: ['camera', 'camera-outline'],
  Profile: ['person', 'person-outline'],
};

function TabItem({ route, isFocused, options, onPress, onLongPress, colors, isDark }) {
  const scale = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: isFocused ? 1 : 0,
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [isFocused, scale]);

  const [activeIcon, inactiveIcon] = ICONS[route.name] || ['ellipse', 'ellipse-outline'];
  const iconName = isFocused ? activeIcon : inactiveIcon;
  const inactiveText = isDark ? '#a8a29e' : '#78716c';

  // Active orange pill sits behind icon + label and scales in on focus.
  const activeBgStyle = {
    opacity: scale,
    transform: [
      {
        scale: scale.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
        }),
      },
    ],
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? route.name}
      testID={options.tabBarTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      style={st.tabItem}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          st.activeBg,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
          activeBgStyle,
        ]}
      />
      <Ionicons
        name={iconName}
        size={18}
        color={isFocused ? '#fff' : inactiveText}
      />
      <Text
        style={[
          st.tabLabel,
          { color: isFocused ? '#fff' : inactiveText },
        ]}
        numberOfLines={1}
      >
        {route.name}
      </Text>
    </TouchableOpacity>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  // Mirror web `bg-white/95 dark:cook-surface-1/0.95` and the orange-100 ring.
  const containerColors = isDark
    ? { backgroundColor: 'rgba(28, 25, 23, 0.95)', borderColor: 'rgba(255, 255, 255, 0.06)' }
    : { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#ffedd5' };

  return (
    <View
      style={[
        st.wrap,
        containerColors,
        {
          bottom: Math.max(insets.bottom, 6) + 6,
          shadowColor: isDark ? '#000' : '#7c2d12',
          shadowOpacity: isDark ? 0.4 : 0.18,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <TabItem
            key={route.key}
            route={route}
            isFocused={isFocused}
            options={options}
            onPress={onPress}
            onLongPress={onLongPress}
            colors={colors}
            isDark={isDark}
          />
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    borderRadius: 24,
    borderWidth: 1,
    padding: 6,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 14,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 4,
    minHeight: 56,
    overflow: 'hidden',
  },
  activeBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  tabLabel: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.2,
    marginTop: 4,
  },
});
