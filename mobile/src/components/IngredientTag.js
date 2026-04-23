import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function IngredientTag({ name, onRemove }) {
  return (
    <View className="bg-orange-50 px-3 py-1.5 rounded-full flex-row items-center space-x-1.5 mr-2 mb-2 border border-orange-200">
      <Text className="text-primary font-medium text-xs">{name}</Text>
      <TouchableOpacity onPress={onRemove}>
        <Ionicons name="close-circle" size={14} color="#f97316" />
      </TouchableOpacity>
    </View>
  );
}
