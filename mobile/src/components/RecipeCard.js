import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RecipeCard({ recipe, onPress, horizontal = false }) {
  const difficultyColor =
    recipe.difficulty === 'Easy'
      ? 'bg-green-400'
      : recipe.difficulty === 'Medium'
        ? 'bg-orange-400'
        : 'bg-red-400';
  const image = recipe.image || 'https://picsum.photos/seed/cookmate/600/400';

  return (
    <TouchableOpacity 
      onPress={onPress}
      className={`bg-white rounded-2xl overflow-hidden shadow-sm ${horizontal ? 'w-64 mr-4' : 'w-[48%] mb-4'}`}
    >
      <View className="relative">
        <Image 
          source={{ uri: image }} 
          className={horizontal ? 'w-full h-40' : 'w-full h-28'}
          resizeMode="cover"
        />
        {horizontal && (
          <>
            <View className="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full">
              <Text className="text-[9px] font-bold text-dark">{recipe.category || 'Chef Pick'}</Text>
            </View>
            <View className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full items-center justify-center">
              <Ionicons name="bookmark-outline" size={17} color="#a8a29e" />
            </View>
          </>
        )}
      </View>
      <View className={horizontal ? 'p-4 space-y-3' : 'p-3 space-y-2'}>
        <View className="flex-row items-start justify-between">
          <Text className={`${horizontal ? 'text-base' : 'text-sm'} text-dark font-bold flex-1 pr-2`} numberOfLines={1}>
            {recipe.title}
          </Text>
          {horizontal && (
            <View className="flex-row items-center">
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text className="text-primary text-xs font-bold ml-1">{recipe.rating || '4.8'}</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center space-x-4">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={12} color="#d6d3d1" />
            <Text className="text-stone-400 text-[9px] font-medium ml-1">{recipe.time}</Text>
          </View>
          <View className="flex-row items-center">
            <View className={`w-1.5 h-1.5 rounded-full ${difficultyColor}`} />
            <Text className="text-stone-400 text-[9px] font-medium ml-1">{recipe.difficulty}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
