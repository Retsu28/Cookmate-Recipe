import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import MealSlot from '../components/MealSlot';

const mealTypes = [
  { id: 'breakfast', label: 'Breakfast', color: 'bg-yellow-400' },
  { id: 'lunch', label: 'Lunch', color: 'bg-green-400' },
  { id: 'dinner', label: 'Dinner', color: 'bg-orange-500' },
  { id: 'snack', label: 'Snack', color: 'bg-blue-400' },
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
    end: addDays(startDate, 6),
  });

  const renderPlanner = () => (
    <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 86 }}>
      <View className="flex-row justify-between mb-7">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          return (
            <TouchableOpacity
              key={day.toString()}
              onPress={() => setSelectedDate(day)}
              className={`items-center justify-center rounded-xl w-[13%] h-11 ${isSelected ? 'bg-primary shadow-lg shadow-orange-200' : 'bg-white shadow-sm'}`}
            >
              <Text className={`text-[7px] font-bold uppercase ${isSelected ? 'text-white/90' : 'text-stone-400'}`}>
                {format(day, 'EEE')}
              </Text>
              <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-dark'}`}>
                {format(day, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View>
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
    <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 86 }}>
      <View className="bg-orange-50 p-5 rounded-2xl border border-orange-100 mb-7 flex-row items-center justify-between">
        <View>
          <Text className="text-primary font-bold text-base">Weekly List</Text>
          <Text className="text-orange-400 text-xs">Based on your 7-day plan</Text>
        </View>
        <TouchableOpacity className="bg-primary p-3 rounded-xl">
          <Ionicons name="download-outline" size={18} color="white" />
        </TouchableOpacity>
      </View>

      {shoppingList.map((cat) => (
        <View key={cat.category} className="mb-7">
          <Text className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">{cat.category}</Text>
          <View className="space-y-3">
            {cat.items.map((item, i) => (
              <TouchableOpacity key={i} className="h-12 flex-row items-center justify-between bg-white px-4 rounded-xl shadow-sm">
                <View className="flex-row items-center space-x-3">
                  <View className="w-4 h-4 rounded-md border-2 border-stone-200" />
                  <Text className="text-xs font-medium text-dark">{item}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#d6d3d1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-3 pb-2 bg-background">
        <View className="h-10 flex-row bg-stone-100 p-1 rounded-xl">
          {['Planner', 'Shopping List'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg items-center justify-center ${activeTab === tab ? 'bg-white shadow-sm' : ''}`}
            >
              <Text className={`text-[11px] font-bold ${activeTab === tab ? 'text-primary' : 'text-stone-400'}`}>
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
