import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { mfaApi } from '../api/api';
import { tokenStorage } from '../lib/tokenStorage';

const MAX_ATTEMPTS = 5;

export default function MFAVerificationScreen({ navigation, route }) {
  const { mfaUserId } = route.params ?? {};
  const { login } = useAuth();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Please enter a valid 6-digit code.');
      triggerShake();
      return;
    }

    if (!mfaUserId) {
      setError('Invalid session. Please go back and sign in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await mfaApi.verify(mfaUserId, trimmed);
      const { token, user } = response.data;

      await tokenStorage.setItem('userToken', token);
      await tokenStorage.setItem('cookmate.auth.user', JSON.stringify(user));

      await login(user);
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      const msg = err?.response?.data?.error || err?.message || 'Verification failed. Please try again.';
      setError(msg);
      triggerShake();

      if (newAttempts >= MAX_ATTEMPTS) {
        setError('Too many failed attempts. Please go back and sign in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.navigate('Login');
  };

  const isLocked = attempts >= MAX_ATTEMPTS;

  const mountAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(mountAnim, {
        toValue: 1,
        duration: 360,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start();
    }, 80);
    return () => clearTimeout(t);
  }, []);

  const cardEntranceStyle = {
    opacity: mountAnim,
    transform: [
      { translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
      { scale: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
    ],
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.85)" />
              <Text style={[styles.backText, { color: 'rgba(255,255,255,0.75)' }]}>Back to Sign In</Text>
            </TouchableOpacity>

            <Animated.View style={[styles.card, cardEntranceStyle]}>
              <View style={styles.iconWrap}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
                </View>
              </View>

              <Text style={[styles.title, { color: colors.text }]}>Two-Factor Authentication</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Enter the 6-digit code from your authenticator app to continue.
              </Text>

              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>VERIFICATION CODE</Text>
                <TextInput
                  value={code}
                  onChangeText={(v) => {
                    if (/^\d{0,6}$/.test(v)) setCode(v);
                    if (error) setError(null);
                  }}
                  placeholder="000000"
                  placeholderTextColor={colors.textSubtle}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading && !isLocked}
                  style={[
                    styles.codeInput,
                    {
                      borderColor: error ? '#ef4444' : colors.border,
                      backgroundColor: colors.surfaceAlt,
                      color: colors.text,
                    },
                  ]}
                  textAlign="center"
                />
              </Animated.View>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(127,29,29,0.2)' : '#fef2f2', borderColor: isDark ? 'rgba(252,165,165,0.35)' : '#fecaca' }]}>
                  <Ionicons name="alert-circle-outline" size={16} color="#b91c1c" style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Text style={[styles.hint, { color: colors.textSubtle }]}>
                Codes refresh every 30 seconds. Open Google Authenticator, Authy, or Microsoft Authenticator.
              </Text>

              <Pressable
                onPress={handleVerify}
                disabled={loading || isLocked || code.length < 6}
                style={[styles.verifyBtn, { backgroundColor: colors.primary, opacity: (loading || isLocked || code.length < 6) ? 0.6 : 1 }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyBtnText}>Verify Code</Text>
                )}
              </Pressable>

              <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(colors, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 24,
      alignSelf: 'flex-start',
    },
    backText: {
      fontFamily: 'Geist_600SemiBold',
      fontSize: 14,
    },
    card: {
      backgroundColor: isDark ? 'rgba(28,25,23,0.94)' : 'rgba(255,255,255,0.97)',
      borderRadius: 24,
      padding: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.18 : 0.08,
      shadowRadius: 20,
      elevation: isDark ? 0 : 4,
    },
    iconWrap: {
      alignItems: 'center',
      marginBottom: 20,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: 'Geist_800ExtraBold',
      fontSize: 22,
      textAlign: 'center',
      letterSpacing: -0.3,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Geist_400Regular',
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    label: {
      fontFamily: 'Geist_700Bold',
      fontSize: 10,
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    codeInput: {
      height: 64,
      borderRadius: 16,
      borderWidth: 1.5,
      fontSize: 28,
      fontFamily: 'Geist_700Bold',
      letterSpacing: 12,
      marginBottom: 16,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    errorText: {
      color: '#b91c1c',
      fontFamily: 'Geist_500Medium',
      fontSize: 13,
      flex: 1,
      lineHeight: 18,
    },
    hint: {
      fontFamily: 'Geist_400Regular',
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 17,
      marginBottom: 24,
    },
    verifyBtn: {
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    verifyBtnText: {
      color: '#fff',
      fontFamily: 'Geist_700Bold',
      fontSize: 16,
    },
    cancelBtn: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    cancelText: {
      fontFamily: 'Geist_600SemiBold',
      fontSize: 14,
    },
  });
}
