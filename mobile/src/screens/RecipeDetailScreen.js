import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import { plannerApi, recipeApi } from '../api/api';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import OptimizedImage from '../components/OptimizedImage';
import ReviewSection from '../components/ReviewSection';
import AIAssistantWidget from '../components/AIAssistantWidget';
import { RecipeDetailSkeleton } from '../components/SkeletonPlaceholder';
import { useNetwork, OFFLINE_MESSAGE } from '../offline/network';
import { getRecipeByIdCached, offlineCache } from '../offline/cacheService';
import {
  isRecipeDownloaded,
  downloadRecipeForOffline,
  removeRecipeFromOffline,
  getLocalVideoPath,
} from '../offline/recipeDownload';
import { getDeviceTimezone } from '../lib/timezone';

const fallbackRecipes = {
  1: {
    id: 1,
    title: 'Creamy Tuscan Chicken',
    description: 'A rich and savory Italian-inspired dish with sun-dried tomatoes and fresh spinach.',
    image: 'https://picsum.photos/seed/tuscan/600/400',
    time: '35 min',
    prepTime: '15 min',
    difficulty: 'Medium',
    servings: 4,
    rating: 4.8,
    category: 'Italian',
    ingredients: [
      { name: 'Chicken Breast', amount: '2', unit: 'pcs' },
      { name: 'Heavy Cream', amount: '1', unit: 'cup' },
      { name: 'Sun-dried Tomatoes', amount: '1/2', unit: 'cup' },
      { name: 'Spinach', amount: '2', unit: 'cups' },
      { name: 'Garlic (minced)', amount: '3', unit: 'cloves' },
      { name: 'Parmesan Cheese', amount: '1/3', unit: 'cup' },
    ],
    steps: [
      { number: 1, text: 'Season chicken with salt and pepper. In a large skillet, heat olive oil over medium-high heat.', time: '5:00' },
      { number: 2, text: 'Cook chicken until golden brown and cooked through, about 5-7 minutes per side. Remove and set aside.', time: '12:00' },
      { number: 3, text: 'In the same skillet, saute minced garlic until fragrant. Add sun-dried tomatoes and spinach. Cook until wilted.', time: '3:00' },
    ],
    nutrition: { calories: 450, protein: '42g', carbs: '12g', fat: '26g' },
  },
  2: { id: 2, title: 'Spicy Miso Ramen', image: 'https://picsum.photos/seed/ramen/600/400', time: '45 min', prepTime: '20 min', difficulty: 'Hard', servings: 2, rating: 4.9, category: 'Japanese', ingredients: ['Ramen noodles', 'Miso paste', 'Chili oil', 'Soft boiled eggs'], nutrition: { calories: 520, protein: '28g', carbs: '58g', fat: '20g' } },
  3: { id: 3, title: 'Honey Garlic Salmon', image: 'https://picsum.photos/seed/salmon/600/400', time: '20 min', prepTime: '10 min', difficulty: 'Easy', servings: 2, rating: 4.7, category: 'Seafood', ingredients: ['Salmon fillets', 'Honey', 'Garlic', 'Soy sauce'], nutrition: { calories: 380, protein: '36g', carbs: '18g', fat: '14g' } },
};

const mealTypes = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
];

const defaultMealTimes = {
  breakfast: { start: '07:00', end: '08:00' },
  lunch: { start: '11:00', end: '14:00' },
  dinner: { start: '18:00', end: '20:00' },
};

function sanitizeTimeDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4);
}

function toTime12Input(value) {
  const [rawHour, rawMinute] = String(value || '').split(':');
  const hour24 = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return { digits: '', period: 'AM' };
  }

  const hour12 = hour24 % 12 || 12;
  return {
    digits: `${String(hour12).padStart(2, '0')}${String(minute).padStart(2, '0')}`,
    period: hour24 >= 12 ? 'PM' : 'AM',
  };
}

