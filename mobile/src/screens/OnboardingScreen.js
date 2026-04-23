import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  useWindowDimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to CookMate',
    description: 'Your personal AI-powered sous-chef. Discover, cook, and master recipes with ease.',
    icon: 'restaurant-outline',
    primaryCta: 'Get Started',
  },
  {
    id: 'discover',
    title: 'Find Your Next Meal',
    description: 'Browse thousands of recipes or search for exactly what you are craving.',
    icon: 'search-outline',
    primaryCta: 'Next',
  },
  {
    id: 'ai-camera',
    title: 'Scan Your Ingredients',
    description: 'Not sure what to make? Scan your fridge and let our AI suggest recipes instantly. (Requires internet connection)',
    icon: 'camera-outline',
    primaryCta: 'Next',
  },
  {
    id: 'preferences',
    title: 'Your Cooking Skills?',
    description: 'We will use this to recommend the best recipes for you.',
    isPreferences: true,
    primaryCta: 'Finish',
  }
];

export default function OnboardingScreen({ navigation }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [skillLevel, setSkillLevel] = useState(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
        if (hasSeen === 'true') {
          navigation.replace('Main');
        }
      } catch (e) {
        console.error('Failed to check onboarding status', e);
      }
    };
    checkOnboardingStatus();
  }, [navigation]);

  const currentStep = ONBOARDING_STEPS[currentStepIndex];

  const handleNext = async () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      if (skillLevel) {
        await AsyncStorage.setItem('userSkillLevel', skillLevel);
      }
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      navigation.replace('Main');
    } catch (e) {
      console.error('Failed to save onboarding status', e);
      navigation.replace('Main'); // Fallback
    }
  };

  const skipOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (e) {
      console.error('Failed to save onboarding status', e);
    }
    navigation.replace('Main');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        <View style={styles.slideContainer}>
          {!currentStep.isPreferences ? (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name={currentStep.icon} size={80} color="#f97316" />
              </View>
              <Text style={styles.title}>{currentStep.title}</Text>
              <Text style={styles.description}>{currentStep.description}</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>{currentStep.title}</Text>
              <Text style={styles.description}>{currentStep.description}</Text>
              
              <View style={styles.preferencesContainer}>
                {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.skillButton,
                      skillLevel === level && styles.skillButtonActive
                    ]}
                    onPress={() => setSkillLevel(level)}
                  >
                    <Text style={[
                      styles.skillButtonText,
                      skillLevel === level && styles.skillButtonTextActive
                    ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleNext}
          >
            <Text style={styles.primaryButtonText}>{currentStep.primaryCta}</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" style={styles.buttonIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={skipOnboarding}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.pagination}>
            {ONBOARDING_STEPS.map((_, idx) => (
              <View 
                key={idx} 
                style={[
                  styles.dot, 
                  idx === currentStepIndex ? styles.activeDot : null
                ]} 
              />
            ))}
          </View>
        </View>
        
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff7ed', // orange-50
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffedd5', // orange-100
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#292524', // stone-800
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#57534e', // stone-600
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  preferencesContainer: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  skillButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e7e5e4', // stone-200
    alignItems: 'center',
  },
  skillButtonActive: {
    borderColor: '#f97316', // orange-500
    backgroundColor: '#ffedd5', // orange-100
  },
  skillButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#57534e', // stone-600
  },
  skillButtonTextActive: {
    color: '#c2410c', // orange-700
  },
  footer: {
    width: '100%',
    paddingBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#f97316', // orange-500
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#a8a29e', // stone-400
    fontSize: 16,
    fontWeight: '500',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fed7aa', // orange-200
  },
  activeDot: {
    width: 24,
    backgroundColor: '#f97316', // orange-500
  },
});
