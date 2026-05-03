import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LogoutButton from '../components/LogoutButton';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { profileApi } from '../api/api';
import { ProfileContentSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];

const profileTabs = ['Account Settings', 'My Recipes', 'Saved'];

const emptyForm = {
  fullName: '',
  email: '',
  bio: '',
  cookingSkillLevel: 'Beginner',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function normalizeFullName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function baselineFromProfile(profile) {
  return {
    fullName: profile?.full_name || '',
    email: profile?.email || '',
    bio: profile?.bio || '',
    cookingSkillLevel: profile?.cooking_skill_level || 'Beginner',
  };
}

function SectionHeader({ icon, title, caption, colors, compact = false }) {
  return (
    <View style={[st.sectionHeader, compact && { marginBottom: 0 }]}>
      <View style={[st.sectionIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={st.sectionTitleWrap}>
        <Text style={[st.sectionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[st.sectionCaption, { color: colors.textMuted }]}>{caption}</Text>
      </View>
    </View>
  );
}

function FieldLabel({ label, colors }) {
  return <Text style={[st.label, { color: colors.textSubtle }]}>{label.toUpperCase()}</Text>;
}

export default function ProfileScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { colors, isDark, toggleTheme } = useAppTheme();
  
  const [activeTab, setActiveTab] = useState('Account Settings');
  
  const userBaseline = useMemo(
    () => ({
      fullName: user?.name || user?.full_name || '',
      email: user?.email || '',
      bio: '',
      cookingSkillLevel: 'Beginner',
    }),
    [user?.email, user?.full_name, user?.name]
  );

  const [initial, setInitial] = useState(userBaseline);
  const [form, setForm] = useState({ ...emptyForm, ...userBaseline });
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const saveScale = useRef(new Animated.Value(1)).current;
  const isInitialLoading = useInitialContentLoading();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadProfile = async () => {
        setProfileLoading(true);
        setError(null);
        if (!user?.id) {
          setProfileLoading(false);
          return;
        }
        try {
          const { data } = await profileApi.getProfile(user.id);
          if (active) {
            const nextInitial = baselineFromProfile(data.profile);
            setInitial(nextInitial);
            setForm({ ...emptyForm, ...nextInitial });
          }
        } catch (err) {
          if (active) {
            setError(err?.response?.data?.error || err?.message || 'Unable to load profile.');
          }
        } finally {
          if (active) setProfileLoading(false);
        }
      };
      loadProfile();
      return () => { active = false; };
    }, [user?.id])
  );

  const emailChanged = normalizeEmail(form.email) !== normalizeEmail(initial.email);
  const passwordChanging = form.newPassword.length > 0;
  const securityChanging = emailChanged || passwordChanging;
  const passwordMismatch =
    form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword;
  const hasChanges = useMemo(
    () =>
      normalizeFullName(form.fullName) !== normalizeFullName(initial.fullName) ||
      normalizeEmail(form.email) !== normalizeEmail(initial.email) ||
      form.bio.trim() !== initial.bio.trim() ||
      form.cookingSkillLevel !== initial.cookingSkillLevel ||
      form.currentPassword.length > 0 ||
      form.newPassword.length > 0 ||
      form.confirmPassword.length > 0,
    [form, initial]
  );

  const displayName = useMemo(() => {
    const name = form.fullName || user?.name || 'CookMate Chef';
    return name.trim() ? name.trim() : 'CookMate Chef';
  }, [form.fullName, user?.name]);

  const displayInitial = useMemo(() => {
    return displayName.charAt(0).toUpperCase();
  }, [displayName]);

  const displayEmail = form.email || user?.email || 'No email available';

  const setField = (key, value) => {
    setSuccess(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = () => {
    if (!normalizeFullName(form.fullName)) return 'Full name cannot be blank.';
    if (!EMAIL_RE.test(normalizeEmail(form.email))) return 'Please enter a valid email address.';
    if (securityChanging && !form.currentPassword) {
      return 'Current password is required to update your email or password.';
    }
    if (passwordChanging && form.newPassword.length < MIN_PASSWORD_LEN) {
      return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    }
    if (passwordChanging && form.newPassword !== form.confirmPassword) {
      return 'New password and confirmation must match.';
    }
    return null;
  };

  const resetForm = () => {
    setError(null);
    setSuccess(false);
    setForm({ ...emptyForm, ...initial });
  };

  const animatePressIn = () => {
    Animated.spring(saveScale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 36,
      bounciness: 4,
    }).start();
  };

  const animatePressOut = () => {
    Animated.spring(saveScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 34,
      bounciness: 5,
    }).start();
  };

  const handleSave = async () => {
    if (!user?.id || saving) return;

    setError(null);
    setSuccess(false);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      full_name: normalizeFullName(form.fullName),
      email: normalizeEmail(form.email),
      bio: form.bio.trim(),
      cooking_skill_level: form.cookingSkillLevel,
    };
    if (securityChanging) payload.current_password = form.currentPassword;
    if (passwordChanging) payload.new_password = form.newPassword;

    setSaving(true);
    try {
      const { data } = await profileApi.updateProfile(user.id, payload);
      const nextInitial = baselineFromProfile(data.profile);
      setInitial(nextInitial);
      setForm({ ...emptyForm, ...nextInitial });
      try {
        await refreshUser?.();
      } catch {
        // The profile save succeeded; the session will refresh on the next app load.
      }
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Unable to update account settings.');
    } finally {
      setSaving(false);
    }
  };

  const inputBase = [
    st.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      color: colors.text,
    },
  ];

  if (isInitialLoading || profileLoading) {
    return <ProfileContentSkeleton colors={colors} />;
  }

  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={st.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={st.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Profile header card */}
          <View style={[st.headerCard, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }]}>
            <View style={[st.avatarLg, { backgroundColor: colors.primary }]}>
              <Text style={st.avatarLgText}>{displayInitial}</Text>
            </View>
            <Text style={[st.nameText, { color: colors.text }]}>{displayName}</Text>
            <Text style={[st.emailText, { color: colors.textMuted }]}>{displayEmail}</Text>

            <View style={[st.statsRow, { borderTopColor: isDark ? colors.border : '#d6d3d1' }]}>
              {[
                { num: '12', label: 'RECIPES' },
              ].map((stat, i) => (
                <View key={i} style={[st.statCol, { borderRightWidth: 0 }]}>
                  <Text style={[st.statNum, { color: colors.primary }]}>{stat.num}</Text>
                  <Text style={[st.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tabs */}
          <View style={[st.tabRow, { borderBottomColor: colors.border }]}>
            {profileTabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[st.tabItem, activeTab === tab && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
              >
                <Text style={[st.tabText, { color: activeTab === tab ? colors.primary : colors.textSubtle }]}>{tab.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={st.body}>
            {activeTab === 'Account Settings' && (
              <View style={st.accountWrap}>
                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <SectionHeader
                    icon="person-outline"
                    title="Profile details"
                    caption="Keep your public CookMate identity current."
                    colors={colors}
                  />

                  <FieldLabel label="Full name" colors={colors} />
                  <TextInput
                    value={form.fullName}
                    onChangeText={(value) => setField('fullName', value)}
                    style={inputBase}
                    placeholder="Jane Doe"
                    placeholderTextColor={colors.textSubtle}
                    autoCapitalize="words"
                    editable={!profileLoading && !saving}
                  />

                  <FieldLabel label="Bio" colors={colors} />
                  <TextInput
                    value={form.bio}
                    onChangeText={(value) => setField('bio', value)}
                    style={[inputBase, st.textArea]}
                    placeholder="A short note about your cooking style"
                    placeholderTextColor={colors.textSubtle}
                    multiline
                    textAlignVertical="top"
                    editable={!profileLoading && !saving}
                  />

                  <FieldLabel label="Cooking skill" colors={colors} />
                  <View style={st.skillGrid}>
                    {skillLevels.map((level) => {
                      const active = form.cookingSkillLevel === level;
                      return (
                        <TouchableOpacity
                          key={level}
                          onPress={() => setField('cookingSkillLevel', level)}
                          disabled={profileLoading || saving}
                          style={[
                            st.skillBtn,
                            {
                              backgroundColor: active ? colors.text : colors.surface,
                              borderColor: active ? colors.text : colors.border,
                            },
                          ]}
                        >
                          <Text style={[st.skillText, { color: active ? colors.background : colors.textMuted }]}>
                            {level}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <SectionHeader
                    icon="mail-outline"
                    title="Email"
                    caption="Use the address you want for sign-in and account messages."
                    colors={colors}
                  />
                  <FieldLabel label="Email address" colors={colors} />
                  <TextInput
                    value={form.email}
                    onChangeText={(value) => setField('email', value)}
                    style={inputBase}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textSubtle}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    editable={!profileLoading && !saving}
                  />
                </View>

                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={st.passwordHeader}>
                    <View style={{ flex: 1 }}>
                      <SectionHeader
                        icon="lock-closed-outline"
                        title="Password"
                        caption="Current password is required for email or password changes."
                        colors={colors}
                        compact
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowPasswords((value) => !value)}
                      style={[st.iconBtn, { backgroundColor: colors.surfaceAlt }]}
                      accessibilityLabel={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    >
                      <Ionicons
                        name={showPasswords ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.text}
                      />
                    </TouchableOpacity>
                  </View>

                  <FieldLabel label="Current password" colors={colors} />
                  <TextInput
                    value={form.currentPassword}
                    onChangeText={(value) => setField('currentPassword', value)}
                    style={inputBase}
                    placeholder="Required for secure changes"
                    placeholderTextColor={colors.textSubtle}
                    secureTextEntry={!showPasswords}
                    textContentType="password"
                    editable={!profileLoading && !saving}
                  />

                  <FieldLabel label="New password" colors={colors} />
                  <TextInput
                    value={form.newPassword}
                    onChangeText={(value) => setField('newPassword', value)}
                    style={inputBase}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.textSubtle}
                    secureTextEntry={!showPasswords}
                    textContentType="newPassword"
                    editable={!profileLoading && !saving}
                  />

                  <FieldLabel label="Confirm password" colors={colors} />
                  <TextInput
                    value={form.confirmPassword}
                    onChangeText={(value) => setField('confirmPassword', value)}
                    style={[
                      inputBase,
                      passwordMismatch && { borderColor: colors.danger },
                    ]}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.textSubtle}
                    secureTextEntry={!showPasswords}
                    textContentType="newPassword"
                    editable={!profileLoading && !saving}
                  />
                </View>

                {(error || success) && (
                  <View
                    style={[
                      st.statusBox,
                      {
                        backgroundColor: error
                          ? isDark
                            ? '#450a0a'
                            : '#fef2f2'
                          : isDark
                            ? '#052e16'
                            : '#f0fdf4',
                        borderColor: error ? colors.danger : colors.success,
                      },
                    ]}
                  >
                    <Ionicons
                      name={error ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                      size={18}
                      color={error ? colors.danger : colors.success}
                    />
                    <Text
                      style={[
                        st.statusText,
                        { color: error ? colors.danger : colors.success },
                      ]}
                    >
                      {error || 'Account settings updated.'}
                    </Text>
                  </View>
                )}

                <View style={st.footerActions}>
                  <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                    <TouchableOpacity
                      onPress={handleSave}
                      onPressIn={animatePressIn}
                      onPressOut={animatePressOut}
                      disabled={profileLoading || saving || !hasChanges}
                      style={[
                        st.saveBtn,
                        {
                          backgroundColor:
                            profileLoading || saving || !hasChanges ? colors.textSubtle : colors.primary,
                        },
                      ]}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="save-outline" size={18} color="#fff" />
                          <Text style={st.saveText}>SAVE SETTINGS</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </Animated.View>

                  <TouchableOpacity
                    onPress={resetForm}
                    disabled={profileLoading || saving || !hasChanges}
                    style={[
                      st.resetBtn,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                  >
                    <Text style={[st.resetText, { color: colors.textMuted }]}>DISCARD CHANGES</Text>
                  </TouchableOpacity>
                </View>

              </View>
            )}

            {activeTab === 'My Recipes' && (
              <View style={st.emptyState}>
                <Ionicons name="restaurant-outline" size={40} color={colors.textSubtle} />
                <Text style={[st.emptyText, { color: colors.textSubtle }]}>Your created recipes will appear here.</Text>
              </View>
            )}
            {activeTab === 'Saved' && (
              <View style={st.emptyState}>
                <Ionicons name="bookmark-outline" size={40} color={colors.textSubtle} />
                <Text style={[st.emptyText, { color: colors.textSubtle }]}>Bookmark recipes to save them for later.</Text>
              </View>
            )}

            {/* Settings Section */}
            <View style={st.settingsSection}>
              <Text style={[st.miniLabel, { color: colors.textSubtle, marginBottom: 12 }]}>PREFERENCES</Text>

              <View style={[st.settingsCard, { borderColor: colors.border }]}>
                {[
                  { icon: 'moon-outline', label: 'Dark Mode', type: 'switch', value: isDark, onChange: () => toggleTheme() },
                  { icon: 'notifications-outline', label: 'Notifications', type: 'arrow', onPress: () => navigation.navigate('NotificationSettings') },
                  { icon: 'globe-outline', label: 'Language', type: 'value', value: 'English (US)' },
                  { icon: 'help-circle-outline', label: 'Help & Support', type: 'arrow' },
                ].map((item, i, arr) => (
                  <TouchableOpacity 
                    key={i} 
                    onPress={item.onPress}
                    disabled={!item.onPress && item.type !== 'switch'}
                    activeOpacity={item.onPress ? 0.7 : 1}
                    style={[st.settingRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <View style={st.settingLeft}>
                      <Ionicons name={item.icon} size={18} color={colors.primary} />
                      <Text style={[st.settingLabel, { color: colors.text }]}>{item.label}</Text>
                    </View>
                    {item.type === 'switch' && (
                      <Switch
                        value={item.value}
                        onValueChange={item.onChange}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.surface}
                      />
                    )}
                    {item.type === 'value' && (
                      <Text style={[st.settingValue, { color: colors.textSubtle }]}>{item.value}</Text>
                    )}
                    {item.type === 'arrow' && (
                      <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
                <LogoutButton />
              </View>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  // Header
  headerCard: { paddingTop: 32, paddingBottom: 24, alignItems: 'center' },
  avatarLg: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarLgText: { color: '#fff', fontFamily: 'Geist_800ExtraBold', fontSize: 30 },
  nameText: { fontFamily: 'Geist_800ExtraBold', fontSize: 22, letterSpacing: -0.3 },
  emailText: { fontFamily: 'Geist_400Regular', fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', width: '100%', marginTop: 20, paddingTop: 18, borderTopWidth: 1 },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: 'Geist_800ExtraBold', fontSize: 22 },
  statLabel: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 1.5, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18, paddingHorizontal: 24 },
  // Tabs
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
  // Body
  body: { padding: 16, gap: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: 'Geist_400Regular', fontSize: 13, textAlign: 'center' },
  // Account Form
  accountWrap: { gap: 16 },
  section: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 10 },
  sectionHeader: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  sectionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitleWrap: { flex: 1 },
  sectionTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 17, letterSpacing: 0 },
  sectionCaption: { fontFamily: 'Geist_500Medium', fontSize: 12, lineHeight: 17, marginTop: 1 },
  label: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.4, marginTop: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    fontFamily: 'Geist_500Medium',
    fontSize: 14,
  },
  textArea: { minHeight: 96, paddingTop: 12, paddingBottom: 12, lineHeight: 20 },
  skillGrid: { gap: 8 },
  skillBtn: { minHeight: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  skillText: { fontFamily: 'Geist_800ExtraBold', fontSize: 12 },
  passwordHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusBox: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { flex: 1, fontFamily: 'Geist_700Bold', fontSize: 12, lineHeight: 17 },
  footerActions: { gap: 10, marginTop: 4 },
  saveBtn: { height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveText: { fontFamily: 'Geist_800ExtraBold', fontSize: 12, letterSpacing: 1.6, color: '#fff' },
  resetBtn: { height: 48, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  resetText: { fontFamily: 'Geist_800ExtraBold', fontSize: 11, letterSpacing: 1.4 },
  // Settings
  settingsSection: { gap: 0, marginTop: 16 },
  settingsCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontFamily: 'Geist_500Medium', fontSize: 14 },
  settingValue: { fontFamily: 'Geist_700Bold', fontSize: 11, letterSpacing: 0.5 },
  miniLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2 },
});
