import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import api from '../api/api';

const ICON_MAP = {
  'sun': 'sunny-outline',
  'cloud-rain': 'rainy-outline',
  'snowflake': 'snow-outline',
};

const DEFAULT_BY_MONTH = {
  0: [ // January
    { name: 'Repolyo (Cabbage)', status: 'Peak Season', emoji: '🥬' },
    { name: 'Carrots', status: 'Peak Season', emoji: '🥕' },
    { name: 'Patatas (Potato)', status: 'Peak Season', emoji: '🥔' },
    { name: 'Sayote (Chayote)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Baguio Beans', status: 'Just In', emoji: '🫘' },
    { name: 'Pineapple', status: 'Available', emoji: '🍍' },
  ],
  1: [ // February
    { name: 'Repolyo (Cabbage)', status: 'Peak Season', emoji: '🥬' },
    { name: 'Carrots', status: 'Peak Season', emoji: '🥕' },
    { name: 'Broccoli', status: 'Peak Season', emoji: '🥦' },
    { name: 'Cauliflower', status: 'Peak Season', emoji: '🌿' },
    { name: 'Sayote (Chayote)', status: 'Available', emoji: '🌿' },
    { name: 'Pineapple', status: 'Available', emoji: '🍍' },
  ],
  2: [ // March
    { name: 'Mangga (Mango)', status: 'Just In', emoji: '🥭' },
    { name: 'Pakwan (Watermelon)', status: 'Just In', emoji: '🍉' },
    { name: 'Melon (Cantaloupe)', status: 'Just In', emoji: '🍈' },
    { name: 'Ampalaya (Bitter Gourd)', status: 'Available', emoji: '🌿' },
    { name: 'Kamias (Bilimbi)', status: 'Just In', emoji: '🌿' },
    { name: 'Sibuyas (Shallots)', status: 'Peak Season', emoji: '🧅' },
  ],
  3: [ // April
    { name: 'Mangga (Mango)', status: 'Peak Season', emoji: '🥭' },
    { name: 'Pakwan (Watermelon)', status: 'Peak Season', emoji: '🍉' },
    { name: 'Nangka (Jackfruit)', status: 'Just In', emoji: '🌿' },
    { name: 'Melon (Cantaloupe)', status: 'Peak Season', emoji: '🍈' },
    { name: 'Durian', status: 'Just In', emoji: '🌿' },
    { name: 'Kamias (Bilimbi)', status: 'Peak Season', emoji: '🌿' },
  ],
  4: [ // May
    { name: 'Mangga (Mango)', status: 'Peak Season', emoji: '🥭' },
    { name: 'Nangka (Jackfruit)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Durian', status: 'Peak Season', emoji: '🌿' },
    { name: 'Pakwan (Watermelon)', status: 'Available', emoji: '🍉' },
    { name: 'Ampalaya (Bitter Gourd)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Sibuyas (Shallots)', status: 'Available', emoji: '🧅' },
  ],
  5: [ // June
    { name: 'Kangkong (Water Spinach)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Sitaw (String Beans)', status: 'Peak Season', emoji: '🫛' },
    { name: 'Upo (Bottle Gourd)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Pechay (Bok Choy)', status: 'Just In', emoji: '🥬' },
    { name: 'Mais (Corn)', status: 'Just In', emoji: '🌽' },
    { name: 'Gabi (Taro)', status: 'Just In', emoji: '🌿' },
  ],
  6: [ // July
    { name: 'Kangkong (Water Spinach)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Pechay (Bok Choy)', status: 'Peak Season', emoji: '🥬' },
    { name: 'Mais (Corn)', status: 'Peak Season', emoji: '🌽' },
    { name: 'Sitaw (String Beans)', status: 'Peak Season', emoji: '🫛' },
    { name: 'Labanos (Radish)', status: 'Available', emoji: '🌿' },
    { name: 'Kamote (Sweet Potato)', status: 'Available', emoji: '🍠' },
  ],
  7: [ // August
    { name: 'Kangkong (Water Spinach)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Mais (Corn)', status: 'Peak Season', emoji: '🌽' },
    { name: 'Upo (Bottle Gourd)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Gabi (Taro)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Kamote (Sweet Potato)', status: 'Just In', emoji: '🍠' },
    { name: 'Labanos (Radish)', status: 'Available', emoji: '🌿' },
  ],
  8: [ // September
    { name: 'Pechay (Bok Choy)', status: 'Peak Season', emoji: '🥬' },
    { name: 'Gabi (Taro)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Kamote (Sweet Potato)', status: 'Peak Season', emoji: '🍠' },
    { name: 'Sitaw (String Beans)', status: 'Available', emoji: '🫛' },
    { name: 'Labanos (Radish)', status: 'Available', emoji: '🌿' },
    { name: 'Mais (Corn)', status: 'Available', emoji: '🌽' },
  ],
  9: [ // October
    { name: 'Kamote (Sweet Potato)', status: 'Peak Season', emoji: '🍠' },
    { name: 'Gabi (Taro)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Pechay (Bok Choy)', status: 'Available', emoji: '🥬' },
    { name: 'Carrots', status: 'Just In', emoji: '🥕' },
    { name: 'Sayote (Chayote)', status: 'Just In', emoji: '🌿' },
    { name: 'Patatas (Potato)', status: 'Just In', emoji: '🥔' },
  ],
  10: [ // November
    { name: 'Repolyo (Cabbage)', status: 'Just In', emoji: '🥬' },
    { name: 'Carrots', status: 'Peak Season', emoji: '🥕' },
    { name: 'Sayote (Chayote)', status: 'Peak Season', emoji: '🌿' },
    { name: 'Patatas (Potato)', status: 'Peak Season', emoji: '🥔' },
    { name: 'Pineapple', status: 'Peak Season', emoji: '🍍' },
    { name: 'Baguio Beans', status: 'Just In', emoji: '🫘' },
  ],
  11: [ // December
    { name: 'Repolyo (Cabbage)', status: 'Peak Season', emoji: '🥬' },
    { name: 'Carrots', status: 'Peak Season', emoji: '🥕' },
    { name: 'Broccoli', status: 'Just In', emoji: '🥦' },
    { name: 'Cauliflower', status: 'Just In', emoji: '🌿' },
    { name: 'Pineapple', status: 'Peak Season', emoji: '🍍' },
    { name: 'Sayote (Chayote)', status: 'Peak Season', emoji: '🌿' },
  ],
};

