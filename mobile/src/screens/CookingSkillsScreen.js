import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

const SKILLS = [
  {
    id: 1,
    title: 'Knife Skills Basics',
    description: 'Learn essential knife handling techniques for faster, safer, and more efficient cooking preparation.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=knife+skills+basics',
    imageUrl: 'https://static01.nyt.com/images/2025/03/24/multimedia/24knife-gvjp/24knife-gvjp-superJumbo.jpg?format=pjpg&quality=75&auto=webp&disable=upscale',
    tag: 'Knife Work',
    level: 'Beginner',
  },
  {
    id: 2,
    title: 'How to Julienne Vegetables',
    description: 'Master the julienne cutting technique to create thin, even vegetable strips like a professional chef.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=how+to+julienne+vegetables',
    imageUrl: 'https://www.thedailymeal.com/img/gallery/the-chinese-veggie-cutting-technique-for-beautiful-salads/how-to-prep-your-veggies-using-the-julienne-technique-1707258564.jpg',
    tag: 'Cutting',
    level: 'Intermediate',
  },
  {
    id: 3,
    title: 'How to Dice an Onion',
    description: 'Step-by-step guide to quickly and safely dice onions with proper kitchen technique.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=how+to+dice+an+onion',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6VQnBxiLtVNEelEIAQNamV7IyW5dUWPsQFA&s',
    tag: 'Knife Work',
    level: 'Beginner',
  },
  {
    id: 4,
    title: 'Pan Frying Basics',
    description: 'Learn proper pan frying techniques, temperature control, and cooking methods for perfect results.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=pan+frying+basics',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUAuCVZ7dUS859_ZHyRQ4DHa2iLZ7sBF2iQQ&s',
    tag: 'Heat Control',
    level: 'Essential',
  },
  {
    id: 5,
    title: 'Seasoning Food Properly',
    description: 'Understand how to balance salt, acidity, sweetness, and spices to improve flavor in every dish.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=seasoning+food+properly',
    imageUrl: 'https://www.allrecipes.com/thmb/0_QqCfH4ayttxuPB5xWMNLuRglw=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/GettyImages-519515245-2000-eb6f66823c9343358ea8b3a1fa1cb941.jpg',
    tag: 'Flavor',
    level: 'Essential',
  },
  {
    id: 6,
    title: 'Egg Cooking Basics',
    description: 'Learn the fundamentals of cooking boiled, fried, scrambled, and poached eggs perfectly.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=egg+cooking+basics',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWAi5mUREMYvhYkwICz1AUP_gT5CITQwiwgg&s',
    tag: 'Fundamentals',
    level: 'Beginner',
  },
];

const LEVEL_COLORS = {
  Beginner:     { bg: 'rgba(16,185,129,0.18)', text: '#6ee7b7', border: 'rgba(16,185,129,0.35)' },
  Intermediate: { bg: 'rgba(245,158,11,0.18)', text: '#fcd34d', border: 'rgba(245,158,11,0.35)' },
  Essential:    { bg: 'rgba(249,115,22,0.18)', text: '#fdba74', border: 'rgba(249,115,22,0.35)' },
};

function SkillCard({ skill }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [pressed, setPressed] = useState(false);

  const level = LEVEL_COLORS[skill.level] ?? LEVEL_COLORS.Beginner;

  const handleWatch = useCallback(() => {
    Linking.openURL(skill.youtubeUrl).catch(() => {});
  }, [skill.youtubeUrl]);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={handleWatch}
      style={[
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {/* Skeleton */}
        {!imgLoaded && !imgError && (
          <View style={styles.skeleton}>
            <ActivityIndicator size="small" color="#333" />
          </View>
        )}

        {/* Image */}
        {!imgError && (
          <Image
            source={{ uri: skill.imageUrl }}
            style={[styles.thumbImg, !imgLoaded && { opacity: 0 }]}
            resizeMode="cover"
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(true); }}
          />
        )}

        {/* Fallback */}
        {imgError && (
          <View style={styles.thumbFallback}>
            <Ionicons name="school-outline" size={36} color="#333" />
          </View>
        )}

        {/* Gradient overlay */}
        <View style={styles.thumbGradient} />

        {/* Play button */}
        <View style={styles.playBtn}>
          <Ionicons name="play" size={20} color="#fff" style={{ marginLeft: 2 }} />
        </View>

        {/* Level badge */}
        <View style={[styles.levelBadge, { backgroundColor: level.bg, borderColor: level.border }]}>
          <Text style={[styles.levelText, { color: level.text }]}>{skill.level}</Text>
        </View>

        {/* Tag badge */}
        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>{skill.tag}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{skill.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={3}>{skill.description}</Text>

        <View style={styles.watchRow}>
          <Ionicons name="play" size={10} color="#d4d4d4" />
          <Text style={styles.watchText}>WATCH VIDEO</Text>
          <Ionicons name="open-outline" size={11} color="#737373" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CookingSkillsScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0a0a0a' }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cooking Skills</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroIconWrap}>
            <Ionicons name="school-outline" size={32} color="#fb923c" />
          </View>
          <Text style={styles.heroTitle}>Cooking Skills</Text>
          <Text style={styles.heroSub}>MASTER THE FUNDAMENTALS</Text>
          <Text style={styles.heroDesc}>
            Elevate your kitchen confidence with curated video tutorials — from knife basics to flavor fundamentals. Watch, learn, and cook like a pro.
          </Text>
        </View>

        {/* Cards */}
        {SKILLS.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="school-outline" size={28} color="#fb923c" style={{ marginBottom: 10 }} />
          <Text style={styles.footerText}>
            Practice these skills daily and you'll notice a dramatic improvement in your cooking speed, safety, and confidence.
          </Text>
          <Text style={styles.footerSub}>All videos open on YouTube · Free to watch</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 18,
    color: '#fff',
    letterSpacing: -0.3,
    flex: 1,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },

  // Hero
  hero: {
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    alignItems: 'center',
  },
  heroGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(249,115,22,0.08)',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -100 }],
  },
  heroIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 26,
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSub: {
    fontFamily: 'Geist_700Bold',
    fontSize: 10,
    color: '#fb923c',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroDesc: {
    fontFamily: 'Geist_500Medium',
    fontSize: 13,
    color: '#a8a29e',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Card
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  cardPressed: {
    borderColor: 'rgba(249,115,22,0.3)',
    backgroundColor: '#1a1a1a',
  },

  // Thumbnail
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0d0d0d',
    position: 'relative',
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  playBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -26 }, { translateY: -26 }],
  },
  levelBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  levelText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tagBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    color: '#d4d4d4',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Card content
  cardContent: {
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 15,
    color: '#fff',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardDesc: {
    fontFamily: 'Geist_500Medium',
    fontSize: 13,
    color: '#a8a29e',
    lineHeight: 19,
  },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
    alignSelf: 'flex-start',
  },
  watchText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 10,
    color: '#d4d4d4',
    letterSpacing: 1.2,
  },

  // Footer
  footer: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Geist_500Medium',
    fontSize: 13,
    color: '#a8a29e',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerSub: {
    fontFamily: 'Geist_500Medium',
    fontSize: 11,
    color: '#525252',
    textAlign: 'center',
    marginTop: 6,
  },
});
