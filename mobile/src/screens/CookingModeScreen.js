import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
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
    <View style={st.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={st.flex1}>
        {/* Header — matches web GuidedCooking header */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.closeBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle} numberOfLines={1}>{recipe.title}</Text>
            <Text style={st.headerSub}>Step {currentStep + 1} of {steps.length}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress bar */}
        <View style={st.progressWrap}>
          <View style={st.progressBg}>
            <View style={[st.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Step content — matches web center area */}
        <View style={st.content}>
          <View style={st.stepBadge}>
            <Text style={st.stepBadgeText}>{steps[currentStep].number}</Text>
          </View>
          <Text style={st.stepText}>{steps[currentStep].text}</Text>

          {steps[currentStep].time && (
            <View style={st.timerCard}>
              <Ionicons name="timer-outline" size={28} color="#f97316" />
              <Text style={st.timerText}>{steps[currentStep].time}:00</Text>
              <Text style={st.timerLabel}>Timer ready</Text>
              <TouchableOpacity style={st.timerBtn}>
                <Text style={st.timerBtnText}>START TIMER</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer — matches web footer controls */}
        <View style={st.footer}>
          <TouchableOpacity
            onPress={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            style={[st.prevBtn, currentStep === 0 && { opacity: 0.3 }]}
          >
            <Text style={st.prevBtnText}>PREVIOUS</Text>
          </TouchableOpacity>

          {currentStep === steps.length - 1 ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={[st.nextBtn, { backgroundColor: '#f97316' }]}>
              <Text style={st.nextBtnText}>FINISH</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setCurrentStep(currentStep + 1)} style={st.nextBtn}>
              <Text style={st.nextBtnText}>NEXT STEP</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#24160f' },
  flex1: { flex: 1 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontFamily: 'Geist_700Bold', fontSize: 16, color: '#fff' },
  headerSub: { fontFamily: 'Geist_400Regular', fontSize: 11, color: '#a8a29e', marginTop: 2 },
  // Progress
  progressWrap: { paddingHorizontal: 20, paddingVertical: 10 },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f97316' },
  // Content
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  stepBadge: { width: 64, height: 64, backgroundColor: 'rgba(249,115,22,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderRadius: 20 },
  stepBadgeText: { fontFamily: 'Geist_800ExtraBold', fontSize: 28, color: '#fb923c' },
  stepText: { fontFamily: 'Geist_500Medium', fontSize: 26, color: '#fff', textAlign: 'center', lineHeight: 36, marginBottom: 28 },
  timerCard: { alignItems: 'center', gap: 6, paddingVertical: 20, paddingHorizontal: 28, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24 },
  timerText: { fontFamily: 'Geist_800ExtraBold', fontSize: 32, color: '#fff' },
  timerLabel: { fontFamily: 'Geist_400Regular', fontSize: 12, color: '#a8a29e' },
  timerBtn: { marginTop: 10, backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999 },
  timerBtnText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1.5, color: '#ea580c' },
  // Footer
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0c0a09' },
  prevBtn: { paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 999 },
  prevBtnText: { fontFamily: 'Geist_700Bold', fontSize: 12, letterSpacing: 1.5, color: '#fff' },
  nextBtn: { backgroundColor: '#f97316', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 999 },
  nextBtnText: { fontFamily: 'Geist_700Bold', fontSize: 14, letterSpacing: 1, color: '#fff' },
});