const DEFAULT_SEASONS = [
  {
    id: 'tag-init',
    name: 'Tag-init',
    label: 'Hot Dry Season',
    months: 'March – May',
    monthRange: [2, 3, 4],
    icon: 'sunny-outline',
    ingredients: [
      { name: 'Mangga (Mango)', status: 'Peak Season', tip: 'Best eaten ripe as dessert or green with bagoong.' },
      { name: 'Pakwan (Watermelon)', status: 'Peak Season', tip: 'Refreshing and hydrating — perfect for the summer heat.' },
      { name: 'Melon (Cantaloupe)', status: 'Just In', tip: 'Sweet and fragrant; great for shakes and fruit salad.' },
      { name: 'Kamias (Bilimbi)', status: 'Peak Season', tip: 'Sour fruit used in sinigang and as souring agent.' },
      { name: 'Nangka (Jackfruit)', status: 'Peak Season', tip: 'Ripe for desserts like halo-halo; unripe for kare-kare.' },
      { name: 'Durian', status: 'Just In', tip: 'Abundant in Mindanao — a prized local delicacy.' },
      { name: 'Sibuyas Tagalog (Shallots)', status: 'Available', tip: 'Harvested in Ilocos; essential for most Filipino dishes.' },
      { name: 'Ampalaya (Bitter Gourd)', status: 'Available', tip: 'Best sautéed with eggs or in pinakbet.' },
    ],
    description: 'The hottest months in the Philippines. Tropical fruits are at their sweetest and most abundant.',
  },
  {
    id: 'tag-ulan',
    name: 'Tag-ulan',
    label: 'Rainy Season',
    months: 'June – October',
    monthRange: [5, 6, 7, 8, 9],
    icon: 'rainy-outline',
    ingredients: [
      { name: 'Kangkong (Water Spinach)', status: 'Peak Season', tip: 'Abundant and cheap; ideal for adobo or sautéed dishes.' },
      { name: 'Pechay (Bok Choy)', status: 'Peak Season', tip: 'Tender and mild; staple in soups and stir-fries.' },
      { name: 'Sitaw (String Beans)', status: 'Peak Season', tip: 'Long beans great in pinakbet and kare-kare.' },
      { name: 'Upo (Bottle Gourd)', status: 'Peak Season', tip: 'Light and watery; best in ginisang upo with ground pork.' },
      { name: 'Kamote (Sweet Potato)', status: 'Available', tip: 'Leaves used in sinigang; tubers boiled or fried.' },
      { name: 'Gabi (Taro)', status: 'Just In', tip: 'Essential for laing and sinigang na gabi.' },
      { name: 'Mais (Corn)', status: 'Peak Season', tip: 'Sweet corn is best boiled or grilled on the cob.' },
      { name: 'Labanos (Radish)', status: 'Available', tip: 'Common in beef sinigang and pork nilaga.' },
    ],
    description: 'Monsoon rains bring cool weather and a fresh wave of leafy greens and root crops.',
  },
  {
    id: 'amihan',
    name: 'Amihan',
    label: 'Cool Season',
    months: 'November – February',
    monthRange: [10, 11, 0, 1],
    icon: 'snow-outline',
    ingredients: [
      { name: 'Repolyo (Cabbage)', status: 'Peak Season', tip: 'Crisp Benguet cabbage is at its best this season.' },
      { name: 'Carrots', status: 'Peak Season', tip: 'Sweet and firm; staple in mechado, afritada, and kaldereta.' },
      { name: 'Patatas (Potato)', status: 'Peak Season', tip: 'Harvested from Benguet highlands; great for stews.' },
      { name: 'Sayote (Chayote)', status: 'Peak Season', tip: 'Mild-flavored; used in tinola and chopsuey.' },
      { name: 'Beans (Baguio Beans)', status: 'Peak Season', tip: 'French beans from the Cordillera — tender and crisp.' },
      { name: 'Broccoli', status: 'Just In', tip: 'Grown in Benguet; available in abundance from November.' },
      { name: 'Cauliflower', status: 'Just In', tip: 'Cool-weather crop from the highlands; great in soups.' },
      { name: 'Pineapple', status: 'Peak Season', tip: 'Philippine pineapples peak around Christmas season.' },
    ],
    description: 'The coolest and driest months. Highland vegetables and root crops thrive in the Cordillera.',
  },
];

