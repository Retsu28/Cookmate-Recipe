import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mlApi } from '../api/api';
import IngredientTag from '../components/IngredientTag';
import RecipeCard from '../components/RecipeCard';

export default function SearchScreen({ navigation }) {
  const [ingredient, setIngredient] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('Best Match');

  const addIngredient = () => {
    if (ingredient.trim() && !ingredients.includes(ingredient.trim())) {
      setIngredients([...ingredients, ingredient.trim()]);
      setIngredient('');
    }
  };

  const removeIngredient = (tag) => {
    setIngredients(ingredients.filter(i => i !== tag));
  };

  const handleSearch = async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    try {
      const response = await mlApi.recommendByIngredients(ingredients);
      setResults(response.data.recommendations || []);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View className="px-4 pt-3 pb-5 space-y-5">
      <View className="space-y-2">
        <Text className="text-lg font-bold text-dark">What's in your kitchen?</Text>
        <Text className="text-stone-400 text-xs">Enter ingredients you have to find recipes.</Text>
      </View>

      <View className="space-y-4">
        <View className="h-12 flex-row items-center bg-white px-4 rounded-xl shadow-sm space-x-3">
          <Ionicons name="add-circle-outline" size={20} color="#f97316" />
          <TextInput
            className="flex-1 text-dark text-xs"
            placeholder="Type ingredient (e.g. Chicken, Garlic)"
            placeholderTextColor="#a8a29e"
            value={ingredient}
            onChangeText={setIngredient}
            onSubmitEditing={addIngredient}
            returnKeyType="done"
          />
          {ingredient.length > 0 && (
            <TouchableOpacity onPress={addIngredient}>
              <Ionicons name="arrow-forward-circle" size={24} color="#f97316" />
            </TouchableOpacity>
          )}
        </View>

        {ingredients.length > 0 && (
          <View className="flex-row flex-wrap">
            {ingredients.map((tag) => (
              <IngredientTag
                key={tag}
                name={tag}
                onRemove={() => removeIngredient(tag)}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={handleSearch}
          disabled={ingredients.length === 0 || loading}
          className={`h-12 rounded-xl items-center justify-center flex-row space-x-2 ${ingredients.length === 0 ? 'bg-stone-200' : 'bg-primary shadow-lg shadow-orange-200'}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="sparkles" size={17} color="white" />
              <Text className="text-white font-bold text-sm">Find Recipes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {results.length > 0 && (
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-dark">{results.length} Matches Found</Text>
          <View className="flex-row bg-stone-100 p-1 rounded-xl">
            {['Best Match', 'Fastest'].map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg ${filter === f ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`text-[10px] font-bold ${filter === f ? 'text-primary' : 'text-stone-400'}`}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading || ingredients.length > 0) return null;

    return (
      <View className="flex-1 items-center justify-center px-8 pt-20">
        <Ionicons name="restaurant-outline" size={52} color="#d6d3d1" />
        <Text className="text-stone-400 text-center text-xs font-medium mt-8">
          No ingredients added yet. Try adding "Chicken", "Garlic", or "Pasta".
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={results}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item.recipe}
            onPress={() => navigation.navigate('RecipeDetail', { id: item.recipe.id })}
          />
        )}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 86 }}
      />
    </SafeAreaView>
  );
}
