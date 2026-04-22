import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  FlatList,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import MealSlot from '../components/MealSlot';

const { width } = Dimensions.get('window');

const mealTypes = [
  { id: 'breakfast', label: 'Breakfast', color: 'bg-yellow-500' },
  { id: 'lunch', label: 'Lunch', color: 'bg-green-500' },
  { id: 'dinner', label: 'Dinner', color: 'bg-orange-500' },
  { id: 'snack', label: 'Snack', color: 'bg-blue-500' },
];

const mockPlannedMeals = [
  { date: new Date(), slot: 'breakfast', recipe: 'Avocado Toast', image: 'https://picsum.photos/seed/avocado/100/100' },
  { date: new Date(), slot: 'lunch', recipe: 'Quinoa Salad', image: 'https://picsum.photos/seed/quinoa/100/100' },
];

const shoppingList = [
  { category: 'Produce', items: ['Avocado (2)', 'Spinach (1 bag)', 'Tomato (3)'] },
  { category: 'Dairy', items: ['Greek Yogurt (1)', 'Feta Cheese (100g)'] },
  { category: 'Pantry', items: ['Quinoa (500g)', 'Olive Oil'] },
];

export default function MealPlannerScreen() {
  const [activeTab, setActiveTab] = useState('Planner');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [plannedMeals, setPlannedMeals] = useState(mockPlannedMeals);

  const startDate = startOfWeek(new Date());
  const weekDays = eachDayOfInterval({ 
    start: startDate, 
    end: addDays(startDate, 6) 
  });

  const renderPlanner = () => (
    <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
      {/* Week Strip */}
      <View className="flex-row justify-between mb-8">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <TouchableOpacity 
              key={day.toString()}
              onPress={() => setSelectedDate(day)}
              className={`items-center p-3 rounded-2xl w-[13%] ${isSelected ? 'bg-primary shadow-lg shadow-green-200' : 'bg-white border border-gray-100'}`}
            >
              <Text className={`text-[8px] font-bold uppercase ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                {format(day, 'EEE')}
              </Text>
              <Text className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-dark'}`}>
                {format(day, 'd')}
              </Text>
              {isToday && !isSelected && <View className="w-1 h-1 bg-primary rounded-full mt-1" />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Meal Slots */}
      <View className="space-y-2">
        {mealTypes.map((type) => {
          const meal = plannedMeals.find(m => isSameDay(m.date, selectedDate) && m.slot === type.id);
          return (
            <MealSlot 
              key={type.id}
              label={type.label}
              color={type.color}
              meal={meal}
              onAdd={() => console.log('Add meal to', type.id)}
              onRemove={() => setPlannedMeals(plannedMeals.filter(m => !(isSameDay(m.date, selectedDate) && m.slot === type.id)))}
            />
          );
        })}
      </View>
    </ScrollView>
  );

  const renderShoppingList = () => (
    <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
      <View className="bg-primary/10 p-6 rounded-3xl border border-primary/20 mb-8 flex-row items-center justify-between">
        <View className="space-y-1">
          <Text className="text-primary font-bold text-lg">Weekly List</Text>
          <Text className="text-primary/60 text-xs">Based on your 7-day plan</Text>
        </View>
        <TouchableOpacity className="bg-primary p-3 rounded-xl">
          <Ionicons name="download-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {shoppingList.map((cat) => (
        <View key={cat.category} className="mb-8">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{cat.category}</Text>
          <View className="space-y-3">
            {cat.items.map((item, i) => (
              <TouchableOpacity key={i} className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-gray-50 shadow-sm">
                <View className="flex-row items-center space-x-3">
                  <View className="w-5 h-5 rounded-lg border-2 border-gray-200" />
                  <Text className="text-sm font-medium text-dark">{item}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header Tabs */}
      <View className="px-6 pt-4 pb-2 bg-white border-b border-gray-100">
        <View className="flex-row bg-gray-100 p-1 rounded-2xl">
          {['Planner', 'Shopping List'].map((tab) => (
            <TouchableOpacity 
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl items-center ${activeTab === tab ? 'bg-white shadow-sm' : ''}`}
            >
              <Text className={`text-sm font-bold ${activeTab === tab ? 'text-primary' : 'text-gray-400'}`}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === 'Planner' ? renderPlanner() : renderShoppingList()}
    </SafeAreaView>
  );
}
