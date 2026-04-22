import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ScrollView,
  ActivityIndicator,
  Image
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
    <View className="p-6 space-y-6">
      <View className="space-y-2">
        <Text className="text-2xl font-bold text-dark">What's in your kitchen?</Text>
        <Text className="text-gray-400 text-sm">Enter ingredients you have to find recipes.</Text>
      </View>

      <View className="space-y-4">
        <View className="flex-row items-center bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm space-x-3">
          <Ionicons name="add-circle-outline" size={24} color="#22C55E" />
          <TextInput 
            className="flex-1 text-dark"
            placeholder="Type ingredient (e.g. Chicken, Garlic)"
            value={ingredient}
            onChangeText={setIngredient}
            onSubmitEditing={addIngredient}
            returnKeyType="done"
          />
          {ingredient.length > 0 && (
            <TouchableOpacity onPress={addIngredient}>
              <Ionicons name="arrow-forward-circle" size={28} color="#22C55E" />
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
          className={`h-14 rounded-2xl items-center justify-center flex-row space-x-2 ${ingredients.length === 0 ? 'bg-gray-200' : 'bg-primary shadow-lg shadow-green-200'}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="white" />
              <Text className="text-white font-bold text-lg">Find Recipes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {results.length > 0 && (
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-dark">{results.length} Matches Found</Text>
          <View className="flex-row bg-gray-100 p-1 rounded-xl">
            {['Best Match', 'Fastest'].map((f) => (
              <TouchableOpacity 
                key={f}
                onPress={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg ${filter === f ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`text-[10px] font-bold ${filter === f ? 'text-primary' : 'text-gray-400'}`}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center p-12 space-y-4">
      <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center">
        <Ionicons name="restaurant-outline" size={40} color="#d1d5db" />
      </View>
      <Text className="text-gray-400 text-center font-medium">
        No ingredients added yet. Try adding "Chicken", "Garlic", or "Pasta".
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList 
        data={results}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading && ingredients.length === 0 ? renderEmpty : null}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 24 }}
        renderItem={({ item }) => (
          <RecipeCard 
            recipe={item.recipe} 
            onPress={() => navigation.navigate('RecipeDetail', { id: item.recipe.id })}
          />
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}
