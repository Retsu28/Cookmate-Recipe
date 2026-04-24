import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { recipeApi } from '../api/api';
import RecipeCard from '../components/RecipeCard';
import AIAssistantWidget from '../components/AIAssistantWidget';

const fallbackFeatured = [
  {
    id: 1,
    title: 'Creamy Tuscan Chicken',
    time: '35 min',
    difficulty: 'Medium',
    rating: 4.8,
    image: 'https://picsum.photos/seed/tuscan/600/400',
    category: 'Italian',
  },
  {
    id: 2,
    title: 'Spicy Miso Ramen',
    time: '45 min',
    difficulty: 'Hard',
    rating: 4.9,
    image: 'https://picsum.photos/seed/ramen/600/400',
    category: 'Japanese',
  },
  {
    id: 3,
    title: 'Honey Garlic Salmon',
    time: '20 min',
    difficulty: 'Easy',
    rating: 4.7,
    image: 'https://picsum.photos/seed/salmon/600/400',
    category: 'Seafood',
  },
];

const fallbackRecent = [
  { id: 1, title: 'Beef Stir Fry', date: '2 days ago', image: 'https://picsum.photos/seed/beef/100/100' },
  { id: 2, title: 'Greek Salad', date: 'Yesterday', image: 'https://picsum.photos/seed/salad/100/100' },
  { id: 3, title: 'Pancakes', date: 'Today', image: 'https://picsum.photos/seed/pancake/100/100' },
];

const dailyPlan = [
  { slot: 'Breakfast', recipe: 'Avocado Toast', time: '10 min', color: 'bg-yellow-400' },
  { slot: 'Lunch', recipe: 'Quinoa Salad', time: '15 min', color: 'bg-green-400' },
  { slot: 'Dinner', recipe: 'Grilled Salmon', time: '25 min', color: 'bg-orange-500' },
  { slot: 'Snack', recipe: 'Greek Yogurt', time: '5 min', color: 'bg-blue-400' },
];

const seasonalIngredients = [
  { name: 'Asparagus', status: 'Peak Season', image: 'https://picsum.photos/seed/asparagus/100/100' },
  { name: 'Strawberries', status: 'Just In', image: 'https://picsum.photos/seed/strawberry/100/100' },
  { name: 'Rhubarb', status: 'Limited Time', image: 'https://picsum.photos/seed/rhubarb/100/100' },
];

const shoppingList = [
  { item: 'Fresh Salmon', amount: '2 fillets' },
  { item: 'Avocado', amount: '2 pcs' },
  { item: 'Quinoa', amount: '500g' },
  { item: 'Greek Yogurt', amount: '1 tub' },
];

const withFallback = (items, fallback) => {
  if (Array.isArray(items) && items.length > 0) {
    return items;
  }
  return fallback;
};

