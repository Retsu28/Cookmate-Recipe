import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

const LAST_UPDATED = 'May 15, 2025';
const CONTACT_EMAIL = 'cookmate067@gmail.com';

const sections = [
  {
    title: '1. Information We Collect',
    points: [
      'Account information you provide when you register: full name, email address, and password (stored as a salted hash).',
      'Profile data you choose to add: cooking skill level, avatar photo, and dietary preferences.',
      'Usage data: recipes you view, save, cook, and rate; meal plans you create; and search queries you enter.',
      'Device data: device type, OS version, app version, and approximate timezone — used for crash reporting and compatibility.',
      'Communications: if you contact us by email, we keep those messages to resolve your inquiry.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    points: [
      'To operate and personalize the CookMate service — showing recipe recommendations, populating your meal planner, and remembering your saved recipes.',
      'To improve the app — analysing aggregate usage patterns to prioritise new features and fix bugs.',
      'To send service notifications — password-reset emails, meal-plan reminders you opt into, and critical security alerts.',
      'To protect CookMate and our users — detecting abuse, investigating policy violations, and complying with legal obligations.',
      'We do not sell, rent, or trade your personal information to third parties for their own marketing purposes.',
    ],
  },
  {
    title: '3. Data Sharing',
    points: [
      'Service providers: we share data with trusted vendors (cloud hosting, transactional email, error monitoring) strictly to deliver the service.',
      'Legal requirements: we may disclose data when required by law, court order, or to protect the safety of our users or the public.',
      'Business transfers: if CookMate is acquired or merges with another company, your data may be transferred. You will be notified via email and an in-app notice.',
      'Aggregated analytics: we may share non-identifiable, aggregated statistics with partners or in public reports.',
    ],
  },
  {
    title: '4. Data Storage & Security',
    points: [
      'Your data is stored on servers in a secure data centre. Passwords are hashed with bcrypt and are never stored in plain text.',
      'All data in transit is encrypted using TLS 1.2 or higher.',
      'We enforce rate limiting, brute-force protection, and optional two-factor authentication (TOTP) on all accounts.',
      'In the event of a data breach likely to affect your rights, we will notify you within 72 hours of becoming aware of it.',
      'No method of electronic storage or transmission is 100% secure. We encourage you to use a strong, unique password and enable 2FA.',
    ],
  },
  {
    title: '5. Cookies & Local Storage',
    points: [
      'CookMate uses a session cookie and a CSRF cookie to keep you signed in securely. These are strictly necessary.',
      'We use local storage and device storage to cache recipe data and your meal plan for offline use. None of this data leaves your device without your action.',
      'We do not use third-party advertising cookies or cross-site tracking.',
    ],
  },
  {
    title: '6. Your Rights & Choices',
    points: [
      'Access & portability: request an export of all your data from Profile → Privacy & Security → Request data export.',
      'Correction: update your name, email, avatar, and preferences at any time from your profile.',
      'Deletion: delete your account from Profile → Privacy & Security → Danger Zone. Data is purged within 7 days.',
      'Opt-out of notifications: disable push and email notifications from Profile → Notifications at any time.',
      'Data sharing: control personalised suggestions, cooking activity insights, and diagnostics from Privacy & Security settings.',
    ],
  },
  {
    title: "7. Children's Privacy",
    points: [
      'CookMate is not directed at children under 13 years of age. We do not knowingly collect personal information from children under 13.',
      `If you believe a child under 13 has provided us with personal information, please contact us at ${CONTACT_EMAIL} and we will delete it promptly.`,
    ],
  },
  {
    title: '8. Third-Party Links',
    points: [
      'CookMate may contain links to external websites (e.g., original recipe sources, YouTube cooking videos). We are not responsible for the privacy practices of those sites.',
    ],
  },
  {
    title: '9. Changes to This Policy',
    points: [
      'We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last updated" date and send you an in-app notification.',
      'Continued use of CookMate after changes are posted constitutes your acceptance of the revised policy.',
    ],
  },
  {
    title: '10. Contact Us',
    points: [
      `For questions, concerns, or requests regarding this Privacy Policy, contact us at: ${CONTACT_EMAIL}`,
      'We aim to respond to all privacy-related inquiries within 5 business days.',
    ],
  },
];

export default function PrivacyPolicyScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();

  return (
    <SafeAreaView style={[st.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[st.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={st.backBtn} />
      </View>

      <ScrollView
        style={st.flex1}
        contentContainerStyle={[st.scroll, { paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[st.hero, { backgroundColor: isDark ? colors.surfaceAlt : '#fff7ed', borderColor: colors.border }]}>
          <View style={[st.heroIcon, { backgroundColor: isDark ? colors.primarySoft : '#ffedd5' }]}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          <Text style={[st.heroTitle, { color: colors.text }]}>Privacy Policy</Text>
          <Text style={[st.heroSub, { color: colors.textMuted }]}>Last updated: {LAST_UPDATED}</Text>
          <Text style={[st.heroDesc, { color: colors.textMuted }]}>
            CookMate is committed to protecting your personal information. This Privacy Policy explains what
            data we collect, how we use it, and the choices you have.
          </Text>
        </View>

        {/* Sections */}
        {sections.map((section) => (
          <View
            key={section.title}
            style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[st.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            {section.points.map((point, i) => (
              <View key={i} style={st.pointRow}>
                <View style={[st.bullet, { backgroundColor: colors.primary }]} />
                <Text style={[st.pointText, { color: colors.textMuted }]}>{point}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={[st.footer, { backgroundColor: isDark ? colors.primarySoft : '#fff7ed', borderColor: isDark ? colors.border : '#fed7aa' }]}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[st.footerText, { color: colors.textMuted }]}>
            Questions about this policy?{'\n'}
            <Text style={[st.footerEmail, { color: colors.primary }]}>{CONTACT_EMAIL}</Text>
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
  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 4,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 24, letterSpacing: -0.5, marginBottom: 4 },
  heroSub: { fontFamily: 'Geist_500Medium', fontSize: 12, marginBottom: 12 },
  heroDesc: { fontFamily: 'Geist_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center' },
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
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  pointText: { fontFamily: 'Geist_400Regular', fontSize: 13, lineHeight: 20, flex: 1 },
  footer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: { fontFamily: 'Geist_500Medium', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  footerEmail: { fontFamily: 'Geist_700Bold' },
});
