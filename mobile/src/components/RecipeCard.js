import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RecipeCard({ recipe, onPress, horizontal = false }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className={`bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm ${horizontal ? 'w-64 mr-4' : 'w-[48%] mb-4'}`}
    >
      <Image 
        source={{ uri: recipe.image }} 
        className="w-full h-32 object-cover"
        resizeMode="cover"
      />
      <View className="p-3 space-y-1">
        <Text className="text-dark font-bold text-sm" numberOfLines={1}>
          {recipe.title}
        </Text>
        <View className="flex-row items-center space-x-2">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={12} color="#9ca3af" />
            <Text className="text-gray-400 text-[10px] ml-1">{recipe.time}</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="stats-chart-outline" size={12} color="#9ca3af" />
            <Text className="text-gray-400 text-[10px] ml-1">{recipe.difficulty}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