export default function HomeScreen({ navigation }) {
  const [featuredRecipes, setFeaturedRecipes] = useState(fallbackFeatured);
  const [recentRecipes, setRecentRecipes] = useState(fallbackRecent);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [featuredRes, recentRes] = await Promise.all([
        recipeApi.getFeatured(),
        recipeApi.getRecent(),
      ]);
      setFeaturedRecipes(withFallback(featuredRes?.data, fallbackFeatured));
      setRecentRecipes(withFallback(recentRes?.data, fallbackRecent));
    } catch (error) {
      console.error('Failed to fetch home data', error);
      setFeaturedRecipes(fallbackFeatured);
      setRecentRecipes(fallbackRecent);
    } finally {
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
      <View className="h-16 px-4 flex-row items-center justify-between border-b border-border bg-background">
        <View className="flex-row items-center space-x-3">
          <View className="w-9 h-9 bg-primary rounded-xl items-center justify-center">
            <Ionicons name="restaurant" size={20} color="white" />
          </View>
          <Text className="text-base font-extrabold text-dark tracking-tight">CookMate</Text>
        </View>

        <View className="flex-row items-center space-x-3">
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            className="w-9 h-9 rounded-xl border border-border bg-white items-center justify-center"
          >
            <Ionicons name="notifications-outline" size={18} color="#78716c" />
            <View className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
          </TouchableOpacity>
          <Image
            source={{ uri: 'https://picsum.photos/seed/jane/100/100' }}
            className="w-9 h-9 rounded-full"
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 86 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f97316']} />
        }
      >
        <View className="px-4 pt-5 space-y-7">
          <TouchableOpacity
            onPress={() => navigation.navigate('Search')}
            className="h-12 flex-row items-center bg-white px-4 rounded-xl border border-border space-x-3 shadow-sm"
          >
            <Ionicons name="search-outline" size={18} color="#a8a29e" />
            <Text className="text-stone-400 flex-1 text-xs">Search recipes, ingredients, or cuisines...</Text>
            <View className="w-8 h-8 rounded-lg border border-border bg-white items-center justify-center">
              <Ionicons name="options-outline" size={17} color="#57534e" />
            </View>
          </TouchableOpacity>

          <View className="space-y-3">
            <Text className="text-lg font-extrabold text-dark tracking-tight">Featured Recipes</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredRecipes}
              keyExtractor={(item, index) => `${item.id || item.title || index}`}
              contentContainerStyle={{ paddingRight: 16 }}
              renderItem={({ item }) => (
                <RecipeCard
                  recipe={item}
                  horizontal
                  onPress={() => navigation.navigate('RecipeDetail', { id: item.id || 1 })}
                />
              )}
            />
          </View>

          <View className="space-y-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-dark">Daily Meal Plan</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Planner')} className="flex-row items-center">
                <Text className="text-primary text-[10px] font-bold">View All</Text>
                <Ionicons name="chevron-forward" size={12} color="#f97316" />
              </TouchableOpacity>
            </View>

            <View className="space-y-3">
              {dailyPlan.map((item) => (
                <TouchableOpacity
                  key={item.slot}
                  className="h-12 flex-row items-center px-3 rounded-xl bg-white shadow-sm"
                >
                  <View className={`w-1 h-8 rounded-full ${item.color}`} />
                  <View className="flex-1 ml-3">
                    <Text className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">{item.slot}</Text>
                    <Text className="text-xs font-bold text-dark">{item.recipe}</Text>
                  </View>
                  <View className="flex-row items-center space-x-1">
                    <Ionicons name="time-outline" size={11} color="#a8a29e" />
                    <Text className="text-[9px] font-medium text-stone-400">{item.time}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="space-y-3">
            <Text className="text-base font-bold text-dark">Recent Recipes</Text>
            {recentRecipes.map((recipe, index) => (
              <TouchableOpacity
                key={`${recipe.id || recipe.title || index}`}
                onPress={() => navigation.navigate('RecipeDetail', { id: recipe.id || 1 })}
                className="flex-row items-center space-x-3 p-3 bg-white rounded-xl shadow-sm"
              >
                <Image
                  source={{ uri: recipe.image || 'https://picsum.photos/seed/recent/100/100' }}
                  className="w-12 h-12 rounded-lg"
                />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-dark">{recipe.title}</Text>
                  <Text className="text-[10px] text-stone-400 font-medium">{recipe.date || 'Recently cooked'}</Text>
                </View>
                <Ionicons name="time-outline" size={16} color="#a8a29e" />
              </TouchableOpacity>
            ))}
          </View>

          <View className="space-y-3">
            <Text className="text-base font-bold text-dark">Seasonal Ingredients</Text>
            <View className="flex-row justify-between">
              {seasonalIngredients.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  className="bg-white p-3 rounded-xl items-center w-[31%] shadow-sm"
                >
                  <Image source={{ uri: item.image }} className="w-12 h-12 rounded-full mb-2" />
                  <Text className="font-bold text-[10px] text-dark text-center" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-[8px] font-bold text-primary uppercase tracking-wider mt-1 text-center">
                    {item.status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="space-y-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-dark">Shopping List</Text>
              <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                <Text className="text-orange-700 text-[10px] font-bold">{shoppingList.length}</Text>
              </View>
            </View>
            <View className="bg-white rounded-xl p-4 space-y-3 shadow-sm">
              {shoppingList.map((item) => (
                <View key={item.item} className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-stone-700">{item.item}</Text>
                  <Text className="text-[10px] font-bold text-stone-400">{item.amount}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <AIAssistantWidget onPress={() => console.log('AI Assistant Pressed')} />
    </SafeAreaView>
  );
}
