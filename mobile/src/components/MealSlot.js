import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MealSlot({ label, meal, color, onAdd, onRemove }) {
  return (
    <View className="mb-4">
      <View className="flex-row items-center space-x-2 mb-2">
        <View className={`w-2 h-2 rounded-full ${color}`} />
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</Text>
      </View>
      
      {meal ? (
        <View className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex-row items-center justify-between">
          <View className="flex-row items-center space-x-3">
            <Image 
              source={{ uri: meal.image }} 
              className="w-12 h-12 rounded-xl"
            />
            <View>
              <Text className="text-sm font-bold text-dark">{meal.recipe}</Text>
              <Text className="text-[10px] text-gray-400">15 min • Easy</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onRemove}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          onPress={onAdd}
          className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 items-center justify-center"
        >
          <View className="flex-row items-center space-x-2">
            <Ionicons name="add-circle-outline" size={18} color="#9ca3af" />
            <Text className="text-gray-400 text-sm font-medium">Add Recipe</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
