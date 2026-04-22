import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  RefreshControl,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { recipeApi } from '../api/api';
import RecipeCard from '../components/RecipeCard';
import AIAssistantWidget from '../components/AIAssistantWidget';

const mealSlots = [
  { id: 'B', label: 'Breakfast', color: 'bg-yellow-500' },
  { id: 'L', label: 'Lunch', color: 'bg-green-500' },
  { id: 'D', label: 'Dinner', color: 'bg-orange-500' },
  { id: 'S', label: 'Snack', color: 'bg-blue-500' },
];

const seasonalIngredients = [
  { id: '1', name: 'Carrot', icon: '🥕' },
  { id: '2', name: 'Broccoli', icon: '🥦' },
  { id: '3', name: 'Tomato', icon: '🍅' },
  { id: '4', name: 'Corn', icon: '🌽' },
  { id: '5', name: 'Spinach', icon: '🥬' },
];

export default function HomeScreen({ navigation }) {
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [recentRecipes, setRecentRecipes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [featuredRes, recentRes] = await Promise.all([
        recipeApi.getFeatured(),
        recipeApi.getRecent()
      ]);
      setFeaturedRecipes(Array.isArray(featuredRes?.data) ? featuredRes.data : []);
      setRecentRecipes(Array.isArray(recentRes?.data) ? recentRes.data : []);
    } catch (error) {
      console.error('Failed to fetch home data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-100 bg-white">
        <View className="flex-row items-center space-x-2">
          <View className="w-8 h-8 bg-primary rounded-lg items-center justify-center">
            <Ionicons name="restaurant" size={18} color="white" />
          </View>
          <Text className="text-xl font-bold text-dark">CookMate</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color="#111827" />
          <View className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full border border-white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />
        }
      >
        <View className="p-6 space-y-8">
          {/* Search Bar */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Search')}
            className="flex-row items-center bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm space-x-3"
          >
            <Ionicons name="search-outline" size={20} color="#9ca3af" />
            <Text className="text-gray-400 flex-1">Search recipes, ingredients...</Text>
            <Ionicons name="options-outline" size={20} color="#22C55E" />
          </TouchableOpacity>

          {/* Daily Meal Plan */}
          <View className="space-y-4">
            <Text className="text-lg font-bold text-dark">Daily Meal Plan</Text>
            <View className="flex-row justify-between">
              {mealSlots.map((slot) => (
                <TouchableOpacity 
                  key={slot.id}
                  className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm items-center space-y-2 w-[22%]"
                >
                  <View className={`w-1.5 h-1.5 rounded-full ${slot.color}`} />
                  <Text className="text-[10px] font-bold text-gray-400 uppercase">{slot.label}</Text>
                  <Ionicons name="add-circle-outline" size={20} color="#d1d5db" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Featured Recipes */}
          <View className="space-y-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-dark">Featured Recipes</Text>
              <TouchableOpacity>
                <Ionicons name="arrow-forward" size={20} color="#22C55E" />
              </TouchableOpacity>
            </View>
            <FlatList 
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredRecipes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <RecipeCard 
                  recipe={item} 
                  horizontal 
                  onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
                />
              )}
            />
          </View>

          {/* Recent Recipes */}
          <View className="space-y-4">
            <Text className="text-lg font-bold text-dark">Recent Recipes</Text>
            <View className="flex-row flex-wrap justify-between">
              {recentRecipes.map((item) => (
                <RecipeCard 
                  key={item.id}
                  recipe={item} 
                  onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
                />
              ))}
            </View>
          </View>

          {/* Seasonal Ingredients */}
          <View className="space-y-4">
            <Text className="text-lg font-bold text-dark">Seasonal Ingredients</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-3">
              {seasonalIngredients.map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex-row items-center space-x-2 mr-3"
                >
                  <Text className="text-lg">{item.icon}</Text>
                  <Text className="text-sm font-medium text-dark">{item.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      <AIAssistantWidget onPress={() => console.log('AI Assistant Pressed')} />
    </SafeAreaView>
  );
}
