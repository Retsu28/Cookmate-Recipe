import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { recipeApi } from '../api/api';

const { width } = Dimensions.get('window');

export default function RecipeDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(4);
  const [activeTab, setActiveTab] = useState('Ingredients');

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const response = await recipeApi.getById(id);
        setRecipe(response.data);
        setServings(response.data.servings || 4);
      } catch (error) {
        console.error('Failed to fetch recipe', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  if (!recipe) return null;

  const tabs = ['Ingredients', 'Nutrition', 'Tools', 'Reviews'];

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View className="relative">
          <Image 
            source={{ uri: recipe.image }} 
            className="w-full h-80"
            resizeMode="cover"
          />
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="absolute top-12 left-6 w-10 h-10 bg-white/80 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity 
            className="absolute top-12 right-6 w-10 h-10 bg-white/80 rounded-full items-center justify-center"
          >
            <Ionicons name="heart-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <View className="p-6 -mt-8 bg-background rounded-t-[40px] space-y-6">
          {/* Header Info */}
          <View className="space-y-2">
            <View className="flex-row items-center space-x-2">
              <View className="bg-green-100 px-3 py-1 rounded-full">
                <Text className="text-primary text-[10px] font-bold uppercase">Italian</Text>
              </View>
              <View className="flex-row items-center space-x-1">
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text className="text-dark font-bold text-xs">4.8</Text>
              </View>
            </View>
            <Text className="text-3xl font-bold text-dark">{recipe.title}</Text>
          </View>

          {/* Info Row */}
          <View className="flex-row justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <View className="items-center space-y-1">
              <Ionicons name="time-outline" size={20} color="#22C55E" />
              <Text className="text-[10px] text-gray-400 font-bold uppercase">Prep</Text>
              <Text className="text-xs font-bold text-dark">{recipe.prepTime || '15 min'}</Text>
            </View>
            <View className="items-center space-y-1">
              <Ionicons name="restaurant-outline" size={20} color="#22C55E" />
              <Text className="text-[10px] text-gray-400 font-bold uppercase">Cook</Text>
              <Text className="text-xs font-bold text-dark">{recipe.time}</Text>
            </View>
            <View className="items-center space-y-1">
              <Ionicons name="stats-chart-outline" size={20} color="#22C55E" />
              <Text className="text-[10px] text-gray-400 font-bold uppercase">Level</Text>
              <Text className="text-xs font-bold text-dark">{recipe.difficulty}</Text>
            </View>
            <View className="items-center space-y-1">
              <Text className="text-[10px] text-gray-400 font-bold uppercase">Servings</Text>
              <View className="flex-row items-center space-x-2">
                <TouchableOpacity onPress={() => setServings(Math.max(1, servings - 1))}>
                  <Ionicons name="remove-circle-outline" size={20} color="#22C55E" />
                </TouchableOpacity>
                <Text className="text-xs font-bold text-dark">{servings}</Text>
                <TouchableOpacity onPress={() => setServings(servings + 1)}>
                  <Ionicons name="add-circle-outline" size={20} color="#22C55E" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View className="space-y-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-4">
              {tabs.map((tab) => (
                <TouchableOpacity 
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className={`pb-2 px-2 ${activeTab === tab ? 'border-b-2 border-primary' : ''}`}
                >
                  <Text className={`text-sm font-bold ${activeTab === tab ? 'text-primary' : 'text-gray-400'}`}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tab Content */}
            <View className="min-h-[200px]">
              {activeTab === 'Ingredients' && (
                <View className="space-y-3">
                  {(recipe.ingredients || []).map((ing, i) => (
                    <View key={i} className="flex-row items-center justify-between p-4 bg-white rounded-2xl border border-gray-50">
                      <View className="flex-row items-center space-x-3">
                        <View className="w-5 h-5 rounded border border-gray-200" />
                        <Text className="text-sm text-dark font-medium">{ing.name || ing}</Text>
                      </View>
                      <Text className="text-xs font-bold text-gray-400">{ing.amount || '1'} {ing.unit || 'unit'}</Text>
                    </View>
                  ))}
                </View>
              )}
              {activeTab === 'Nutrition' && (
                <View className="space-y-4 p-4 bg-white rounded-3xl border border-gray-50">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm font-medium text-gray-500">Calories</Text>
                    <Text className="text-sm font-bold text-dark">450 kcal</Text>
                  </View>
                  <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View className="h-full bg-orange-500 w-[70%]" />
                  </View>
                  {/* More nutrition stats... */}
                </View>
              )}
              {/* Other tabs... */}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="p-6 bg-white border-t border-gray-100 flex-row space-x-4">
        <TouchableOpacity className="w-14 h-14 bg-gray-100 rounded-2xl items-center justify-center">
          <Ionicons name="bookmark-outline" size={24} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => navigation.navigate('CookingMode', { recipe })}
          className="flex-1 h-14 bg-primary rounded-2xl items-center justify-center shadow-lg shadow-green-200"
        >
          <Text className="text-white font-bold text-lg">START COOKING</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
