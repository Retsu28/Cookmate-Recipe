import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutButton from '../components/LogoutButton';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useAppTheme } from '../context/ThemeContext';
import { profileApi, settingsApi, recipeApi, mfaApi, apiBaseUrl } from '../api/api';
import OptimizedImage from '../components/OptimizedImage';
import { ProfileContentSkeleton } from '../components/SkeletonPlaceholder';
import MFADisableModal from '../components/MFADisableModal';
import useInitialContentLoading from '../hooks/useInitialContentLoading';
import { useFontSizes } from '../hooks/useFontSizes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];

const profileTabs = [
  { id: 'account', label: 'Account', icon: 'person-outline', description: 'Profile, email, password, and avatar' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', description: 'Email, push, digest, and recipe alerts' },
  { id: 'appearance', label: 'Appearance', icon: 'color-palette-outline', description: 'Theme and reading preferences' },
  { id: 'privacy', label: 'Privacy & Security', icon: 'shield-outline', description: 'Visibility and account safety' },
  { id: 'inventory', label: 'Kitchen Inventory', icon: 'cube-outline', description: 'Ingredient tracking tools', disabled: true, badge: 'Coming Soon' },
  { id: 'saved', label: 'Saved', icon: 'bookmark-outline', description: 'Bookmarked recipes' },
  { id: 'downloads', label: 'Downloads', icon: 'cloud-download-outline', description: 'Recipes saved for offline' },
];

const emptyForm = {
  fullName: '',
  email: '',
  cookingSkillLevel: 'Beginner',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  // Notification settings
  pushNotifications: true,
  emailNotifications: true,
  recipeAlerts: true,
  weeklyDigest: false,
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

function FieldLabel({ label, colors, fontSizes }) {
  return <Text style={[st.label, { color: colors.textSubtle, fontSize: fontSizes.xs }]}>{label.toUpperCase()}</Text>;
}

function SavedRecipesInline({ user, colors, isDark, navigation, fontSizes }) {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const loadSaved = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await recipeApi.getSavedRecipes(user.id);
      setSaved(res.data?.saved || []);
    } catch {
      setSaved([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadSaved(); }, [loadSaved]));

  const handleRemove = async (item) => {
    if (removingId) return;
    setRemovingId(item.recipe_id);
    setSaved(prev => prev.filter(r => r.recipe_id !== item.recipe_id));
    try {
      await recipeApi.unsaveRecipe(item.recipe_id);
    } catch {
      setSaved(prev => [item, ...prev]);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (saved.length === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
        <Ionicons name="heart-outline" size={56} color={colors.border} />
        <Text style={{ fontFamily: 'Geist_700Bold', fontSize: fontSizes.base, color: colors.text }}>No saved recipes yet</Text>
        <Text style={{ fontFamily: 'Geist_400Regular', fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
          Tap the heart icon on any recipe to save it here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
      {saved.map(item => (
        <TouchableOpacity
          key={String(item.id)}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('RecipeDetail', { id: item.recipe_id })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderRadius: 16,
            overflow: 'hidden',
            padding: 12,
            gap: 12,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          <View style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
            {item.image_url ? (
              <OptimizedImage source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#431407' : '#fff7ed' }}>
                <Ionicons name="restaurant-outline" size={26} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: 'Geist_700Bold', fontSize: fontSizes.sm, color: colors.text, lineHeight: 20 }} numberOfLines={2}>{item.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {item.category ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: isDark ? '#431407' : '#fff7ed' }}>
                  <Text style={{ fontFamily: 'Geist_700Bold', fontSize: 10, color: colors.primary }}>{item.category}</Text>
                </View>
              ) : null}
              {item.total_time_minutes ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 11, color: colors.textMuted }}>{item.total_time_minutes} min</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontFamily: 'Geist_400Regular', fontSize: 11, color: colors.textSubtle }}>
              Saved {new Date(item.saved_at).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleRemove(item)}
            disabled={removingId === item.recipe_id}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            {removingId === item.recipe_id ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="heart" size={22} color="#ef4444" />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, refreshUser, logout } = useAuth();
  const { colors, isDark, toggleTheme, mode, setTheme, fontSize, setFontSize } = useAppTheme();
  const { fontSizes } = useFontSizes();
  
  const [activeTab, setActiveTab] = useState('account');
  const tabAnim = useRef(new Animated.Value(1)).current;
  
  const userBaseline = useMemo(
    () => ({
      fullName: user?.name || user?.full_name || '',
      email: user?.email || '',
      cookingSkillLevel: 'Beginner',
    }),
    [user?.email, user?.full_name, user?.name]
  );

  const [initial, setInitial] = useState(userBaseline);
  const [form, setForm] = useState({ ...emptyForm, ...userBaseline });
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  
  // Appearance preferences (draft = UI selection, applied = actually saved)
  const [draftTheme, setDraftTheme] = useState(mode);
  const [draftFontSize, setDraftFontSize] = useState(fontSize);
  const [appliedTheme, setAppliedTheme] = useState(mode);
  const [appliedFontSize, setAppliedFontSize] = useState(fontSize);
  
  // Notification preferences (draft = UI selection, applied = actually saved)
  const [draftNotifications, setDraftNotifications] = useState({
    pushNotifications: form.pushNotifications,
    emailNotifications: form.emailNotifications,
    recipeAlerts: form.recipeAlerts,
    weeklyDigest: form.weeklyDigest,
  });
  const [appliedNotifications, setAppliedNotifications] = useState({
    pushNotifications: form.pushNotifications,
    emailNotifications: form.emailNotifications,
    recipeAlerts: form.recipeAlerts,
    weeklyDigest: form.weeklyDigest,
  });
  
  // Delete Account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const openDeleteModal = () => {
    setDeleteStep(1);
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setDeleteStep(1);
    setDeletePassword('');
    setDeleteError('');
  };

  const confirmDeleteAccount = async () => {
    if (!user?.id || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await profileApi.deleteAccount(user.id, deletePassword);
      setShowDeleteModal(false);
      await logout();
    } catch (err) {
      setDeleteError(err?.response?.data?.error || err?.message || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaStatusLoading, setMfaStatusLoading] = useState(false);
  const [mfaDisableLoading, setMfaDisableLoading] = useState(false);
  const [showMfaDisable, setShowMfaDisable] = useState(false);

  // Fetch MFA status from DB whenever: user changes, tab switches to privacy, or screen regains focus
  const fetchMfaStatus = React.useCallback(() => {
    if (!user?.id) {
      setMfaEnabled(false);
      return;
    }
    if (activeTab !== 'privacy') return;
    let cancelled = false;
    setMfaStatusLoading(true);
    mfaApi.getStatus()
      .then((res) => {
        if (!cancelled) setMfaEnabled(res.data?.mfa_enabled === true);
      })
      .catch(() => { if (!cancelled) setMfaEnabled(false); })
      .finally(() => { if (!cancelled) setMfaStatusLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, user?.id]);

  // Run on tab switch or user change
  useEffect(() => {
    fetchMfaStatus();
  }, [fetchMfaStatus]);

  // Run every time the screen regains focus (handles back-navigation from MFASetupScreen)
  useFocusEffect(
    React.useCallback(() => {
      fetchMfaStatus();
    }, [fetchMfaStatus])
  );

  const handleMfaToggle = () => {
    if (mfaEnabled) {
      setShowMfaDisable(true);
    } else {
      navigation.navigate('MFASetup', {
        onEnabled: () => setMfaEnabled(true),
      });
    }
  };

  const handleMfaDisabled = () => {
    setShowMfaDisable(false);
    setMfaEnabled(false);
    Alert.alert('MFA Disabled', 'Two-Factor Authentication has been turned off.');
  };

  // Check for unsaved changes
  const hasUnsavedAppearance = draftTheme !== appliedTheme || draftFontSize !== appliedFontSize;
  const hasUnsavedNotifications = 
    draftNotifications.pushNotifications !== appliedNotifications.pushNotifications ||
    draftNotifications.emailNotifications !== appliedNotifications.emailNotifications ||
    draftNotifications.recipeAlerts !== appliedNotifications.recipeAlerts ||
    draftNotifications.weeklyDigest !== appliedNotifications.weeklyDigest;
  
  const saveScale = useRef(new Animated.Value(1)).current;

  const switchTab = (id) => {
    if (id === activeTab) return;
    Animated.timing(tabAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setActiveTab(id);
      Animated.timing(tabAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };
  const isInitialLoading = useInitialContentLoading();

  // Load appearance and notification settings: AsyncStorage first (immediate), then API sync
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 1. Load from AsyncStorage first
        const [savedTheme, savedFontSize, savedNotifications] = await Promise.all([
          AsyncStorage.getItem('cookmate:theme'),
          AsyncStorage.getItem('cookmate:fontSize'),
          AsyncStorage.getItem('cookmate:notifications'),
        ]);
        
        // Set appearance from AsyncStorage first (or use context as fallback)
        const initialTheme = ['light', 'dark', 'system'].includes(savedTheme) ? savedTheme : mode;
        const initialFontSize = ['small', 'medium', 'large'].includes(savedFontSize) ? savedFontSize : fontSize;
        
        setDraftTheme(initialTheme);
        setAppliedTheme(initialTheme);
        setDraftFontSize(initialFontSize);
        setAppliedFontSize(initialFontSize);
        
        // Set notifications from AsyncStorage or default
        const initialNotifications = savedNotifications ? JSON.parse(savedNotifications) : {
          pushNotifications: true,
          emailNotifications: true,
          recipeAlerts: true,
          weeklyDigest: false,
        };
        setDraftNotifications(initialNotifications);
        setAppliedNotifications(initialNotifications);
        
        // Update form with notification values
        setForm(prev => ({
          ...prev,
          ...initialNotifications,
        }));
        
        // 2. Sync with API if logged in
        if (user?.id) {
          const [appearanceData, notificationsData] = await Promise.all([
            settingsApi.getSettings(user.id, 'appearance'),
            settingsApi.getSettings(user.id, 'notifications'),
          ]);
          
          // Sync appearance settings — local value wins if already set
          // (preserves whatever the user toggled on the auth form)
          if (appearanceData?.data?.value?.theme || appearanceData?.data?.value?.fontSize) {
            const { theme: apiTheme, fontSize: apiFontSize } = appearanceData.data.value;
            // Only apply API theme if the user has no locally-stored preference
            if (['light', 'dark', 'system'].includes(apiTheme) && !savedTheme) {
              setDraftTheme(apiTheme);
              setAppliedTheme(apiTheme);
              await AsyncStorage.setItem('cookmate:theme', apiTheme);
            }
            if (['small', 'medium', 'large'].includes(apiFontSize)) {
              setDraftFontSize(apiFontSize);
              setAppliedFontSize(apiFontSize);
              await AsyncStorage.setItem('cookmate:fontSize', apiFontSize);
            }
          }
          
          // Sync notification settings
          if (notificationsData?.data?.value) {
            const apiNotifications = notificationsData.data.value;
            const normalizedNotifications = {
              pushNotifications: typeof apiNotifications.pushNotifications === 'boolean' ? apiNotifications.pushNotifications : true,
              emailNotifications: typeof apiNotifications.emailNotifications === 'boolean' ? apiNotifications.emailNotifications : true,
              recipeAlerts: typeof apiNotifications.newRecipeAlerts === 'boolean' ? apiNotifications.newRecipeAlerts : true,
              weeklyDigest: typeof apiNotifications.weeklyDigest === 'boolean' ? apiNotifications.weeklyDigest : false,
            };
            
            setDraftNotifications(normalizedNotifications);
            setAppliedNotifications(normalizedNotifications);
            await AsyncStorage.setItem('cookmate:notifications', JSON.stringify(normalizedNotifications));
            
            // Update form with API values
            setForm(prev => ({
              ...prev,
              ...normalizedNotifications,
            }));
          }
        }
      } catch {
        // Silent fail - AsyncStorage values already applied
      }
    };
    loadSettings();
  }, [user?.id]);

  // Keep the Profile > Appearance UI in sync with theme changes coming
  // from elsewhere (e.g. the AuthThemeToggle on the auth forms). Whenever
  // ThemeContext's `mode` changes, mirror it into both draft and applied
  // so the selected card visually updates without showing "unsaved changes".
  useEffect(() => {
    if (!['light', 'dark', 'system'].includes(mode)) return;
    setDraftTheme((prev) => (prev === mode ? prev : mode));
    setAppliedTheme((prev) => (prev === mode ? prev : mode));
  }, [mode]);

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
      !!avatarUri ||
      normalizeFullName(form.fullName) !== normalizeFullName(initial.fullName) ||
      normalizeEmail(form.email) !== normalizeEmail(initial.email) ||
      form.cookingSkillLevel !== initial.cookingSkillLevel ||
      form.currentPassword.length > 0 ||
      form.newPassword.length > 0 ||
      form.confirmPassword.length > 0,
    [form, initial, avatarUri]
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
    
    // Also update draft notifications if this is a notification setting
    if (['pushNotifications', 'emailNotifications', 'recipeAlerts', 'weeklyDigest'].includes(key)) {
      setDraftNotifications(prev => ({ ...prev, [key]: value }));
    }
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

  const saveNotificationSettings = async () => {
    if (!user?.id) return;
    
    try {
      // Always save to AsyncStorage first (for immediate persistence)
      await AsyncStorage.setItem('cookmate:notifications', JSON.stringify(draftNotifications));
      
      // Prepare payload for API (match web format)
      const apiPayload = {
        pushNotifications: draftNotifications.pushNotifications,
        emailNotifications: draftNotifications.emailNotifications,
        newRecipeAlerts: draftNotifications.recipeAlerts, // Map to web format
        weeklyDigest: draftNotifications.weeklyDigest,
      };
      
      // Save to API
      await settingsApi.saveSettings(user.id, 'notifications', apiPayload);
      
      // Act on the push notifications toggle change
      const pushWasOn = appliedNotifications.pushNotifications;
      const pushNowOn = draftNotifications.pushNotifications;
      if (pushWasOn && !pushNowOn) {
        // User turned OFF — cancel all scheduled local notifications immediately
        const { default: Notifications } = await import('expo-notifications');
        await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
      } else if (!pushWasOn && pushNowOn) {
        // User turned ON — re-register and reschedule reminders
        const { refreshAndSchedulePlannerReminders } = await import('../notifications/plannerNotifications');
        refreshAndSchedulePlannerReminders().catch(() => {});
      }

      // Update applied state
      setAppliedNotifications(draftNotifications);
      
      Alert.alert('Notifications Saved', 'Your notification preferences have been saved.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save notification settings.');
    }
  };

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library to upload an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
      cooking_skill_level: form.cookingSkillLevel,
    };
    if (emailChanged) payload.current_password = form.currentPassword;

    setSaving(true);
    try {
      if (passwordChanging) {
        await authService.changePassword(form.currentPassword, form.newPassword);
      }
      // Upload avatar if selected
      if (avatarUri) {
        setUploadingAvatar(true);
        try {
          await profileApi.uploadAvatar(user.id, avatarUri);
          setAvatarUri(null);
        } finally {
          setUploadingAvatar(false);
        }
      }

      const { data } = await profileApi.updateProfile(user.id, payload);
      const nextInitial = baselineFromProfile(data.profile);
      setInitial(nextInitial);
      setForm({ ...emptyForm, ...nextInitial });
      try {
        await refreshUser?.();
      } catch {
        // The profile save succeeded; the session will refresh on the next app load.
      }
      setAvatarPreview(null);
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
                {uploadingAvatar && (
                  <View style={[st.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                {avatarPreview && !uploadingAvatar && (
                  <View style={[st.avatarBadge, { backgroundColor: colors.primary }]}>
                    <Text style={st.avatarBadgeText}>NEW</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <Text style={[st.nameText, { color: colors.text, fontSize: fontSizes.xl }]}>{displayName}</Text>
            <Text style={[st.emailText, { color: colors.textMuted, fontSize: fontSizes.sm }]}>{displayEmail}</Text>
            {uploadingAvatar && (
              <View style={[st.uploadProgressWrap, { backgroundColor: colors.border }]}>
                <View style={[st.uploadProgressBar, { backgroundColor: colors.primary }]} />
              </View>
            )}
            {uploadingAvatar && (
              <Text style={[st.avatarHint, { color: colors.primary }]}>
                Uploading photo…
              </Text>
            )}
            {avatarPreview && !uploadingAvatar && (
              <Text style={[st.avatarHint, { color: colors.textSubtle }]}>
                Tap avatar to change · Save to upload
              </Text>
            )}
            <Text style={[st.avatarHint, { color: colors.textSubtle, marginTop: 4 }]}>
              {'Cooking Skill — '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {form.cookingSkillLevel || 'Not set'}
              </Text>
            </Text>

          </View>

          {/* Tabs - Full width */}
          <View style={[st.tabRow, { borderBottomColor: colors.border }]}>
            {profileTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isDisabled = tab.disabled;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => !isDisabled && switchTab(tab.id)}
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
                    style={{ marginBottom: 4 }}
                  />
                  <Text
                    style={[
                      st.tabText,
                      { 
                        color: isActive ? colors.primary : isDisabled ? colors.textMuted : colors.textSubtle,
                        fontSize: fontSizes.xs,
                      },
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
          </View>

          <Animated.View style={[st.body, { opacity: tabAnim, transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
            {activeTab === 'account' && (
              <View style={st.accountWrap}>
                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <SectionHeader
                    icon="person-outline"
                    title="Profile details"
                    caption="Keep your public CookMate identity current."
                    colors={colors}
                  />

                  <FieldLabel label="Username" colors={colors} fontSizes={fontSizes} />
                  <TextInput
                    value={form.fullName}
                    onChangeText={(value) => setField('fullName', value)}
                    style={inputBase}
                    placeholder="Jane Doe"
                    placeholderTextColor={colors.textSubtle}
                    autoCapitalize="words"
                    editable={!profileLoading && !saving}
                  />

                  <FieldLabel label="Cooking skill" colors={colors} fontSizes={fontSizes} />
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
                          <Text style={[st.skillText, { color: active ? colors.background : colors.textMuted, fontSize: fontSizes.sm }]}>
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
                  <FieldLabel label="Email address" colors={colors} fontSizes={fontSizes} />
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

                  <FieldLabel label="Current password" colors={colors} fontSizes={fontSizes} />
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

                  <FieldLabel label="New password" colors={colors} fontSizes={fontSizes} />
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

                  <FieldLabel label="Confirm password" colors={colors} fontSizes={fontSizes} />
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
                      {uploadingAvatar ? (
                        <>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={st.saveText}>UPLOADING PHOTO…</Text>
                        </>
                      ) : saving ? (
                        <>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={st.saveText}>SAVING…</Text>
                        </>
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

            {activeTab === 'saved' && (
              <SavedRecipesInline user={user} colors={colors} isDark={isDark} navigation={navigation} fontSizes={fontSizes} />
            )}

            {activeTab === 'downloads' && (
              <View style={{ padding: 16 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Downloads')}
                  activeOpacity={0.8}
                  style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }]}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? '#431407' : '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Geist_700Bold', fontSize: fontSizes.base, color: colors.text }}>Manage Downloads</Text>
                    <Text style={{ fontFamily: 'Geist_400Regular', fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>View and remove offline-saved recipes</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <View style={st.accountWrap}>
                {[
                  { icon: 'phone-portrait-outline', label: 'Push notifications', description: 'Show timely reminders and app updates on this device.', key: 'pushNotifications' },
                  { icon: 'mail-outline', label: 'Email notifications', description: 'Receive account, planning, and cooking updates in your inbox.', key: 'emailNotifications' },
                  { icon: 'flame-outline', label: 'Recipe alerts', description: 'Hear about fresh recipe ideas that match your cooking profile.', key: 'recipeAlerts' },
                ].map((item) => {
                  const checked = form[item.key] || false;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      activeOpacity={0.7}
                      onPress={() => setField(item.key, !checked)}
                      style={[
                        st.notifToggleRow,
                        {
                          borderColor: checked ? colors.primary + '55' : colors.border,
                          backgroundColor: checked ? colors.primarySoft + '40' : colors.surface,
                        },
                      ]}
                    >
                      <View
                        style={[
                          st.notifIconBox,
                          { backgroundColor: checked ? colors.primarySoft : colors.surfaceAlt },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={checked ? colors.primary : colors.textSubtle}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[st.notifToggleTitle, { color: colors.text }]}>{item.label}</Text>
                        <Text style={[st.notifToggleDesc, { color: colors.textMuted }]}>{item.description}</Text>
                      </View>
                      <Switch
                        value={checked}
                        onValueChange={(value) => setField(item.key, value)}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor='#ffffff'
                      />
                    </TouchableOpacity>
                  );
                })}

                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {hasUnsavedNotifications && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Ionicons name="alert-circle" size={16} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Geist_600SemiBold' }}>
                        You have unsaved notification changes
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={saveNotificationSettings}
                    activeOpacity={0.9}
                    style={[st.saveBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={st.saveText}>
                      {hasUnsavedNotifications ? 'SAVE NOTIFICATIONS • UNSAVED' : 'SAVE NOTIFICATIONS'}
                    </Text>
                  </TouchableOpacity>
                </View>
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

                  <FieldLabel label="Theme" colors={colors} fontSizes={fontSizes} />
                  <View style={st.appearanceGrid}>
                    {[
                      { id: 'light', label: 'Light', icon: 'sunny-outline' },
                      { id: 'dark', label: 'Dark', icon: 'moon-outline' },
                      { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
                    ].map((theme) => {
                      const active = draftTheme === theme.id;
                      return (
                        <TouchableOpacity
                          key={theme.id}
                          onPress={() => setDraftTheme(theme.id)}
                          style={[
                            st.appearanceBtn,
                            {
                              backgroundColor: active ? colors.primary : colors.surface,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <View style={[st.appearanceIconBox, { backgroundColor: active ? 'rgba(255,255,255,0.15)' : colors.surfaceAlt }]}>
                            <Ionicons name={theme.icon} size={18} color={active ? '#fff' : colors.textSubtle} />
                          </View>
                          <Text style={[st.appearanceBtnText, { color: active ? '#fff' : colors.textMuted }]}>
                            {theme.label}
                          </Text>
                          {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <FieldLabel label="Font Size" colors={colors} fontSizes={fontSizes} />
                  <View style={st.appearanceGrid}>
                    {[
                      { id: 'small', label: 'Small', icon: 'text-outline' },
                      { id: 'medium', label: 'Medium', icon: 'reorder-four-outline' },
                      { id: 'large', label: 'Large', icon: 'expand-outline' },
                    ].map((size) => {
                      const active = draftFontSize === size.id;
                      return (
                        <TouchableOpacity
                          key={size.id}
                          onPress={() => setDraftFontSize(size.id)}
                          style={[
                            st.appearanceBtn,
                            {
                              backgroundColor: active ? colors.primary : colors.surface,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <View style={[st.appearanceIconBox, { backgroundColor: active ? 'rgba(255,255,255,0.15)' : colors.surfaceAlt }]}>
                            <Ionicons name={size.icon} size={18} color={active ? '#fff' : colors.textSubtle} />
                          </View>
                          <Text style={[st.appearanceBtnText, { color: active ? '#fff' : colors.textMuted }]}>
                            {size.label}
                          </Text>
                          {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Unsaved Changes Warning */}
                  {hasUnsavedAppearance && (
                    <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="alert-circle" size={16} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                        You have unsaved changes
                      </Text>
                    </View>
                  )}

                  {/* Save Appearance Button */}
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        // Always save to AsyncStorage first (for immediate persistence)
                        await AsyncStorage.setItem('cookmate:theme', draftTheme);
                        await AsyncStorage.setItem('cookmate:fontSize', draftFontSize);
                        
                        // Apply the theme and font size globally
                        await setTheme(draftTheme);
                        await setFontSize(draftFontSize);
                        
                        // Update applied state
                        setAppliedTheme(draftTheme);
                        setAppliedFontSize(draftFontSize);
                        
                        // If user is logged in, also save to API for cross-device sync
                        if (user?.id) {
                          await settingsApi.saveSettings(user.id, 'appearance', {
                            theme: draftTheme,
                            fontSize: draftFontSize,
                          });
                        }
                        
                        Alert.alert('Appearance Saved', 'Your appearance settings have been saved.');
                      } catch (err) {
                        Alert.alert('Error', 'Failed to save appearance settings.');
                      }
                    }}
                    activeOpacity={0.9}
                    style={{
                      marginTop: hasUnsavedAppearance ? 8 : 16,
                      backgroundColor: colors.primary,
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      alignItems: 'center',
                      opacity: hasUnsavedAppearance ? 1 : 0.9,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                      {hasUnsavedAppearance ? 'SAVE APPEARANCE • UNSAVED' : 'SAVE APPEARANCE'}
                    </Text>
                  </TouchableOpacity>
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

                  
                  {/* Kitchen Inventory - Coming Soon */}
                  <TouchableOpacity
                    activeOpacity={1}
                    style={[
                      st.notifToggleRow,
                      { borderColor: colors.border, backgroundColor: colors.surface, opacity: 0.5 },
                    ]}
                  >
                    <View style={[st.notifIconBox, { backgroundColor: colors.surfaceAlt }]}>
                      <Ionicons name="cube-outline" size={20} color={colors.textSubtle} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[st.notifToggleTitle, { color: colors.textMuted }]}>Show kitchen inventory</Text>
                        <View style={[st.badge, { backgroundColor: colors.primarySoft }]}>
                          <Text style={[st.badgeText, { color: colors.primary }]}>Coming Soon</Text>
                        </View>
                      </View>
                      <Text style={[st.notifToggleDesc, { color: colors.textSubtle }]}>Allow others to see your kitchen inventory if your profile is public.</Text>
                    </View>
                    <Switch
                      value={false}
                      disabled={true}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor='#ffffff'
                    />
                  </TouchableOpacity>
                </View>

                {/* Two-Factor Authentication */}
                <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <SectionHeader
                    icon="lock-closed-outline"
                    title="Two-Factor Authentication"
                    caption="Add an extra layer of security to your account."
                    colors={colors}
                  />

                  <View style={[st.settingRow, { borderBottomWidth: 0, paddingHorizontal: 0 }]}>
                    <View style={st.settingLeft}>
                      <View style={[st.mfaIconWrap, { backgroundColor: mfaEnabled ? colors.primarySoft : colors.surfaceAlt }]}>
                        <Ionicons
                          name={mfaEnabled ? 'shield-checkmark' : 'shield-outline'}
                          size={18}
                          color={mfaEnabled ? colors.primary : colors.textMuted}
                        />
                      </View>
                      <View>
                        <Text style={[st.settingLabel, { color: colors.text }]}>Authenticator App (TOTP)</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          {mfaStatusLoading ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <View style={[
                              st.mfaStatusBadge,
                              { backgroundColor: mfaEnabled ? '#dcfce7' : colors.surfaceAlt }
                            ]}>
                              <View style={[
                                st.mfaStatusDot,
                                { backgroundColor: mfaEnabled ? '#16a34a' : colors.textSubtle }
                              ]} />
                              <Text style={[
                                st.mfaStatusText,
                                { color: mfaEnabled ? '#16a34a' : colors.textMuted }
                              ]}>
                                {mfaEnabled ? 'Enabled' : 'Disabled'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <Switch
                      value={mfaEnabled}
                      onValueChange={handleMfaToggle}
                      disabled={mfaStatusLoading}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={'#ffffff'}
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
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                    style={[st.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <View style={st.settingLeft}>
                      <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                      <Text style={[st.settingLabel, { color: colors.text }]}>Privacy policy</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('About')}
                    style={[st.settingRow, { borderBottomWidth: 0 }]}
                  >
                    <View style={st.settingLeft}>
                      <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                      <Text style={[st.settingLabel, { color: colors.text }]}>About CookMate</Text>
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
                    onPress={openDeleteModal}
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

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <MFADisableModal
        visible={showMfaDisable}
        onClose={() => setShowMfaDisable(false)}
        onDisabled={handleMfaDisabled}
      />

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={st.modalOverlay}
        >
          <View style={[st.deleteModal, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
            {deleteStep === 1 ? (
              <>
                <View style={[st.deleteModalIcon, { backgroundColor: colors.danger + '20' }]}>
                  <Ionicons name="trash-outline" size={28} color={colors.danger} />
                </View>
                <Text style={[st.deleteModalTitle, { color: colors.text }]}>Delete your account?</Text>
                <Text style={[st.deleteModalBody, { color: colors.textMuted }]}>
                  Your account will be permanently deleted after 7 days. You will be logged out immediately. This cannot be undone.
                </Text>
                <View style={st.deleteModalActions}>
                  <TouchableOpacity
                    onPress={closeDeleteModal}
                    style={[st.deleteModalBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  >
                    <Text style={[st.deleteModalBtnText, { color: colors.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDeleteStep(2)}
                    style={[st.deleteModalBtn, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}
                  >
                    <Text style={[st.deleteModalBtnText, { color: colors.danger }]}>Continue →</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={[st.deleteModalIcon, { backgroundColor: colors.danger + '20' }]}>
                  <Ionicons name="warning-outline" size={28} color={colors.danger} />
                </View>
                <Text style={[st.deleteModalTitle, { color: colors.text }]}>Confirm deletion</Text>
                <Text style={[st.deleteModalBody, { color: colors.textMuted }]}>
                  Enter your current password to schedule account deletion.
                </Text>
                <TextInput
                  value={deletePassword}
                  onChangeText={(v) => { setDeletePassword(v); setDeleteError(''); }}
                  secureTextEntry
                  placeholder="Current password"
                  placeholderTextColor={colors.textSubtle}
                  style={[st.deleteModalInput, { backgroundColor: colors.background, borderColor: deleteError ? colors.danger : colors.border, color: colors.text }]}
                  autoFocus
                />
                {!!deleteError && (
                  <View style={[st.deleteModalError, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                    <Text style={[st.deleteModalErrorText, { color: colors.danger }]}>{deleteError}</Text>
                  </View>
                )}
                <View style={st.deleteModalActions}>
                  <TouchableOpacity
                    onPress={() => { setDeleteStep(1); setDeleteError(''); }}
                    disabled={deleting}
                    style={[st.deleteModalBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  >
                    <Text style={[st.deleteModalBtnText, { color: colors.textMuted }]}>← Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={confirmDeleteAccount}
                    disabled={deleting || !deletePassword}
                    style={[st.deleteModalBtn, { backgroundColor: colors.danger, borderColor: colors.danger, opacity: (deleting || !deletePassword) ? 0.6 : 1 }]}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[st.deleteModalBtnText, { color: '#fff' }]}>Delete Account</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  uploadProgressWrap: {
    width: 120,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  uploadProgressBar: {
    width: '65%',
    height: '100%',
    borderRadius: 2,
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
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 4 },
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
  tabIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
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
  mfaIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mfaStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  mfaStatusDot: { width: 6, height: 6, borderRadius: 3 },
  mfaStatusText: { fontFamily: 'Geist_600SemiBold', fontSize: 11 },
  notifToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  notifIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifToggleTitle: {
    fontFamily: 'Geist_700Bold',
    fontSize: 14,
    lineHeight: 19,
  },
  notifToggleDesc: {
    fontFamily: 'Geist_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  appearanceGrid: { flexDirection: 'row', gap: 8 },
  appearanceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  appearanceIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearanceBtnText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 11,
    flexShrink: 1,
  },
  // Delete Account Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModal: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  deleteModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  deleteModalTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 18,
    textAlign: 'center',
  },
  deleteModalBody: {
    fontFamily: 'Geist_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  deleteModalInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: 'Geist_500Medium',
    fontSize: 14,
  },
  deleteModalError: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteModalErrorText: {
    fontFamily: 'Geist_500Medium',
    fontSize: 12,
    flex: 1,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  deleteModalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalBtnText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 13,
  },
});
