import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

const APP_VERSION = '1.0.0';
const BUILD_YEAR = '2025';
const CONTACT_EMAIL = 'cookmate067@gmail.com';

const features = [
  {
    icon: 'sparkles-outline',
    title: 'AI-Powered Recipes',
    description: 'Personalised suggestions powered by ML trained on Filipino and international dishes.',
  },
  {
    icon: 'restaurant-outline',
    title: 'Step-by-Step Cooking Mode',
    description: 'Hands-free cooking mode — keep your screen on and navigate each step without touching your device.',
  },
  {
    icon: 'calendar-outline',
    title: 'Smart Meal Planner',
    description: 'Plan your weekly meals, get auto shopping lists, and receive reminders when it is time to cook.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Privacy First',
    description: 'Your data is yours. We never sell it. Full data export and account deletion always available.',
  },
  {
    icon: 'people-outline',
    title: 'Community Driven',
    description: 'Recipes curated from the Filipino culinary tradition and a growing community of home cooks.',
  },
  {
    icon: 'cloud-offline-outline',
    title: 'Offline Ready',
    description: 'Downloaded recipes are available without internet — cook anywhere, anytime.',
  },
];

const appInfo = [
  { label: 'Version', value: APP_VERSION },
  { label: 'Platform', value: 'Android' },
  { label: 'Framework', value: 'React Native (Expo)' },
  { label: 'Backend', value: 'Node.js + PostgreSQL' },
  { label: 'AI Service', value: 'Python FastAPI' },
  { label: 'Release Year', value: BUILD_YEAR },
];

export default function AboutScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();

  return (
    <SafeAreaView style={[st.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[st.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>About</Text>
        <View style={st.backBtn} />
      </View>

      <ScrollView
        style={st.flex1}
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[st.hero, { backgroundColor: isDark ? colors.surfaceAlt : '#fff7ed', borderColor: isDark ? colors.border : '#fed7aa' }]}>
          <View style={[st.heroIconWrap, { backgroundColor: isDark ? colors.surface : '#ffffff' }]}>
            <Ionicons name="fast-food" size={40} color={colors.primary} />
          </View>
          <Text style={[st.heroTitle, { color: colors.text }]}>CookMate</Text>
          <Text style={[st.heroVersion, { color: colors.primary }]}>Version {APP_VERSION}</Text>
          <Text style={[st.heroDesc, { color: colors.textMuted }]}>
            Your personal Filipino recipe companion — discover, plan, and cook with confidence.
            Built for home cooks who love great food.
          </Text>
          <View style={[st.heroBadge, { backgroundColor: isDark ? colors.surface : '#ffffff' }]}>
            <Ionicons name="heart" size={12} color={colors.primary} />
            <Text style={[st.heroBadgeText, { color: colors.textMuted }]}>
              Made with love in the Philippines · {BUILD_YEAR}
            </Text>
          </View>
        </View>

        {/* What is CookMate */}
        <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.sectionTitle, { color: colors.text }]}>What is CookMate?</Text>
          <Text style={[st.bodyText, { color: colors.textMuted }]}>
            CookMate is an AI-assisted recipe and meal-planning app designed around Filipino cuisine and
            everyday cooking. Whether you are a beginner learning to fry an egg or an experienced home cook
            planning a holiday feast, CookMate gives you the tools, guidance, and inspiration to make
            cooking enjoyable and stress-free.
          </Text>
          <Text style={[st.bodyText, { color: colors.textMuted, marginTop: 10 }]}>
            Available on web and mobile (Android &amp; iOS), CookMate syncs your saved recipes, meal plans,
            and preferences across all your devices in real time.
          </Text>
        </View>

        {/* Features */}
        <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.sectionTitle, { color: colors.text }]}>Key Features</Text>
          <View style={st.featuresGrid}>
            {features.map((f) => (
              <View
                key={f.title}
                style={[st.featureCard, { backgroundColor: isDark ? colors.surfaceAlt : '#fafaf9', borderColor: colors.border }]}
              >
                <View style={[st.featureIcon, { backgroundColor: isDark ? colors.primarySoft : '#fff7ed' }]}>
                  <Ionicons name={f.icon} size={20} color={colors.primary} />
                </View>
                <Text style={[st.featureTitle, { color: colors.text }]}>{f.title}</Text>
                <Text style={[st.featureDesc, { color: colors.textMuted }]}>{f.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Under the Hood */}
        <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.sectionTitle, { color: colors.text }]}>Under the Hood</Text>
          {[
            { title: 'Design & Engineering', detail: 'Built with React, React Native (Expo), Node.js, and PostgreSQL.' },
            { title: 'AI & Recommendations', detail: 'Powered by a custom ML pipeline trained on Philippine food datasets.' },
            { title: 'Data & Privacy', detail: 'CSRF-protected, bcrypt-hashed passwords, TLS-encrypted data in transit.' },
          ].map((item) => (
            <View key={item.title} style={st.bulletRow}>
              <View style={[st.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[st.bodyText, { color: colors.textMuted, flex: 1 }]}>
                <Text style={{ fontFamily: 'Geist_700Bold', color: colors.text }}>{item.title}: </Text>
                {item.detail}
              </Text>
            </View>
          ))}
        </View>

        {/* App Info grid */}
        <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.sectionTitle, { color: colors.text }]}>App Info</Text>
          <View style={st.infoGrid}>
            {appInfo.map((item) => (
              <View key={item.label} style={[st.infoCell, { backgroundColor: isDark ? colors.surfaceAlt : '#fafaf9', borderColor: colors.border }]}>
                <Text style={[st.infoLabel, { color: colors.textSubtle }]}>{item.label.toUpperCase()}</Text>
                <Text style={[st.infoValue, { color: colors.text }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={[st.footer, { backgroundColor: isDark ? colors.primarySoft : '#fff7ed', borderColor: isDark ? colors.border : '#fed7aa' }]}>
          <Ionicons name="fast-food-outline" size={24} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[st.footerText, { color: colors.textMuted }]}>
            Questions or feedback?{'\n'}
            <Text
              style={[st.footerEmail, { color: colors.primary }]}
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            >
              {CONTACT_EMAIL}
            </Text>
          </Text>
          <Text style={[st.copyright, { color: colors.textSubtle }]}>
            © {BUILD_YEAR} CookMate. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 17, letterSpacing: -0.3 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60, gap: 12 },

  /* Hero */
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 28, letterSpacing: -0.5, marginBottom: 2 },
  heroVersion: { fontFamily: 'Geist_700Bold', fontSize: 13, marginBottom: 12 },
  heroDesc: { fontFamily: 'Geist_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 14 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
  },
  heroBadgeText: { fontFamily: 'Geist_600SemiBold', fontSize: 11 },

  /* Sections */
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 15,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  bodyText: { fontFamily: 'Geist_400Regular', fontSize: 13, lineHeight: 20 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },

  /* Features */
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    width: '47%',
    gap: 8,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontFamily: 'Geist_700Bold', fontSize: 12, letterSpacing: -0.1 },
  featureDesc: { fontFamily: 'Geist_400Regular', fontSize: 11, lineHeight: 16 },

  /* App info grid */
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoCell: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '47%',
  },
  infoLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.2, marginBottom: 3 },
  infoValue: { fontFamily: 'Geist_700Bold', fontSize: 12 },

  /* Footer */
  footer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: 'Geist_500Medium',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  footerEmail: { fontFamily: 'Geist_700Bold' },
  copyright: { fontFamily: 'Geist_400Regular', fontSize: 11, marginTop: 4 },
});
