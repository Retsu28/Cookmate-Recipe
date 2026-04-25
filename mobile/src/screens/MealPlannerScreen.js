import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import MealSlot from '../components/MealSlot';
import { useAppTheme } from '../context/ThemeContext';

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
  const { colors, isDark } = useAppTheme();
  const [activeTab, setActiveTab] = useState('Planner');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [plannedMeals, setPlannedMeals] = useState(mockPlannedMeals);

  const startDate = startOfWeek(new Date());
  const weekDays = eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) });

  const renderPlanner = () => (
    <ScrollView style={st.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 86 }}>
      {/* Week strip — matches web calendar row */}
      <View style={[st.weekStrip, { borderBottomColor: colors.border }]}>
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          return (
            <TouchableOpacity
              key={day.toString()}
              onPress={() => setSelectedDate(day)}
              style={[st.dayCell, isSelected && { backgroundColor: isDark ? colors.surfaceAlt : '#1c1917' }]}
            >
              <Text style={[st.dayLabel, { color: isSelected ? 'rgba(255,255,255,0.7)' : colors.textSubtle }]}>
                {format(day, 'EEE').toUpperCase()}
              </Text>
              <Text style={[st.dayNum, { color: isSelected ? '#fff' : colors.text }]}>
                {format(day, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date heading */}
      <Text style={[st.dateHeading, { color: colors.text }]}>
        {format(selectedDate, 'EEEE, MMMM d')}
      </Text>

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
    </ScrollView>
  );

  const renderShoppingList = () => (
    <ScrollView style={st.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 86 }}>
      {/* Weekly summary banner — matches web */}
      <View style={st.weeklyBanner}>
        <View style={st.bannerIconBox}>
          <Ionicons name="cart" size={18} color="#0a0a0a" />
        </View>
        <View style={st.bannerText}>
          <Text style={st.bannerTitle}>Weekly Shopping List</Text>
          <Text style={st.bannerSub}>Auto-generated from your 7-day meal plan</Text>
        </View>
      </View>

      {shoppingList.map((cat) => (
        <View key={cat.category} style={st.catSection}>
          <Text style={[st.catLabel, { color: colors.textSubtle, borderBottomColor: colors.border }]}>{cat.category.toUpperCase()}</Text>
          {cat.items.map((item, i) => (
            <View key={i} style={[st.shopRow, { borderBottomColor: colors.border }]}>
              <View style={st.shopLeft}>
                <View style={[st.shopCheck, { borderColor: colors.border }]} />
                <Text style={[st.shopText, { color: colors.text }]}>{item}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>
      {/* Tab switcher — matches web top toggle */}
      <View style={[st.tabBar, { borderBottomColor: colors.border }]}>
        {['Planner', 'Shopping List'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[st.tabItem, activeTab === tab && { borderBottomWidth: 2, borderBottomColor: colors.text }]}
          >
            <Text style={[st.tabText, { color: activeTab === tab ? colors.text : colors.textSubtle }]}>{tab.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Planner' ? renderPlanner() : renderShoppingList()}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  // Tab
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
  // Week strip
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 16, marginBottom: 8, borderBottomWidth: 1 },
  dayCell: { alignItems: 'center', justifyContent: 'center', width: 42, height: 52, padding: 4 },
  dayLabel: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 1 },
  dayNum: { fontFamily: 'Geist_700Bold', fontSize: 16, marginTop: 2 },
  dateHeading: { fontFamily: 'Geist_700Bold', fontSize: 16, marginBottom: 18 },
  // Shopping
  weeklyBanner: { backgroundColor: '#0a0a0a', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  bannerIconBox: { width: 36, height: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1 },
  bannerTitle: { fontFamily: 'Geist_700Bold', fontSize: 15, color: '#fff' },
  bannerSub: { fontFamily: 'Geist_400Regular', fontSize: 11, color: '#a8a29e', marginTop: 2 },
  catSection: { marginBottom: 20 },
  catLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2, paddingBottom: 8, borderBottomWidth: 1, marginBottom: 0 },
  shopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  shopLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shopCheck: { width: 18, height: 18, borderWidth: 2 },
  shopText: { fontFamily: 'Geist_500Medium', fontSize: 14 },
});