const DEFAULT_YEAR_ROUND = [
  { name: 'Sibuyas (Onion)', emoji: '🧅', tip: 'Red and white onions from Ilocos and Nueva Ecija.' },
  { name: 'Bawang (Garlic)', emoji: '🧄', tip: 'World-class Ilocos garlic used in virtually every dish.' },
  { name: 'Luya (Ginger)', emoji: '🫚', tip: 'Aromatic rhizome essential in tinola, soups, and teas.' },
  { name: 'Sili (Chili)', emoji: '🌶️', tip: 'Siling labuyo and long chili available all year.' },
  { name: 'Kamatis (Tomato)', emoji: '🍅', tip: 'Key in ginisa, sinigang base, and fresh salads.' },
  { name: 'Talong (Eggplant)', emoji: '🍆', tip: 'Used in tortang talong, pinakbet, and ensalada.' },
  { name: 'Kalabasa (Squash)', emoji: '🎃', tip: 'Yellow-orange squash for ginataang kalabasa and pinakbet.' },
  { name: 'Pandan Leaves', emoji: '🌿', tip: 'Fragrant leaves for rice, desserts, and natural flavoring.' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SeasonalGuideScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const currentMonth = useMemo(() => new Date().getMonth(), []);
  const [seasonalData, setSeasonalData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    api.get('/api/seasonal')
      .then((res) => { setSeasonalData(res.data); })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  const byMonth = seasonalData?.byMonth ?? DEFAULT_BY_MONTH;
  const seasons = seasonalData?.seasons ?? DEFAULT_SEASONS;
  const yearRound = seasonalData?.yearRound ?? DEFAULT_YEAR_ROUND;

  const currentMonthIngredients = byMonth[currentMonth] ?? byMonth[0] ?? [];
  const currentMonthName = MONTH_NAMES[currentMonth];

  const currentSeason = useMemo(
    () => seasons.find((s) => s.monthRange.includes(currentMonth)),
    [seasons, currentMonth],
  );

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backBtn: { padding: 4 },
    headerTitle: {
      fontFamily: 'Geist_800ExtraBold',
      fontSize: 18,
      color: colors.text,
      letterSpacing: -0.3,
      flex: 1,
    },
    scroll: { paddingHorizontal: 16, paddingBottom: 40 },

    heroBanner: {
      marginTop: 20,
      marginBottom: 24,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: isDark ? '#052e16' : '#f0fdf4',
      borderWidth: 1,
      borderColor: isDark ? '#14532d' : '#bbf7d0',
      padding: 20,
      alignItems: 'center',
    },
    heroIcon: { fontSize: 44, marginBottom: 10 },
    heroTitle: {
      fontFamily: 'Geist_800ExtraBold',
      fontSize: 22,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    heroSub: {
      fontFamily: 'Geist_600SemiBold',
      fontSize: 12,
      color: '#16a34a',
      textAlign: 'center',
      marginBottom: 8,
    },
    heroDesc: {
      fontFamily: 'Geist_500Medium',
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },

    sectionTitle: {
      fontFamily: 'Geist_800ExtraBold',
      fontSize: 16,
      color: colors.text,
      marginBottom: 4,
    },
    sectionSub: {
      fontFamily: 'Geist_500Medium',
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 14,
    },

    thisMonthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 28,
    },
    ingredientPill: {
      borderRadius: 14,
      backgroundColor: isDark ? colors.surfaceAlt : '#fff',
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      alignItems: 'center',
      width: '30%',
      minWidth: 90,
      flex: 1,
    },
    pillEmoji: { fontSize: 28, marginBottom: 6 },
    pillName: {
      fontFamily: 'Geist_700Bold',
      fontSize: 10,
      color: colors.text,
      textAlign: 'center',
      lineHeight: 13,
    },
    pillStatus: {
      fontFamily: 'Geist_700Bold',
      fontSize: 9,
      color: '#f97316',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 4,
      textAlign: 'center',
    },

    seasonCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 16,
    },
    seasonHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },
    seasonIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.surfaceAlt : '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    seasonMeta: { flex: 1 },
    seasonNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    seasonName: { fontFamily: 'Geist_800ExtraBold', fontSize: 15, color: colors.text },
    seasonBadge: {
      borderRadius: 99,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    seasonBadgeText: { fontFamily: 'Geist_700Bold', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
    currentBadge: { backgroundColor: isDark ? '#14532d' : '#dcfce7', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
    currentBadgeText: { fontFamily: 'Geist_700Bold', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: '#16a34a' },
    seasonMonths: { fontFamily: 'Geist_600SemiBold', fontSize: 11, color: colors.textMuted, marginTop: 2 },
    seasonDesc: { fontFamily: 'Geist_500Medium', fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 18 },

    ingRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 9,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    ingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#f97316',
      marginTop: 5,
    },
    ingNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    ingName: { fontFamily: 'Geist_700Bold', fontSize: 13, color: colors.text },
    ingStatusBadge: {
      borderRadius: 99,
      backgroundColor: isDark ? '#431407' : '#fff7ed',
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    ingStatusText: { fontFamily: 'Geist_700Bold', fontSize: 9, color: '#f97316', textTransform: 'uppercase', letterSpacing: 0.4 },
    ingTip: { fontFamily: 'Geist_500Medium', fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 16 },

    yearRoundCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.surfaceAlt : '#fff',
      padding: 16,
      marginBottom: 24,
    },
    yrRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    yrEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
    yrName: { fontFamily: 'Geist_700Bold', fontSize: 13, color: colors.text },
    yrTip: { fontFamily: 'Geist_500Medium', fontSize: 11, color: colors.textMuted, marginTop: 1, lineHeight: 16 },

    footerCard: {
      borderRadius: 16,
      backgroundColor: isDark ? '#1c0a00' : '#fff7ed',
      borderWidth: 1,
      borderColor: isDark ? '#431407' : '#fed7aa',
      padding: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    footerIcon: { fontSize: 28, marginBottom: 8 },
    footerText: {
      fontFamily: 'Geist_500Medium',
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 19,
    },
    footerBold: { fontFamily: 'Geist_700Bold', color: colors.text },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Seasonal Ingredients</Text>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.heroBanner}>
          <Text style={s.heroIcon}>🌿</Text>
          <Text style={s.heroTitle}>Philippine Seasonal Guide</Text>
          <Text style={s.heroSub}>What's fresh this month in the PH</Text>
          <Text style={s.heroDesc}>
            Discover in-season produce across the Philippines. Cooking with seasonal ingredients means better taste, lower cost, and support for local farmers.
          </Text>
        </View>

        {/* This Month */}
        <Text style={s.sectionTitle}>Fresh in {currentMonthName}</Text>
        <Text style={s.sectionSub}>
          {currentSeason ? `${currentSeason.name} Season — ${currentSeason.label}` : 'In-season now'}
        </Text>
        <View style={s.thisMonthGrid}>
          {currentMonthIngredients.map((item) => (
            <View key={item.name} style={s.ingredientPill}>
              <Text style={s.pillEmoji}>{item.emoji}</Text>
              <Text style={s.pillName}>{item.name}</Text>
              <Text style={s.pillStatus}>{item.status}</Text>
            </View>
          ))}
        </View>

        {/* Season Sections */}
        <Text style={[s.sectionTitle, { marginBottom: 14 }]}>All Philippine Seasons</Text>
        {seasons.map((season) => {
          const isCurrent = season.monthRange.includes(currentMonth);
          const isTagInit = season.id === 'tag-init';
          const isTagUlan = season.id === 'tag-ulan';

          const cardBg = isDark
            ? (isTagInit ? '#1c0a00' : isTagUlan ? '#0c1a2e' : '#0a1628')
            : (isTagInit ? '#fff7ed' : isTagUlan ? '#eff6ff' : '#f0f9ff');
          const cardBorder = isDark
            ? (isTagInit ? '#431407' : isTagUlan ? '#1e3a5f' : '#0c2a4a')
            : (isTagInit ? '#fed7aa' : isTagUlan ? '#bfdbfe' : '#bae6fd');
          const iconColor = isTagInit ? '#f97316' : isTagUlan ? '#3b82f6' : '#0ea5e9';
          const badgeBg = isDark
            ? (isTagInit ? '#431407' : isTagUlan ? '#1e3a5f' : '#0c2a4a')
            : (isTagInit ? '#ffedd5' : isTagUlan ? '#dbeafe' : '#e0f2fe');
          const badgeText = isTagInit ? '#f97316' : isTagUlan ? '#2563eb' : '#0284c7';
          const iconName = ICON_MAP[season.icon] ?? season.icon ?? 'leaf-outline';

          return (
            <View key={season.id} style={[s.seasonCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={s.seasonHeader}>
                <View style={s.seasonIconBox}>
                  <Ionicons name={iconName} size={20} color={iconColor} />
                </View>
                <View style={s.seasonMeta}>
                  <View style={s.seasonNameRow}>
                    <Text style={s.seasonName}>{season.name}</Text>
                    <View style={[s.seasonBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[s.seasonBadgeText, { color: badgeText }]}>{season.label}</Text>
                    </View>
                    {isCurrent && (
                      <View style={s.currentBadge}>
                        <Text style={s.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.seasonMonths}>{season.months}</Text>
                  <Text style={s.seasonDesc}>{season.description}</Text>
                </View>
              </View>

              {season.ingredients.map((ing) => (
                <View key={ing.name} style={s.ingRow}>
                  <View style={s.ingDot} />
                  <View style={{ flex: 1 }}>
                    <View style={s.ingNameRow}>
                      <Text style={s.ingName}>{ing.name}</Text>
                      <View style={s.ingStatusBadge}>
                        <Text style={s.ingStatusText}>{ing.status}</Text>
                      </View>
                    </View>
                    <Text style={s.ingTip}>{ing.tip}</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {/* Year-Round */}
        <Text style={[s.sectionTitle, { marginBottom: 4 }]}>Year-Round Staples</Text>
        <Text style={s.sectionSub}>Always available at the palengke — every Filipino kitchen must-have.</Text>
        <View style={s.yearRoundCard}>
          {yearRound.map((item, i) => (
            <View key={item.name} style={[s.yrRow, i === 0 && { borderTopWidth: 0 }]}>
              <Text style={s.yrEmoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.yrName}>{item.name}</Text>
                <Text style={s.yrTip}>{item.tip}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer tip */}
        <View style={s.footerCard}>
          <Text style={s.footerIcon}>🛒</Text>
          <Text style={s.footerText}>
            Tip: Buying in-season produce from your local{' '}
            <Text style={s.footerBold}>palengke</Text> supports Filipino farmers and gives you the freshest ingredients at the best price.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
