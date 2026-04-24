import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LogoutButton from '../components/LogoutButton';

const dietaryGoals = ['Lose Weight', 'Build Muscle', 'Eat Healthy', 'Balanced Diet'];
const allergies = ['Gluten', 'Dairy', 'Nuts', 'Shellfish', 'Eggs'];

export default function ProfileScreen() {
  const [notifications, setNotifications] = useState(true);
  const [selectedGoals, setSelectedGoals] = useState(['Eat Healthy']);
  const [selectedAllergies, setSelectedAllergies] = useState(['Dairy']);

  const toggleGoal = (goal) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const toggleAllergy = (allergy) => {
    if (selectedAllergies.includes(allergy)) {
      setSelectedAllergies(selectedAllergies.filter(a => a !== allergy));
    } else {
      setSelectedAllergies([...selectedAllergies, allergy]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 86 }}>
        <View className="pt-7 pb-8 items-center">
          <View className="relative">
            <Image
              source={{ uri: 'https://picsum.photos/seed/jane/200/200' }}
              className="w-20 h-20 rounded-full"
            />
            <TouchableOpacity className="absolute bottom-0 right-0 bg-primary w-8 h-8 rounded-full items-center justify-center border-2 border-background">
              <Ionicons name="camera" size={15} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-xl font-bold text-dark mt-3">Jane Doe</Text>
          <Text className="text-stone-400 text-xs">jane.doe@example.com</Text>
          <TouchableOpacity className="bg-white px-6 py-2 rounded-xl mt-4 shadow-sm">
            <Text className="text-primary font-bold text-[10px]">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View className="px-5 space-y-8">
          <View className="space-y-4">
            <Text className="text-base font-bold text-dark">Dietary Goals</Text>
            <View className="flex-row justify-between">
              {dietaryGoals.map((goal) => {
                const isSelected = selectedGoals.includes(goal);
                return (
                  <TouchableOpacity
                    key={goal}
                    onPress={() => toggleGoal(goal)}
                    className={`h-7 px-3 rounded-lg items-center justify-center ${isSelected ? 'bg-primary shadow-sm' : 'bg-white shadow-sm'}`}
                  >
                    <Text className={`text-[9px] font-bold ${isSelected ? 'text-white' : 'text-stone-400'}`}>{goal}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="space-y-4">
            <Text className="text-base font-bold text-dark">Allergies</Text>
            <View className="flex-row justify-between">
              {allergies.map((allergy) => {
                const isSelected = selectedAllergies.includes(allergy);
                return (
                  <TouchableOpacity
                    key={allergy}
                    onPress={() => toggleAllergy(allergy)}
                    className={`h-7 px-3 rounded-lg items-center justify-center ${isSelected ? 'bg-red-500 shadow-sm' : 'bg-white shadow-sm'}`}
                  >
                    <Text className={`text-[9px] font-bold ${isSelected ? 'text-white' : 'text-stone-400'}`}>{allergy}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="space-y-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-dark">Kitchen Inventory</Text>
              <TouchableOpacity>
                <Text className="text-primary font-bold text-[10px]">Add Item</Text>
              </TouchableOpacity>
            </View>
            <View className="space-y-3">
              {[
                { name: 'Chicken Breast', qty: '2 lbs', expiry: 'Tomorrow', urgent: true },
                { name: 'Heavy Cream', qty: '1 cup', expiry: '3 days', urgent: false },
              ].map((item) => (
                <View key={item.name} className="h-16 bg-white px-4 rounded-xl shadow-sm flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-3">
                    <View className={`w-8 h-8 rounded-full items-center justify-center ${item.urgent ? 'bg-red-50' : 'bg-orange-50'}`}>
                      <Ionicons name={item.urgent ? 'alert-circle' : 'checkmark-circle'} size={18} color={item.urgent ? '#ef4444' : '#f97316'} />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-dark">{item.name}</Text>
                      <Text className="text-[9px] text-stone-400">Expires in {item.expiry}</Text>
                    </View>
                  </View>
                  <Text className="text-xs font-bold text-dark">{item.qty}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="space-y-4">
            <Text className="text-base font-bold text-dark">Preferences</Text>
            <View className="bg-white px-4 py-4 rounded-xl shadow-sm space-y-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-3">
                  <Ionicons name="notifications-outline" size={18} color="#1c1917" />
                  <Text className="text-xs font-medium text-dark">Push Notifications</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: '#d6d3d1', true: '#f97316' }}
                  thumbColor={'#ffffff'}
                />
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-3">
                  <Ionicons name="globe-outline" size={18} color="#1c1917" />
                  <Text className="text-xs font-medium text-dark">Language</Text>
                </View>
                <Text className="text-[10px] font-bold text-stone-400">English (US)</Text>
              </View>
            </View>
          </View>

          <View className="pt-2">
            <LogoutButton />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
