import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationCard({ notification, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.message}`}
      onPress={onPress}
      className={`bg-white p-4 rounded-3xl border border-stone-100 shadow-sm flex-row space-x-4 mb-4 ${notification.read ? 'opacity-60' : ''}`}
    >
      <View className={`w-12 h-12 rounded-2xl items-center justify-center ${notification.color}`}>
        <Ionicons name={notification.icon} size={24} color={notification.iconColor} />
      </View>
      
      <View className="flex-1 space-y-1">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm font-bold text-dark">{notification.title}</Text>
          <Text className="text-[8px] font-bold text-stone-400 uppercase">{notification.time}</Text>
        </View>
        <Text className="text-xs text-stone-500 leading-relaxed" numberOfLines={2}>
          {notification.message}
        </Text>
      </View>

      {!notification.read && (
        <View className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full" />
      )}
    </TouchableOpacity>
  );
}
