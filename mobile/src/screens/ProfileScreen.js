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
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import LogoutButton from '../components/LogoutButton';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { profileApi, apiBaseUrl } from '../api/api';
import { ProfileContentSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';
import { tokenStorage } from '../lib/tokenStorage';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];

const profileTabs = [
  { id: 'account', label: 'Account', icon: 'person-outline', description: 'Profile, email, password, and avatar' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', description: 'Email, push, digest, and recipe alerts' },
  { id: 'appearance', label: 'Appearance', icon: 'color-palette-outline', description: 'Theme and reading preferences' },
  { id: 'privacy', label: 'Privacy & Security', icon: 'shield-outline', description: 'Visibility and account safety' },
  { id: 'inventory', label: 'Kitchen Inventory', icon: 'cube-outline', description: 'Ingredient tracking tools', disabled: true, badge: 'Coming Soon' },
  { id: 'my-recipes', label: 'My Recipes', icon: 'restaurant-outline', description: 'Your created recipes' },
  { id: 'saved', label: 'Saved', icon: 'bookmark-outline', description: 'Bookmarked recipes' },
];

const emptyForm = {
  fullName: '',
  email: '',
  bio: '',
  cookingSkillLevel: 'Beginner',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  // Notification settings
  pushNotifications: true,
  emailNotifications: true,
  recipeAlerts: true,
  weeklyDigest: false,
  // Privacy settings
  publicProfile: true,
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
  
  const [activeTab, setActiveTab] = useState('account');
  
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
  const [avatarUri, setAvatarUri] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  
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

  const avatarUrl = useMemo(() => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar_url) {
      return user.avatar_url.startsWith('http') 
        ? user.avatar_url 
        : `${apiBaseUrl}${user.avatar_url}`;
    }
    return null;
  }, [user?.avatar_url, avatarPreview]);

  const displayEmail = form.email || user?.email || 'No email available';

  const setField = (key, value) => {
    setSuccess(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = () => {
    if (!normalizeFullName(form.fullName)) return 'Username cannot be blank.';
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
    setAvatarUri(null);
    setAvatarPreview(null);
  };

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library to upload an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];
        setAvatarUri(selectedAsset.uri);
        setAvatarPreview(selectedAsset.uri);
        setSuccess(false);
        setError(null);
      }
    } catch (err) {
      console.error('Error picking avatar:', err);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
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
      // Upload avatar if selected
      if (avatarUri) {
        const formData = new FormData();
        const fileName = avatarUri.split('/').pop() || 'avatar.jpg';
        const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        formData.append('avatar', {
          uri: avatarUri,
          name: fileName,
          type: fileType,
        });

        const token = await tokenStorage.getItem('userToken');
        const uploadResponse = await fetch(`${apiBaseUrl}/api/profile/${user.id}/avatar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to upload avatar');
        }

        setAvatarUri(null);
      }

      const { data } = await profileApi.updateProfile(user.id, payload);
      const nextInitial = baselineFromProfile(data.profile);
      setInitial(nextInitial);
      setForm({ ...emptyForm, ...nextInitial });
      setAvatarPreview(null);
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
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.9}>
              <View style={st.avatarWrapper}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={[st.avatarLg, { backgroundColor: colors.primary }]} />
                ) : (
                  <View style={[st.avatarLg, { backgroundColor: colors.primary }]}>
                    <Text style={st.avatarLgText}>{displayInitial}</Text>
                  </View>
                )}
                <View style={[st.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                  <Ionicons name="camera" size={24} color="#fff" />
                </View>
                {avatarPreview && (
                  <View style={[st.avatarBadge, { backgroundColor: colors.primary }]}>
                    <Text style={st.avatarBadgeText}>NEW</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <Text style={[st.nameText, { color: colors.text }]}>{displayName}</Text>
            <Text style={[st.emailText, { color: colors.textMuted }]}>{displayEmail}</Text>
            {avatarPreview && (
              <Text style={[st.avatarHint, { color: colors.textSubtle }]}>
                Tap avatar to change · Save to upload
              </Text>
            )}

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

          {/* Tabs - Horizontal scrollable */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[st.tabRow, { borderBottomColor: colors.border, paddingHorizontal: 12 }]}
          >
            {profileTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isDisabled = tab.disabled;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  style={[
                    st.tabItem,
                    isActive && { borderBottomWidth: 2, borderBottomColor: colors.primary },
                    isDisabled && { opacity: 0.5 },
                  ]}
                >
                  <Ionicons
                    name={tab.icon}
                    size={18}
                    color={isActive ? colors.primary : isDisabled ? colors.textMuted : colors.textSubtle}
                    style={{ marginBottom: 6 }}
                  />
                  <Text
                    style={[
                      st.tabText,
                      { color: isActive ? colors.primary : isDisabled ? colors.textMuted : colors.textSubtle },
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                  {tab.badge && (
                    <View style={[st.badge, { backgroundColor: colors.primarySoft }]}>
                      <Text style={[st.badgeText, { color: colors.primary }]}>{tab.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={st.body}>
            {activeTab === 'account' && (
              <View style={st.accountWrap}>
                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <SectionHeader
                    icon="person-outline"
                    title="Profile details"
                    caption="Keep your public CookMate identity current."
                    colors={colors}
                  />

                  <FieldLabel label="Username" colors={colors} />
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

                <View style={{ marginTop: 24, paddingHorizontal: 0 }}>
                  <LogoutButton />
                </View>

              </View>
            )}

            {activeTab === 'my-recipes' && (
              <View style={st.emptyState}>
                <Ionicons name="restaurant-outline" size={40} color={colors.textSubtle} />
                <Text style={[st.emptyText, { color: colors.textSubtle }]}>Your created recipes will appear here.</Text>
              </View>
            )}
            {activeTab === 'saved' && (
              <View style={st.emptyState}>
                <Ionicons name="bookmark-outline" size={40} color={colors.textSubtle} />
                <Text style={[st.emptyText, { color: colors.textSubtle }]}>Bookmark recipes to save them for later.</Text>
              </View>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <View style={st.accountWrap}>
                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <SectionHeader
                    icon="notifications-outline"
                    title="Notification preferences"
                    caption="Choose how you want to be notified."
                    colors={colors}
                  />

                  {[
                    { icon: 'phone-portrait-outline', label: 'Push notifications', key: 'pushNotifications' },
                    { icon: 'mail-outline', label: 'Email notifications', key: 'emailNotifications' },
                    { icon: 'flame-outline', label: 'Recipe alerts', key: 'recipeAlerts' },
                    { icon: 'newspaper-outline', label: 'Weekly digest', key: 'weeklyDigest' },
                  ].map((item) => (
                    <View key={item.key} style={[st.settingRow, { borderBottomWidth: 0, paddingHorizontal: 0 }]}>
                      <View style={st.settingLeft}>
                        <Ionicons name={item.icon} size={18} color={colors.primary} />
                        <Text style={[st.settingLabel, { color: colors.text }]}>{item.label}</Text>
                      </View>
                      <Switch
                        value={form[item.key] || false}
                        onValueChange={(value) => setField(item.key, value)}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.surface}
                      />
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => {}}
                  style={[st.settingsCard, { borderColor: colors.border, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                >
                  <View style={st.settingLeft}>
                    <Ionicons name="open-outline" size={18} color={colors.primary} />
                    <Text style={[st.settingLabel, { color: colors.text }]}>Open system notification settings</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                </TouchableOpacity>
              </View>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <View style={st.accountWrap}>
                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <SectionHeader
                    icon="color-palette-outline"
                    title="Appearance"
                    caption="Customize how CookMate looks."
                    colors={colors}
                  />

                  <View style={[st.settingRow, { borderBottomWidth: 0, paddingHorizontal: 0 }]}>
                    <View style={st.settingLeft}>
                      <Ionicons name="moon-outline" size={18} color={colors.primary} />
                      <Text style={[st.settingLabel, { color: colors.text }]}>Dark Mode</Text>
                    </View>
                    <Switch
                      value={isDark}
                      onValueChange={() => toggleTheme()}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.surface}
                    />
                  </View>

                  <FieldLabel label="Theme" colors={colors} />
                  <View style={st.skillGrid}>
                    {['System', 'Light', 'Dark'].map((theme) => {
                      const active = (theme === 'Dark' && isDark) || (theme === 'Light' && !isDark) || theme === 'System';
                      return (
                        <TouchableOpacity
                          key={theme}
                          onPress={() => {
                            if (theme === 'Dark') toggleTheme();
                            else if (theme === 'Light' && isDark) toggleTheme();
                          }}
                          style={[
                            st.skillBtn,
                            {
                              backgroundColor: active ? colors.text : colors.surface,
                              borderColor: active ? colors.text : colors.border,
                            },
                          ]}
                        >
                          <Text style={[st.skillText, { color: active ? colors.background : colors.textMuted }]}>
                            {theme}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* Privacy & Security Tab */}
            {activeTab === 'privacy' && (
              <View style={st.accountWrap}>
                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <SectionHeader
                    icon="shield-outline"
                    title="Privacy & Security"
                    caption="Manage your account safety and visibility."
                    colors={colors}
                  />

                  <View style={[st.settingRow, { borderBottomWidth: 0, paddingHorizontal: 0 }]}>
                    <View style={st.settingLeft}>
                      <Ionicons name="eye-outline" size={18} color={colors.primary} />
                      <View>
                        <Text style={[st.settingLabel, { color: colors.text }]}>Public profile</Text>
                        <Text style={[st.settingValue, { color: colors.textSubtle, fontSize: 11 }]}>
                          Allow others to see your profile
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={form.publicProfile !== false}
                      onValueChange={(value) => setField('publicProfile', value)}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.surface}
                    />
                  </View>
                </View>

                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <SectionHeader
                    icon="document-text-outline"
                    title="Data & Privacy"
                    caption="Manage your data and privacy settings."
                    colors={colors}
                  />

                  <TouchableOpacity
                    onPress={() => {}}
                    style={[st.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <View style={st.settingLeft}>
                      <Ionicons name="download-outline" size={18} color={colors.primary} />
                      <Text style={[st.settingLabel, { color: colors.text }]}>Request data export</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {}}
                    style={[st.settingRow, { borderBottomWidth: 0 }]}
                  >
                    <View style={st.settingLeft}>
                      <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                      <Text style={[st.settingLabel, { color: colors.text }]}>Privacy policy</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                  </TouchableOpacity>
                </View>

                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border, borderColor: colors.danger }]}>
                  <SectionHeader
                    icon="trash-outline"
                    title="Danger Zone"
                    caption="Permanent actions that cannot be undone."
                    colors={colors}
                  />

                  <TouchableOpacity
                    onPress={() => {}}
                    style={[st.resetBtn, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text style={[st.resetText, { color: colors.danger, marginLeft: 8 }]}>Delete Account</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 24, paddingHorizontal: 0 }}>
                  <LogoutButton />
                </View>
              </View>
            )}

            {/* Inventory Tab - Coming Soon */}
            {activeTab === 'inventory' && (
              <View style={st.emptyState}>
                <Ionicons name="cube-outline" size={48} color={colors.primary} />
                <Text style={[st.emptyText, { color: colors.text, fontFamily: 'Geist_800ExtraBold', fontSize: 18, marginTop: 16 }]}>
                  Kitchen Inventory
                </Text>
                <Text style={[st.emptyText, { color: colors.textSubtle, marginTop: 8 }]}>
                  Ingredient tracking tools coming soon.
                </Text>
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  // Header
  headerCard: { paddingTop: 24, paddingBottom: 20, alignItems: 'center' },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarLg: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  avatarLgText: { color: '#fff', fontFamily: 'Geist_800ExtraBold', fontSize: 36 },
  avatarOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    borderRadius: 45, 
    alignItems: 'center', 
    justifyContent: 'center',
    opacity: 0.7,
  },
  avatarBadge: { 
    position: 'absolute', 
    top: -4, 
    right: -4, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12,
  },
  avatarBadgeText: { 
    color: '#fff', 
    fontFamily: 'Geist_800ExtraBold', 
    fontSize: 9, 
    letterSpacing: 0.5,
  },
  avatarHint: { 
    fontFamily: 'Geist_500Medium', 
    fontSize: 11, 
    marginTop: 4, 
    marginBottom: 4,
  },
  nameText: { fontFamily: 'Geist_800ExtraBold', fontSize: 22, letterSpacing: -0.3 },
  emailText: { fontFamily: 'Geist_400Regular', fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', width: '100%', marginTop: 20, paddingTop: 18, borderTopWidth: 1 },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: 'Geist_800ExtraBold', fontSize: 22 },
  statLabel: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 1.5, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18, paddingHorizontal: 24 },
  // Tabs
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, minWidth: 70 },
  tabText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 0.5 },
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
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  badgeText: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 0.5, textTransform: 'uppercase' },
});
