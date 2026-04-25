import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { profileApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];

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

function AnimatedSection({ anim, index, children, style }) {
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [18 + index * 3, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default function AccountSettingsScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { colors, isDark } = useAppTheme();
  const mount = useRef(new Animated.Value(0)).current;
  const sectionAnims = useRef(Array.from({ length: 5 }, () => new Animated.Value(0))).current;
  const saveScale = useRef(new Animated.Value(1)).current;

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mount, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(
        75,
        sectionAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, [mount, sectionAnims]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user?.id) {
        setLoading(false);
        setError('Unable to load your account. Please sign in again.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data } = await profileApi.getProfile(user.id);
        if (!active) return;
        const nextInitial = baselineFromProfile(data.profile);
        setInitial(nextInitial);
        setForm({ ...emptyForm, ...nextInitial });
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.error || err?.message || 'Unable to load account settings.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [user?.id]);

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

  const displayInitial = useMemo(() => {
    const name = form.fullName || user?.name || 'CookMate Chef';
    return name.trim() ? name.trim().charAt(0).toUpperCase() : '?';
  }, [form.fullName, user?.name]);

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

  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={st.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            st.flex1,
            {
              opacity: mount,
              transform: [
                {
                  translateY: mount.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView
            style={st.flex1}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={st.scrollContent}
          >
            <View style={st.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[st.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                accessibilityLabel="Back to profile"
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <View style={st.headerTextWrap}>
                <Text style={[st.title, { color: colors.text }]}>Account settings</Text>
                <Text style={[st.subtitle, { color: colors.textMuted }]}>
                  Update your email, password, and profile details
                </Text>
              </View>
            </View>

            <AnimatedSection anim={sectionAnims[0]} index={0} style={st.summaryCard}>
              <View
                style={[
                  st.summaryInner,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={[st.avatar, { backgroundColor: colors.text }]}>
                  <Text style={[st.avatarText, { color: isDark ? colors.background : '#fff' }]}>
                    {displayInitial}
                  </Text>
                </View>
                <View style={st.summaryText}>
                  <Text numberOfLines={1} style={[st.summaryName, { color: colors.text }]}>
                    {form.fullName || 'CookMate Chef'}
                  </Text>
                  <Text numberOfLines={1} style={[st.summaryEmail, { color: colors.textMuted }]}>
                    {form.email || 'No email set'}
                  </Text>
                </View>
                {loading && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
            </AnimatedSection>

            <AnimatedSection
              anim={sectionAnims[1]}
              index={1}
              style={[
                st.section,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
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
                editable={!loading && !saving}
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
                editable={!loading && !saving}
              />

              <FieldLabel label="Cooking skill" colors={colors} />
              <View style={st.skillGrid}>
                {skillLevels.map((level) => {
                  const active = form.cookingSkillLevel === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setField('cookingSkillLevel', level)}
                      disabled={loading || saving}
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
            </AnimatedSection>

            <AnimatedSection
              anim={sectionAnims[2]}
              index={2}
              style={[
                st.section,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
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
                editable={!loading && !saving}
              />
            </AnimatedSection>

            <AnimatedSection
              anim={sectionAnims[3]}
              index={3}
              style={[
                st.section,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={st.passwordHeader}>
                <SectionHeader
                  icon="lock-closed-outline"
                  title="Password"
                  caption="Current password is required for email or password changes."
                  colors={colors}
                  compact
                />
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
                editable={!loading && !saving}
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
                editable={!loading && !saving}
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
                editable={!loading && !saving}
              />
            </AnimatedSection>

            {(error || success) && (
              <AnimatedSection
                anim={sectionAnims[4]}
                index={4}
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
              </AnimatedSection>
            )}

            <View style={st.footerActions}>
              <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                <TouchableOpacity
                  onPress={handleSave}
                  onPressIn={animatePressIn}
                  onPressOut={animatePressOut}
                  disabled={loading || saving || !hasChanges}
                  style={[
                    st.saveBtn,
                    {
                      backgroundColor:
                        loading || saving || !hasChanges ? colors.textSubtle : colors.primary,
                    },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#fff" />
                      <Text style={st.saveText}>SAVE ACCOUNT</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity
                onPress={resetForm}
                disabled={loading || saving || !hasChanges}
                style={[
                  st.resetBtn,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              >
                <Text style={[st.resetText, { color: colors.textMuted }]}>RESET CHANGES</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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

const st = StyleSheet.create({
  flex1: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 40, gap: 14 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 4 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  title: { fontFamily: 'Geist_800ExtraBold', fontSize: 27, letterSpacing: 0 },
  subtitle: { fontFamily: 'Geist_500Medium', fontSize: 13, lineHeight: 19, marginTop: 2 },
  summaryCard: { marginBottom: 2 },
  summaryInner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Geist_800ExtraBold', fontSize: 22 },
  summaryText: { flex: 1, minWidth: 0 },
  summaryName: { fontFamily: 'Geist_800ExtraBold', fontSize: 16 },
  summaryEmail: { fontFamily: 'Geist_500Medium', fontSize: 12, marginTop: 2 },
  section: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 10 },
  sectionHeader: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  skillBtn: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillText: { fontFamily: 'Geist_800ExtraBold', fontSize: 12 },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: { flex: 1, fontFamily: 'Geist_700Bold', fontSize: 12, lineHeight: 17 },
  footerActions: { gap: 10, marginTop: 4 },
  saveBtn: {
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveText: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1.6,
    color: '#fff',
  },
  resetBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: { fontFamily: 'Geist_800ExtraBold', fontSize: 11, letterSpacing: 1.4 },
});
