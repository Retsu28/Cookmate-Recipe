import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const mockSteps = [
  { number: 1, text: 'Season chicken with salt and pepper. In a large skillet, heat olive oil over medium-high heat.', time: '5:00' },
  { number: 2, text: 'Cook chicken until golden brown and cooked through, about 5-7 minutes per side. Remove and set aside.', time: '12:00' },
  { number: 3, text: 'In the same skillet, saute minced garlic until fragrant. Add sun-dried tomatoes and spinach.', time: '3:00' },
];

export default function CookingModeScreen({ route, navigation }) {
  const { recipe } = route.params;
  const [currentStep, setCurrentStep] = useState(0);
  const steps = recipe.steps || mockSteps;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <View className="flex-1 bg-dark">
      <StatusBar barStyle="light-content" />
      <SafeAreaView className="flex-1">
        <View className="px-6 py-4 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-white font-bold text-sm" numberOfLines={1}>{recipe.title}</Text>
            <Text className="text-stone-400 text-[10px]">Step {currentStep + 1} of {steps.length}</Text>
          </View>
          <View className="w-8" />
        </View>

        <View className="px-6 py-2">
          <View className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>

        <View className="flex-1 items-center justify-center px-10 space-y-12">
          <Text className="text-primary text-8xl font-bold opacity-20">
            {steps[currentStep].number}
          </Text>
          <Text className="text-white text-3xl font-medium text-center leading-tight">
            {steps[currentStep].text}
          </Text>

          {steps[currentStep].time && (
            <View className="flex-row items-center space-x-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
              <Ionicons name="timer-outline" size={24} color="#f97316" />
              <Text className="text-white text-2xl font-bold">{steps[currentStep].time}</Text>
            </View>
          )}
        </View>

        <View className="p-8 flex-row justify-between items-center">
          <TouchableOpacity
            onPress={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className={`px-6 py-4 rounded-2xl border border-white/20 ${currentStep === 0 ? 'opacity-30' : ''}`}
          >
            <Text className="text-white font-bold">PREVIOUS</Text>
          </TouchableOpacity>

          {currentStep === steps.length - 1 ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="bg-primary px-10 py-4 rounded-2xl shadow-lg shadow-orange-900"
            >
              <Text className="text-white font-bold text-lg">FINISH</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setCurrentStep(currentStep + 1)}
              className="bg-primary px-10 py-4 rounded-2xl shadow-lg shadow-orange-900"
            >
              <Text className="text-white font-bold text-lg">NEXT STEP</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
