import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MealSlot({ label, meal, color, onAdd, onRemove }) {
  return (
    <View className="mb-6">
      <View className="flex-row items-center space-x-2 mb-3">
        <View className={`w-1.5 h-1.5 rounded-full ${color}`} />
        <Text className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{label}</Text>
      </View>

      {meal ? (
        <View className="h-14 bg-white rounded-xl flex-row items-center justify-between px-3 shadow-sm">
          <View className="flex-row items-center space-x-3">
            <Image
              source={{ uri: meal.image }}
              className="w-10 h-10 rounded-lg"
            />
            <View>
              <Text className="text-xs font-bold text-dark">{meal.recipe}</Text>
              <Text className="text-[9px] text-stone-400">15 min - Easy</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onRemove} className="p-2">
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onAdd}
          className="h-11 rounded-xl border border-orange-200 items-center justify-center"
        >
          <View className="flex-row items-center space-x-2">
            <Ionicons name="add-circle-outline" size={15} color="#f97316" />
            <Text className="text-primary text-xs font-medium">Add Recipe</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
