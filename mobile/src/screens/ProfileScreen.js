import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Switch,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="p-8 items-center space-y-4">
          <View className="relative">
            <Image 
              source={{ uri: 'https://picsum.photos/seed/jane/200/200' }} 
              className="w-24 h-24 rounded-full border-4 border-white shadow-md"
            />
            <TouchableOpacity className="absolute bottom-0 right-0 bg-primary w-8 h-8 rounded-full items-center justify-center border-2 border-white">
              <Ionicons name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-dark">Jane Doe</Text>
            <Text className="text-gray-400 text-sm">jane.doe@example.com</Text>
          </View>
          <TouchableOpacity className="bg-white px-6 py-2 rounded-xl border border-gray-100 shadow-sm">
            <Text className="text-primary font-bold text-xs">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View className="px-6 space-y-8 pb-12">
          {/* Dietary Goals */}
          <View className="space-y-4">
            <Text className="text-lg font-bold text-dark">Dietary Goals</Text>
            <View className="flex-row flex-wrap">
              {dietaryGoals.map((goal) => {
                const isSelected = selectedGoals.includes(goal);
                return (
                  <TouchableOpacity 
                    key={goal}
                    onPress={() => toggleGoal(goal)}
                    className={`px-4 py-2 rounded-xl mr-2 mb-2 border ${isSelected ? 'bg-primary border-primary' : 'bg-white border-gray-100'}`}
                  >
                    <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{goal}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Allergies */}
          <View className="space-y-4">
            <Text className="text-lg font-bold text-dark">Allergies</Text>
            <View className="flex-row flex-wrap">
              {allergies.map((allergy) => {
                const isSelected = selectedAllergies.includes(allergy);
                return (
                  <TouchableOpacity 
                    key={allergy}
                    onPress={() => toggleAllergy(allergy)}
                    className={`px-4 py-2 rounded-xl mr-2 mb-2 border ${isSelected ? 'bg-red-500 border-red-500' : 'bg-white border-gray-100'}`}
                  >
                    <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{allergy}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Kitchen Inventory */}
          <View className="space-y-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-dark">Kitchen Inventory</Text>
              <TouchableOpacity>
                <Text className="text-primary font-bold text-xs">Add Item</Text>
              </TouchableOpacity>
            </View>
            <View className="space-y-3">
              {[
                { name: 'Chicken Breast', qty: '2 lbs', expiry: 'Tomorrow', urgent: true },
                { name: 'Heavy Cream', qty: '1 cup', expiry: '3 days', urgent: false },
              ].map((item, i) => (
                <View key={i} className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-3">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${item.urgent ? 'bg-red-50' : 'bg-green-50'}`}>
                      <Ionicons name={item.urgent ? "alert-circle" : "checkmark-circle"} size={20} color={item.urgent ? "#ef4444" : "#22C55E"} />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-dark">{item.name}</Text>
                      <Text className="text-[10px] text-gray-400">Expires in {item.expiry}</Text>
                    </View>
                  </View>
                  <Text className="text-xs font-bold text-dark">{item.qty}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Preferences */}
          <View className="space-y-4">
            <Text className="text-lg font-bold text-dark">Preferences</Text>
            <View className="bg-white p-4 rounded-3xl border border-gray-50 shadow-sm space-y-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-3">
                  <Ionicons name="notifications-outline" size={20} color="#111827" />
                  <Text className="text-sm font-medium text-dark">Push Notifications</Text>
                </View>
                <Switch 
                  value={notifications} 
                  onValueChange={setNotifications}
                  trackColor={{ false: "#d1d5db", true: "#22C55E" }}
                />
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-3">
                  <Ionicons name="globe-outline" size={20} color="#111827" />
                  <Text className="text-sm font-medium text-dark">Language</Text>
                </View>
                <Text className="text-xs font-bold text-gray-400">English (US)</Text>
              </View>
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity className="bg-red-50 h-14 rounded-2xl items-center justify-center border border-red-100">
            <Text className="text-red-500 font-bold">LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
