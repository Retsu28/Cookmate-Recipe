import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Camera, ChefHat, Search } from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to CookMate',
    description: 'Your personal AI-powered sous-chef. Discover, cook, and master recipes with ease.',
    icon: <ChefHat className="w-16 h-16 text-orange-500 mb-6" />,
    primaryCta: 'Get Started',
  },
  {
    id: 'discover',
    title: 'Find Your Next Meal',
    description: 'Browse thousands of recipes or search for exactly what you are craving.',
    icon: <Search className="w-16 h-16 text-orange-500 mb-6" />,
    primaryCta: 'Next',
  },
  {
    id: 'ai-camera',
    title: 'Scan Your Ingredients',
    description: 'Not sure what to make? Scan your fridge and let our AI suggest recipes instantly. (Requires internet connection)',
    icon: <Camera className="w-16 h-16 text-orange-500 mb-6" />,
    primaryCta: 'Next',
  },
  {
    id: 'preferences',
    title: 'How would you rate your cooking skills?',
    description: 'We will use this to recommend the best recipes for you.',
    isPreferences: true,
    primaryCta: 'Finish',
  }
];

export default function Onboarding() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [skillLevel, setSkillLevel] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (hasSeenOnboarding === 'true') {
      navigate('/');
    }
  }, [navigate]);

  const currentStep = ONBOARDING_STEPS[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = () => {
    if (skillLevel) {
      localStorage.setItem('userSkillLevel', skillLevel);
    }
    localStorage.setItem('hasSeenOnboarding', 'true');
    // Push the user to their first meaningful action
    navigate('/');
  };

  const skipOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-xl rounded-2xl overflow-hidden border-none">
        <CardContent className="p-8 flex flex-col items-center text-center min-h-[400px]">

          <div className="flex-1 flex flex-col items-center justify-center w-full">
            {!currentStep.isPreferences ? (
              <>
                {currentStep.icon}
                <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-50 mb-4">{currentStep.title}</h1>
                <p className="text-stone-600 mb-8 leading-relaxed">{currentStep.description}</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-50 mb-4">{currentStep.title}</h1>
                <p className="text-stone-600 mb-8">{currentStep.description}</p>
                <div className="w-full flex flex-col gap-3 mb-8">
                  {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setSkillLevel(level)}
                      className={`py-3 px-4 rounded-xl border-2 transition-all ${skillLevel === level
                          ? 'border-orange-500 bg-orange-50 text-orange-700 dark:text-orange-300 font-medium'
                          : 'border-stone-200 text-stone-600 dark:text-stone-300 hover:border-orange-200 hover:bg-orange-50/50'
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="w-full mt-auto flex flex-col gap-3">
            <Button
              onClick={handleNext}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-6 text-lg font-medium"
            >
              {currentStep.primaryCta}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>

            <button
              onClick={skipOnboarding}
              className="text-stone-400 dark:text-stone-300 hover:text-stone-600 dark:hover:text-stone-100 font-medium py-2 transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex gap-2 mt-6">
            {ONBOARDING_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${idx === currentStepIndex ? 'w-6 bg-orange-500' : 'w-2 bg-orange-200'
                  }`}
              />
            ))}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