function parseTime12Input(value, period) {
  const digits = sanitizeTimeDigits(value);
  if (digits.length < 3) return null;

  const padded = digits.length === 3 ? `0${digits}` : digits;
  const hour12 = Number(padded.slice(0, 2));
  const minute = Number(padded.slice(2, 4));
  if (!Number.isInteger(hour12) || !Number.isInteger(minute)) return null;
  if (hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) return null;

  const normalizedPeriod = period === 'PM' ? 'PM' : 'AM';
  const hour24 = normalizedPeriod === 'PM' ? (hour12 % 12) + 12 : hour12 % 12;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function timeToMinutes(value) {
  const [hour, minute] = String(value || '').split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function todayInputValue() {
  return format(new Date(), 'yyyy-MM-dd');
}

function formatSelectedPlannerDate(value) {
  return format(parseISO(value), 'EEEE, MMM d, yyyy');
}

function InlineDatePicker({ visible, selected, onSelect, onClose, colors }) {
  const selectedDate = parseISO(selected);
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const [year, setYear] = useState(selectedDate.getFullYear());
  const [month, setMonth] = useState(selectedDate.getMonth());
  const years = Array.from({ length: 10 }, (_, i) => today.getFullYear() + i);
  const months = Array.from({ length: 12 }, (_, i) => i);
  const days = Array.from({ length: getDaysInMonth(new Date(year, month, 1)) }, (_, i) => i + 1);
  if (!visible) return null;
  return (
    <View style={[ipSt.dateWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={ipSt.dateHeader}>
        <Text style={[ipSt.dateTitle, { color: colors.textSubtle }]}>SELECT DATE</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ipSt.dateSegmentRow}>
        {years.map((item) => {
          const active = item === year;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => setYear(item)}
              style={[ipSt.dateSegment, active && { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Text style={[ipSt.dateSegmentText, { color: active ? '#fff' : colors.text }]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ipSt.dateSegmentRow}>
        {months.map((item) => {
          const active = item === month;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => setMonth(item)}
              style={[ipSt.dateSegment, active && { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Text style={[ipSt.dateSegmentText, { color: active ? '#fff' : colors.text }]}>
                {format(new Date(year, item, 1), 'MMM').toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {days.map((day) => {
          const item = format(new Date(year, month, day), 'yyyy-MM-dd');
          const disabled = item < todayKey;
          const active = item === selected;
          const label = format(new Date(year, month, day), 'EEE, MMM d, yyyy');
          return (
            <TouchableOpacity
              key={item}
              onPress={() => !disabled && onSelect(item)}
              disabled={disabled}
              style={[ipSt.dateItem, active && { backgroundColor: colors.primary }, disabled && { opacity: 0.35 }]}
              activeOpacity={0.7}
            >
              <Text style={[ipSt.dateItemText, { color: active ? '#fff' : colors.text }]}>{label}</Text>
              {active && <Ionicons name="checkmark" size={14} color="#fff" />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const WHEEL_ITEM_H = 48;
const WHEEL_VISIBLE = 3;

function WheelColumn({ items, selected, onSelect, colors }) {
  const scrollRef = useRef(null);
  const idx = items.indexOf(selected);

  useEffect(() => {
    if (scrollRef.current && idx >= 0) {
      scrollRef.current.scrollTo({ y: idx * WHEEL_ITEM_H, animated: false });
    }
  }, []);

  const onMomentumEnd = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const snapped = Math.round(y / WHEEL_ITEM_H);
    const clamped = Math.max(0, Math.min(snapped, items.length - 1));
    onSelect(items[clamped]);
  };

  return (
    <View style={ipSt.wheelOuter}>
      {/* selection highlight */}
      <View pointerEvents="none" style={[ipSt.wheelHighlight, { borderColor: colors.primary, top: WHEEL_ITEM_H }]} />
      <ScrollView
        ref={scrollRef}
        style={ipSt.wheelScroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_H }}
        nestedScrollEnabled
      >
        {items.map((item) => {
          const active = item === selected;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => {
                const i = items.indexOf(item);
                scrollRef.current?.scrollTo({ y: i * WHEEL_ITEM_H, animated: true });
                onSelect(item);
              }}
              activeOpacity={0.7}
              style={ipSt.wheelItem}
            >
              <Text style={[ipSt.wheelItemText, { color: active ? colors.primary : colors.textMuted, fontFamily: active ? 'Geist_800ExtraBold' : 'Geist_400Regular' }]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function InlineTimePicker({ visible, hour12, period, onConfirm, onClose, colors }) {
  const hours = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const minutes = ['00','05','10','15','20','25','30','35','40','45','50','55'];

  const initHour = String(Math.min(12, Math.max(1, Number(hour12?.slice(0, 2)) || 6))).padStart(2,'0');
  const initMinRaw = Math.round((Number(hour12?.slice(2, 4)) || 0) / 5) * 5 % 60;
  const initMin = String(initMinRaw).padStart(2,'0');

  const [selHour, setSelHour] = useState(initHour);
  const [selMin, setSelMin] = useState(initMin);
  const [selPeriod, setSelPeriod] = useState(period || 'AM');

  if (!visible) return null;

  const confirm = () => {
    onConfirm(`${selHour}${selMin}`, selPeriod);
  };

  return (
    <View style={[ipSt.timeWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={ipSt.dateHeader}>
        <Text style={[ipSt.dateTitle, { color: colors.textSubtle }]}>SELECT TIME</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={ipSt.clockRow}>
        <WheelColumn items={hours} selected={selHour} onSelect={setSelHour} colors={colors} />
        <Text style={[ipSt.clockColon, { color: colors.text }]}>:</Text>
        <WheelColumn items={minutes} selected={selMin} onSelect={setSelMin} colors={colors} />

        <View style={ipSt.clockPeriodCol}>
          {['AM', 'PM'].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setSelPeriod(p)}
              style={[ipSt.clockPeriodBtn, { backgroundColor: selPeriod === p ? colors.primary : colors.background, borderColor: selPeriod === p ? colors.primary : colors.border }]}
              activeOpacity={0.8}
            >
              <Text style={[ipSt.clockPeriodText, { color: selPeriod === p ? '#fff' : colors.textSubtle }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity onPress={confirm} style={[ipSt.timeConfirm, { backgroundColor: colors.primary }]}>
        <Text style={ipSt.timeConfirmText}>SET TIME</Text>
      </TouchableOpacity>
    </View>
  );
}

const ipSt = StyleSheet.create({
  dateWrap: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginTop: 4 },
  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  dateTitle: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
  dateSegmentRow: { gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  dateSegment: { minWidth: 64, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  dateSegmentText: { fontFamily: 'Geist_700Bold', fontSize: 12 },
  dateItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  dateItemText: { fontFamily: 'Geist_500Medium', fontSize: 13 },
  timeWrap: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginTop: 4 },
  clockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  clockColon: { fontFamily: 'Geist_800ExtraBold', fontSize: 28, opacity: 0.6 },
  clockPeriodCol: { gap: 8, alignItems: 'center', justifyContent: 'center' },
  clockPeriodBtn: { width: 52, height: 40, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  clockPeriodText: { fontFamily: 'Geist_700Bold', fontSize: 13 },
  wheelOuter: { width: 70, height: WHEEL_ITEM_H * WHEEL_VISIBLE, overflow: 'hidden', position: 'relative' },
  wheelHighlight: { position: 'absolute', left: 4, right: 4, height: WHEEL_ITEM_H, borderTopWidth: 1.5, borderBottomWidth: 1.5, zIndex: 1 },
  wheelScroll: { flex: 1 },
  wheelItem: { height: WHEEL_ITEM_H, alignItems: 'center', justifyContent: 'center' },
  wheelItemText: { fontSize: 22, textAlign: 'center' },
  timeConfirm: { margin: 8, borderRadius: 8, height: 44, alignItems: 'center', justifyContent: 'center' },
  timeConfirmText: { fontFamily: 'Geist_700Bold', fontSize: 11, letterSpacing: 1.5, color: '#fff' },
});

export default function RecipeDetailScreen({ route, navigation }) {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const { id } = route.params;
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadedFromApi, setLoadedFromApi] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [reviewStats, setReviewStats] = useState(null);
  const [planDate, setPlanDate] = useState(todayInputValue());
  const [planMealType, setPlanMealType] = useState('breakfast');
  const [planReminderEnabled, setPlanReminderEnabled] = useState(true);
  const [planCustomTimeEnabled, setPlanCustomTimeEnabled] = useState(false);
  const [planStartTimeInput, setPlanStartTimeInput] = useState(toTime12Input(defaultMealTimes.breakfast.start).digits);
  const [planStartPeriod, setPlanStartPeriod] = useState(toTime12Input(defaultMealTimes.breakfast.start).period);
  const [planEndTimeInput, setPlanEndTimeInput] = useState(toTime12Input(defaultMealTimes.breakfast.end).digits);
  const [planEndPeriod, setPlanEndPeriod] = useState(toTime12Input(defaultMealTimes.breakfast.end).period);
  const [planning, setPlanning] = useState(false);
  const [plannerKeyboardHeight, setPlannerKeyboardHeight] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [reviewKey, setReviewKey] = useState(0);
  const heartScale = useRef(new Animated.Value(1)).current;
  const downloadScale = useRef(new Animated.Value(1)).current;
  const aiChatRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      setReviewKey(prev => prev + 1);
    }, [])
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const startTime24 = planCustomTimeEnabled
    ? parseTime12Input(planStartTimeInput, planStartPeriod)
    : defaultMealTimes[planMealType]?.start;
  const endTime24 = planCustomTimeEnabled
    ? parseTime12Input(planEndTimeInput, planEndPeriod)
    : defaultMealTimes[planMealType]?.end;

  // Check if already downloaded for offline
  useEffect(() => {
    if (!id) return;
    isRecipeDownloaded(id).then(setIsDownloaded);
  }, [id]);

  const handleDownloadToggle = async () => {
    if (!recipe) return;
    if (isDownloaded) {
      await removeRecipeFromOffline(recipe.id);
      setIsDownloaded(false);
      Alert.alert('Removed', 'Offline copy deleted.');
      return;
    }
    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to download recipes.');
      return;
    }
    setDownloading(true);
    setDownloadProgress(0);
    Animated.sequence([
      Animated.timing(downloadScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(downloadScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    try {
      await downloadRecipeForOffline(recipe, setDownloadProgress);
      setIsDownloaded(true);
      const hasVideo = !!recipe.video_filename;
      Alert.alert(
        'Downloaded!',
        hasVideo
          ? `${recipe.title} + video saved to CookMate/recipes/`
          : `${recipe.title} saved for offline use.`,
      );
    } catch (err) {
      Alert.alert('Download failed', err?.message || 'Please try again.');
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  useEffect(() => {
    const fetchRecipe = async () => {
      setLoadedFromApi(false);
      try {
        // Read-through cache: online → API + cache; offline → SQLite.
        const response = await getRecipeByIdCached(id, () => recipeApi.getById(id));
        const r = response.data?.recipe || response.data;
        // Normalize API fields to match component expectations
        const normalized = {
          ...r,
          image: r.image_url || r.image || null,
          time: r.total_time_minutes ? `${r.total_time_minutes} min` : r.time || '30 min',
          prepTime: r.prep_time_minutes ? `${r.prep_time_minutes} min` : r.prepTime || '',
          ingredients: r.ingredients || (r.normalized_ingredients || []).map((name, i) => ({ name, amount: '', unit: '' })),
          steps: r.instructions
            ? r.instructions.map((text, i) => ({ number: i + 1, text, time: null }))
            : r.steps || [],
          video_filename: r.video_filename || null,
          instruction_timestamps: r.instruction_timestamps || [],
          video_credits: r.video_credits || null,
          nutrition: r.nutrition || {
            calories: r.calories || 0,
            protein: r.protein_g ? `${r.protein_g}g` : '—',
            carbs: r.carbs_g ? `${r.carbs_g}g` : '—',
            fat: r.fat_g ? `${r.fat_g}g` : '—',
          },
        };
        setRecipe(normalized);
        setLoadedFromApi(true);
      } catch (error) {
        console.error('Failed to fetch recipe', error);
        const fallback = fallbackRecipes[id] || fallbackRecipes[1];
        setRecipe(fallback);
        setLoadedFromApi(false);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [id]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setPlannerKeyboardHeight(event.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setPlannerKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!plannerOpen) {
      setPlannerKeyboardHeight(0);
      setShowDatePicker(false);
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
    }
  }, [plannerOpen]);

  // Record the view in the database (fire-and-forget)
  useEffect(() => {
    if (!loadedFromApi || !recipe?.id || !user?.id) return;
    recipeApi.recordView(recipe.id).catch(() => {
      /* silently ignore — view tracking is best-effort */
    });
  }, [loadedFromApi, recipe?.id, user?.id]);

  // Check if recipe is saved
  useEffect(() => {
    if (!recipe?.id || !user?.id) return;
    recipeApi.getSavedStatus(recipe.id)
      .then(res => setIsSaved(res.data?.saved === true))
      .catch(() => {});
  }, [recipe?.id, user?.id]);

  const toggleSave = async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to save recipes.');
      return;
    }
    if (savingRecipe) return;
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 30 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    const next = !isSaved;
    setIsSaved(next);
    setSavingRecipe(true);
    try {
      if (next) {
        await recipeApi.saveRecipe(recipe.id);
        // Auto-download for offline when saving — silent background download
        if (recipe && isOnline && !isDownloaded) {
          downloadRecipeForOffline(recipe, () => {})
            .then(() => {
              setIsDownloaded(true);
              Alert.alert(
                'Saved & Downloaded',
                recipe.video_filename
                  ? 'Recipe + video saved for offline use.'
                  : 'Recipe saved for offline use.',
              );
            })
            .catch(() => {
              // Download failed silently — save still succeeded
            });
        } else {
          Alert.alert('Saved', `"${recipe.title}" added to your saved recipes.`);
        }
      } else {
        await recipeApi.unsaveRecipe(recipe.id);
      }
    } catch (err) {
      setIsSaved(!next);
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update saved recipe.');
    } finally {
      setSavingRecipe(false);
    }
  };

  const applyPlanTimes = (start, end) => {
    const nextStart = toTime12Input(start);
    const nextEnd = toTime12Input(end);
    setPlanStartTimeInput(nextStart.digits);
    setPlanStartPeriod(nextStart.period);
    setPlanEndTimeInput(nextEnd.digits);
    setPlanEndPeriod(nextEnd.period);
  };

  const openPlanner = () => {
    setPlanDate(todayInputValue());
    setPlanMealType('breakfast');
    setPlanReminderEnabled(true);
    setPlanCustomTimeEnabled(false);
    applyPlanTimes(defaultMealTimes.breakfast.start, defaultMealTimes.breakfast.end);
    setPlannerOpen(true);
  };

  const updateStartTimeInput = (value) => {
    const digits = sanitizeTimeDigits(value);
    setPlanStartTimeInput(digits);
  };

  const updateEndTimeInput = (value) => {
    const digits = sanitizeTimeDigits(value);
    setPlanEndTimeInput(digits);
  };

  const updateStartPeriod = (period) => {
    setPlanStartPeriod(period);
  };

  const updateEndPeriod = (period) => {
    setPlanEndPeriod(period);
  };

  const savePlan = async () => {
    if (!isOnline) {
      Alert.alert('You are offline', OFFLINE_MESSAGE);
      return;
    }
    if (!recipe?.id || !planDate || !planMealType) {
      Alert.alert('Choose a date and meal type first.');
      return;
    }

    const startTimeForPlan = planCustomTimeEnabled
      ? parseTime12Input(planStartTimeInput, planStartPeriod)
      : defaultMealTimes[planMealType].start;
    const endTimeForPlan = planCustomTimeEnabled
      ? parseTime12Input(planEndTimeInput, planEndPeriod)
      : defaultMealTimes[planMealType].end;
    const startMinutes = timeToMinutes(startTimeForPlan);
    const endMinutes = timeToMinutes(endTimeForPlan);

    if (!startTimeForPlan || !endTimeForPlan || startMinutes == null || endMinutes == null || startMinutes >= endMinutes) {
      Alert.alert('Invalid custom time', 'Use a valid 12-hour start and end time.');
      return;
    }

    setPlanning(true);
    try {
      const response = await plannerApi.assignMeal({
        recipe_id: recipe.id,
        planned_date: planDate,
        meal_type: planMealType,
        reminder_enabled: planReminderEnabled,
        custom_time_enabled: planCustomTimeEnabled,
        start_time: startTimeForPlan,
        end_time: endTimeForPlan,
        timezone: getDeviceTimezone(),
      });
      const newPlan = response?.data?.plan;
      if (newPlan?.id) {
        offlineCache.mealPlans.upsert(newPlan.id, newPlan).catch(() => {});
      }
      setPlannerOpen(false);
      Alert.alert(
        'Added to Meal Planner',
        `${recipe.title} was added to your planner.`,
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Open Planner',
            onPress: () => navigation.navigate('Main', { screen: 'Planner', params: { plannedDate: planDate } }),
          },
        ],
      );
    } catch (err) {
      Alert.alert('Planner save failed', err?.message || 'Please try again.');
    } finally {
      setPlanning(false);
    }
  };

  if (loading) {
    return <RecipeDetailSkeleton colors={colors} />;
  }

  if (!recipe) return null;

  const ings = recipe.ingredients || [];
  const steps = recipe.steps || fallbackRecipes[1].steps;
  const nutr = recipe.nutrition || fallbackRecipes[1].nutrition;

  return (
    <View style={[st.flex1, { backgroundColor: colors.background }]}>
      <ScrollView style={st.flex1} showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={st.heroWrap}>
          <OptimizedImage source={{ uri: recipe.image }} style={st.heroImg} resizeMode="cover" />
          <View style={st.heroOverlay} />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[st.backBtn, { backgroundColor: isDark ? 'rgba(28,25,23,0.8)' : 'rgba(255,255,255,0.85)' }]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleSave}
            style={[st.heroHeartBtn, { backgroundColor: isDark ? 'rgba(28,25,23,0.8)' : 'rgba(255,255,255,0.85)' }]}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={22} color={isSaved ? '#ef4444' : colors.text} />
            </Animated.View>
          </TouchableOpacity>
          {/* Floating category badge */}
          <View style={st.heroBadge}>
            <Text style={st.heroBadgeText}>{recipe.category || 'CHEF PICK'}</Text>
          </View>
        </View>

        <View style={[st.body, { backgroundColor: colors.background }]}>
          {/* Title + Rating */}
          <View style={st.titleRow}>
            <Text style={[st.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>
            <View style={st.ratingBox}>
              <Ionicons name="star" size={14} color={colors.amber} />
              <Text style={[st.ratingText, { color: colors.text }]}>
                {reviewStats?.avg_rating 
                  ? Number(reviewStats.avg_rating).toFixed(1) 
                  : (reviewStats && reviewStats.total_reviews === 0 ? '0.0' : (recipe?.avg_rating ? Number(recipe.avg_rating).toFixed(1) : '0.0'))}
              </Text>
            </View>
          </View>

          {recipe.description && (
            <Text style={[st.desc, { color: colors.textMuted }]}>{recipe.description}</Text>
          )}

          {/* Info grid — matches web */}
          <View style={st.infoGrid}>
            {[
              { label: 'PREP TIME', value: recipe.prepTime || '15 min' },
              { label: 'COOK TIME', value: recipe.time || '35 min' },
              { label: 'DIFFICULTY', value: recipe.difficulty || 'Medium' },
            ].map((item, i) => (
              <View key={i} style={[{ width: '33.33%', paddingVertical: 16, paddingHorizontal: 4, borderWidth: 0.5, alignItems: 'center', borderColor: colors.border }]}>
                <Text style={[st.infoCellLabel, { color: colors.textSubtle }]}>{item.label}</Text>
                <Text style={[st.infoCellValue, { color: colors.text }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Plan This Meal CTA */}
          <View style={[st.planMealCta, { backgroundColor: isDark ? 'rgba(249,115,22,0.1)' : 'rgba(255,237,213,0.8)', borderColor: isDark ? 'rgba(249,115,22,0.2)' : 'rgba(254,215,170,0.8)' }]}>
            <View style={st.planMealCtaText}>
              <Text style={[st.planMealCtaTitle, { color: colors.text }]}>Plan This Meal</Text>
              <Text style={[st.planMealCtaDesc, { color: colors.textSubtle }]}>Add to your meal planner to get a grocery list and reminders.</Text>
            </View>
            <TouchableOpacity onPress={openPlanner} style={[st.planMealCtaBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="calendar" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={st.planMealCtaBtnText}>Add to Meal Plan</Text>
            </TouchableOpacity>
          </View>

          {/* Ingredients - Simple List */}
          <View style={st.section}>
            <Text style={[st.sectionLabel, { color: colors.text, fontSize: 22, fontFamily: 'Geist_700Bold', textTransform: 'none', marginBottom: 16, letterSpacing: 0 }]}>Ingredients</Text>
            {ings.map((ing, i) => {
              const name = ing.name || ing;
              const amount = ing.amount ? `${ing.amount} ${ing.unit || ''}` : '';
              return (
                <View key={i} style={st.simpleIngRow}>
                  <Text style={[st.simpleIngBullet, { color: colors.primary }]}>•</Text>
                  <Text style={[st.simpleIngName, { color: colors.text }]}>
                    <Text style={{ textTransform: 'capitalize' }}>{name}</Text>
                    {amount ? <Text style={{ color: colors.textSubtle }}> — {amount}</Text> : null}
                  </Text>
                </View>
              );
            })}
            {ings.length === 0 && (
              <Text style={[st.simpleIngName, { color: colors.textSubtle, fontStyle: 'italic' }]}>No ingredients listed for this recipe.</Text>
            )}
          </View>

          {/* Nutrition Facts — matches web sidebar */}
          <View style={[st.nutritionCard, { backgroundColor: isDark ? colors.surfaceAlt : '#f5f5f4' }]}>
            <Text style={[st.sectionLabel, { color: colors.textSubtle, marginBottom: 14 }]}>NUTRITION FACTS (PER SERVING)</Text>
            {[
              { label: 'Calories', value: `${nutr.calories} kcal`, pct: 70 },
              { label: 'Protein', value: nutr.protein, pct: 85 },
              { label: 'Carbs', value: nutr.carbs, pct: 25 },
              { label: 'Fat', value: nutr.fat, pct: 55 },
            ].map((n, i) => (
              <View key={i} style={st.nutrRow}>
                <View style={st.nutrLabel}>
                  <Text style={[st.nutrName, { color: colors.text }]}>{n.label}</Text>
                  <Text style={[st.nutrValue, { color: colors.textMuted }]}>{n.value}</Text>
                </View>
                <View style={[st.nutrBar, { backgroundColor: isDark ? colors.border : '#e7e5e4' }]}>
                  <View style={[st.nutrBarFill, { width: `${n.pct}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            ))}
          </View>

          {/* Ask AI Assistant */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => aiChatRef.current?.open()}
            style={[st.aiCard, { backgroundColor: colors.primary, padding: 28 }]}
          >
            <View style={st.aiSparkleWrap}>
              <Ionicons name="sparkles" size={36} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={st.aiCardTitle}>Ask AI Assistant</Text>
            <Text style={st.aiCardDesc}>Need a substitute or want to make this recipe differently?</Text>
            <View style={st.aiCardBtn}>
              <Text style={st.aiCardBtnText}>Ask CookMate</Text>
            </View>
          </TouchableOpacity>

          {/* Review Section */}
          <View style={{ marginTop: 16 }}>
            <ReviewSection key={reviewKey} recipeId={id} onStatsChange={setReviewStats} />
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar — matches web */}
      <View style={[st.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={async () => {
            if (!isOnline && !isDownloaded) {
              Alert.alert('You are offline', OFFLINE_MESSAGE);
              return;
            }
            // If downloaded, look up local video path and pass it to cooking mode
            let recipeForCooking = recipe;
            if (isDownloaded && recipe.video_filename) {
              const localPath = await getLocalVideoPath(recipe.id);
              if (localPath) {
                recipeForCooking = { ...recipe, video_filename: localPath };
              }
            }
            navigation.navigate('StartCookingSplash', { recipe: recipeForCooking });
          }}
          activeOpacity={(!isOnline && !isDownloaded) ? 0.9 : 0.7}
          style={[st.cookBtn, { backgroundColor: colors.primary, opacity: (!isOnline && !isDownloaded) ? 0.5 : 1, flex: 1 }]}
        >
          <Ionicons name="play" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={st.cookBtnText}>Start Cooking Guide</Text>
        </TouchableOpacity>

        {/* Download for Offline */}
        <TouchableOpacity
          onPress={handleDownloadToggle}
          activeOpacity={0.7}
          disabled={downloading}
          style={[st.heartBtn, {
            borderColor: isDownloaded ? '#10b981' : colors.border,
            backgroundColor: isDownloaded ? '#ecfdf5' : colors.surfaceAlt,
            overflow: 'hidden',
          }]}
        >
          {/* Progress fill */}
          {downloading && (
            <View
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${downloadProgress}%`,
                backgroundColor: '#fed7aa',
                borderRadius: 999,
              }}
            />
          )}
          <Animated.View style={{ transform: [{ scale: downloadScale }] }}>
            {downloading ? (
              <Ionicons name="cloud-download-outline" size={22} color={colors.primary} />
            ) : isDownloaded ? (
              <Ionicons name="checkmark-circle" size={22} color="#10b981" />
            ) : (
              <Ionicons name="download-outline" size={22} color={colors.text} />
            )}
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleSave}
          style={[st.heartBtn, { borderColor: isSaved ? '#ef4444' : colors.border, backgroundColor: isSaved ? '#fef2f2' : colors.surfaceAlt }]}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={22} color={isSaved ? '#ef4444' : colors.text} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <AIAssistantWidget
        ref={aiChatRef}
        navigation={navigation}
        recipeContext={recipe ? {
          id: recipe.id,
          title: recipe.title,
          ingredients: (recipe.ingredients || []).map(i => i.name || i).filter(Boolean),
          instructions: recipe.steps?.map(s => s.text),
          category: recipe.category,
          region: recipe.region_or_origin,
        } : null}
      />

      <Modal visible={plannerOpen} transparent animationType="slide" onRequestClose={() => setPlannerOpen(false)}>
        <KeyboardAvoidingView
          style={st.modalKeyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              st.modalOverlay,
              Platform.OS === 'android' && plannerKeyboardHeight > 0 && {
                paddingBottom: plannerKeyboardHeight,
              },
            ]}
          >
            <ScrollView
              style={st.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={st.modalScrollContent}
            >
              <View style={[st.modalCard, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={[st.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={st.modalHeaderLeft}>
                <View style={st.modalHeaderIcon}>
                  <Ionicons name="calendar" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.modalEyebrow, { color: colors.primary }]}>ADD TO MEAL PLANNER</Text>
                  <Text style={[st.modalTitle, { color: colors.text }]} numberOfLines={2}>{recipe.title}</Text>
                  {recipe.category ? (
                    <Text style={[st.modalCategory, { color: colors.textMuted }]}>{recipe.category}</Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity onPress={() => setPlannerOpen(false)} style={st.modalClose}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={st.modalBody}>
            <Text style={[st.modalLabel, { color: colors.textSubtle }]}>DATE</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[st.pickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[st.pickerBtnText, { color: colors.text }]}>{formatSelectedPlannerDate(planDate)}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSubtle} />
            </TouchableOpacity>
            <InlineDatePicker
              visible={showDatePicker}
              selected={planDate}
              onSelect={(d) => { setPlanDate(d); setShowDatePicker(false); }}
              onClose={() => setShowDatePicker(false)}
              colors={colors}
            />

            <Text style={[st.modalLabel, { color: colors.textSubtle }]}>MEAL TYPE</Text>
            <View style={st.mealTypeRow}>
              {mealTypes.map((type) => {
                const active = planMealType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    onPress={() => {
                      setPlanMealType(type.id);
                      applyPlanTimes(defaultMealTimes[type.id].start, defaultMealTimes[type.id].end);
                    }}
                    style={[st.mealTypeBtn, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.background }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[st.mealTypeText, { color: active ? '#fff' : colors.text }]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[st.reminderBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TouchableOpacity
                onPress={() => setPlanReminderEnabled((value) => !value)}
                style={st.reminderToggleRow}
                activeOpacity={0.8}
              >
                <Text style={[st.reminderToggleText, { color: colors.text }]}>Meal reminder</Text>
                <View style={[st.switchTrack, { backgroundColor: planReminderEnabled ? colors.primary : colors.border }]}>
                  <View style={[st.switchThumb, planReminderEnabled && st.switchThumbOn]} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPlanCustomTimeEnabled((value) => !value)}
                style={st.reminderToggleRow}
                activeOpacity={0.8}
              >
                <Text style={[st.reminderToggleText, { color: colors.text }]}>Custom time</Text>
                <View style={[st.switchTrack, { backgroundColor: planCustomTimeEnabled ? colors.primary : colors.border }]}>
                  <View style={[st.switchThumb, planCustomTimeEnabled && st.switchThumbOn]} />
                </View>
              </TouchableOpacity>
              <View style={st.timeInputRow}>
                <TouchableOpacity
                  onPress={() => planCustomTimeEnabled && setShowStartTimePicker(true)}
                  style={[st.timePickerBtn, { borderColor: colors.border, backgroundColor: colors.background, opacity: planCustomTimeEnabled ? 1 : 0.45 }]}
                  activeOpacity={planCustomTimeEnabled ? 0.8 : 1}
                >
                  <Ionicons name="time-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[st.timePickerBtnText, { color: colors.text }]}>
                    {startTime24
                      ? (() => { const [h, m] = startTime24.split(':').map(Number); const p = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12; return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${p}`; })()
                      : 'Start time'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => planCustomTimeEnabled && setShowEndTimePicker(true)}
                  style={[st.timePickerBtn, { borderColor: colors.border, backgroundColor: colors.background, opacity: planCustomTimeEnabled ? 1 : 0.45 }]}
                  activeOpacity={planCustomTimeEnabled ? 0.8 : 1}
                >
                  <Ionicons name="time-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[st.timePickerBtnText, { color: colors.text }]}>
                    {endTime24
                      ? (() => { const [h, m] = endTime24.split(':').map(Number); const p = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12; return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${p}`; })()
                      : 'End time'}
                  </Text>
                </TouchableOpacity>
              </View>
              <InlineTimePicker
                visible={showStartTimePicker}
                hour12={planStartTimeInput}
                period={planStartPeriod}
                onConfirm={(digits, period) => { setPlanStartTimeInput(digits); setPlanStartPeriod(period); setShowStartTimePicker(false); }}
                onClose={() => setShowStartTimePicker(false)}
                colors={colors}
              />
              <InlineTimePicker
                visible={showEndTimePicker}
                hour12={planEndTimeInput}
                period={planEndPeriod}
                onConfirm={(digits, period) => { setPlanEndTimeInput(digits); setPlanEndPeriod(period); setShowEndTimePicker(false); }}
                onClose={() => setShowEndTimePicker(false)}
                colors={colors}
              />
            </View>

            </View>
            {/* Footer */}
            <View style={[st.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setPlannerOpen(false)}
                style={[st.modalCancelBtn, { borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Text style={[st.modalCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={savePlan}
                disabled={planning}
                style={[st.modalSaveBtn, { backgroundColor: colors.primary, opacity: planning ? 0.6 : 1 }]}
              >
                <Text style={st.modalSaveText}>{planning ? 'SAVING...' : 'SAVE PLAN'}</Text>
              </TouchableOpacity>
            </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  heroWrap: { width: '100%', height: 320, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' },
  backBtn: { position: 'absolute', top: 48, left: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroHeartBtn: { position: 'absolute', top: 48, right: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', bottom: 20, left: 20, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 14, paddingVertical: 6 },
  heroBadgeText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5, color: '#ea580c', textTransform: 'uppercase' },
  body: { padding: 20, gap: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recipeTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 28, letterSpacing: -0.5, flex: 1, paddingRight: 12, lineHeight: 32 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontFamily: 'Geist_700Bold', fontSize: 14 },
  desc: { fontFamily: 'Geist_400Regular', fontSize: 14, lineHeight: 22 },
  // Info grid
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoCell: { width: '50%', paddingVertical: 16, paddingHorizontal: 4, borderWidth: 0.5, alignItems: 'center' },
  infoCellLabel: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.5, marginBottom: 6 },
  infoCellValue: { fontFamily: 'Geist_700Bold', fontSize: 14 },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Section
  section: { gap: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 0 },
  sectionLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2 },
  // Ingredients
  ingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  ingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  checkbox: { width: 20, height: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ingName: { fontFamily: 'Geist_500Medium', fontSize: 14 },
  ingAmount: { fontFamily: 'Geist_700Bold', fontSize: 12 },
  // Steps
  stepRow: { flexDirection: 'row', paddingVertical: 16, gap: 14 },
  stepNum: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: 'Geist_800ExtraBold', fontSize: 14 },
  stepContent: { flex: 1, gap: 6 },
  stepText: { fontFamily: 'Geist_400Regular', fontSize: 14, lineHeight: 22 },
  stepTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepTimeText: { fontFamily: 'Geist_500Medium', fontSize: 11 },
  // Nutrition
  nutritionCard: { padding: 20 },
  nutrRow: { marginBottom: 14 },
  nutrLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  nutrName: { fontFamily: 'Geist_700Bold', fontSize: 12 },
  nutrValue: { fontFamily: 'Geist_400Regular', fontSize: 12 },
  nutrBar: { height: 6, width: '100%' },
  nutrBarFill: { height: '100%' },
  // AI
  aiCard: { borderRadius: 24, alignItems: 'center', gap: 12, marginBottom: 4 },
  aiSparkleWrap: { marginBottom: 4 },
  aiCardTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 22, color: '#fff', textAlign: 'center' },
  aiCardDesc: { fontFamily: 'Geist_400Regular', fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  aiCardBtn: { marginTop: 8, backgroundColor: '#0a0a0a', borderRadius: 999, paddingHorizontal: 32, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', width: '100%' },
  aiCardBtnText: { fontFamily: 'Geist_700Bold', fontSize: 15, color: '#fff', letterSpacing: 0.2 },
  // Bottom bar
  bottomBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 50, gap: 10, borderTopWidth: 1, alignItems: 'center' },
  heartBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, borderWidth: 1 },
  planBtn: { flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 26 },
  planBtnText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 0.3, flexShrink: 1 },
  cookBtn: { flex: 1.3, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 26 },
  cookBtnText: { fontFamily: 'Geist_700Bold', fontSize: 13, letterSpacing: 0.5, color: '#fff' },
  // Plan Meal CTA
  planMealCta: { flexDirection: 'column', gap: 16, padding: 24, borderRadius: 24, borderWidth: 1, marginTop: 16, marginBottom: 8 },
  planMealCtaText: { gap: 6 },
  planMealCtaTitle: { fontFamily: 'Geist_700Bold', fontSize: 20 },
  planMealCtaDesc: { fontFamily: 'Geist_400Regular', fontSize: 13, lineHeight: 18 },
  planMealCtaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 16 },
  planMealCtaBtnText: { fontFamily: 'Geist_700Bold', color: '#fff', fontSize: 14 },
  // Simple Ingredients
  simpleIngRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, paddingRight: 10 },
  simpleIngBullet: { fontSize: 20, lineHeight: 22, marginRight: 8, fontFamily: 'Geist_800ExtraBold' },
  simpleIngName: { fontFamily: 'Geist_500Medium', fontSize: 15, lineHeight: 22, flex: 1 },
  // Planner modal
  modalKeyboardAvoider: { flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)', paddingTop: 80 },
  modalScroll: { flex: 1 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 48, gap: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  modalHeaderIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(249,115,22,0.18)' },
  modalEyebrow: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.8 },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 18, lineHeight: 24 },
  modalCategory: { fontFamily: 'Geist_500Medium', fontSize: 13 },
  modalBody: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  modalLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.8, marginTop: 4 },
  modalInput: { height: 48, borderWidth: 1, paddingHorizontal: 14, fontFamily: 'Geist_700Bold', fontSize: 14 },
  mealTypeRow: { flexDirection: 'row', gap: 8 },
  mealTypeBtn: { flex: 1, height: 46, borderWidth: 1, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  mealTypeText: { fontFamily: 'Geist_700Bold', fontSize: 11 },
  reminderBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 12 },
  reminderToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderToggleText: { fontFamily: 'Geist_700Bold', fontSize: 13 },
  switchTrack: { width: 44, height: 24, borderRadius: 12, padding: 3 },
  switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  switchThumbOn: { transform: [{ translateX: 20 }] },
  pickerBtn: { height: 48, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  pickerBtnText: { fontFamily: 'Geist_700Bold', fontSize: 14, flex: 1 },
  timeInputRow: { flexDirection: 'row', gap: 8 },
  timePickerBtn: { flex: 1, height: 44, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  timePickerBtnText: { fontFamily: 'Geist_700Bold', fontSize: 12 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, marginTop: 6 },
  modalCancelBtn: { height: 46, borderWidth: 1, borderRadius: 23, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontFamily: 'Geist_700Bold', fontSize: 12, letterSpacing: 0.5 },
  modalSaveBtn: { height: 46, borderRadius: 23, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { fontFamily: 'Geist_700Bold', fontSize: 12, letterSpacing: 1.5, color: '#fff' },
});
