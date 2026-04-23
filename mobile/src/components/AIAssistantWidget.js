import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AIAssistantWidget({ onPress }) {
  return (
    <TouchableOpacity 
      className="absolute bottom-5 right-5 w-12 h-12 bg-dark rounded-full items-center justify-center shadow-lg"
      onPress={onPress}
    >
      <Ionicons name="chatbubble-ellipses" size={21} color="#ffffff" />
      <View className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border border-white" />
    </TouchableOpacity>
  );
}
