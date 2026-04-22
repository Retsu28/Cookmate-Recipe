import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AIAssistantWidget({ onPress }) {
  return (
    <TouchableOpacity 
      className="absolute bottom-6 right-6 w-14 h-14 bg-dark rounded-full items-center justify-center shadow-lg"
      onPress={onPress}
    >
      <Ionicons name="chatbubble-ellipses" size={28} color="#22C55E" />
      <View className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-dark items-center justify-center">
        <View className="w-1.5 h-1.5 bg-white rounded-full" />
      </View>
    </TouchableOpacity>
  );
}
