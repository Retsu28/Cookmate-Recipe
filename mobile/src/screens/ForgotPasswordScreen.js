import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { useAuthAnimations } from '../hooks/useAuthAnimations';
import AuthVisualPanel from '../components/AuthVisualPanel';
import AuthThemeToggle from '../components/AuthThemeToggle';
import AuthVideoBackground from '../components/AuthVideoBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { cardStyle, fieldStyle, buttonStyle, onPressIn, onPressOut, triggerShake } =
    useAuthAnimations(2, 0);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('cookmate.auth.panelHidden').then((val) => {
      if (val === 'true') setPanelCollapsed(true);
    }).catch(() => {});
  }, []);

  const handleTogglePanel = () => {
    setPanelCollapsed((c) => {
      const next = !c;
      AsyncStorage.setItem('cookmate.auth.panelHidden', String(next)).catch(() => {});
      return next;
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      await authService.sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.message || 'Could not send reset email. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AuthVideoBackground />
      <SafeAreaView style={styles.safeArea}>
        <AuthThemeToggle />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthVisualPanel
              collapsed={panelCollapsed}
              onToggle={handleTogglePanel}
              heading="Reset your password."
              subheading="We'll email you a secure link to set a new password."
            />

            <Animated.View style={[styles.card, cardStyle]}>
              <View style={styles.brand}>
                <View style={styles.logo}>
                  <Ionicons name="lock-closed" size={26} color="#fff" />
                </View>
                <Text style={styles.title}>Forgot your password?</Text>
                <Text style={styles.subtitle}>
                  Enter the email tied to your CookMate account.
                </Text>
              </View>

              {sent ? (
                <Animated.View style={[styles.successBox, fieldStyle(0)]}>
                  <Ionicons name="mail-outline" size={20} color="#16a34a" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.successTitle}>Check your inbox.</Text>
                    <Text style={styles.successText}>
                      If {email} is registered, you'll receive a password reset link shortly. The
                      link expires in about an hour.
                    </Text>
                  </View>
                </Animated.View>
              ) : (
                <>
                  <Animated.View style={[styles.field, fieldStyle(0)]}>
                    <Text style={styles.label}>EMAIL</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@gmail.com"
                      placeholderTextColor={colors.textSubtle}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      editable={!loading}
                      style={styles.input}
                    />
                  </Animated.View>

                  {error ? (
                    <Animated.View style={[styles.errorBox, fieldStyle(1)]}>
                      <Text style={styles.errorText}>{error}</Text>
                    </Animated.View>
                  ) : null}

                  <Animated.View style={buttonStyle}>
                    <Pressable
                      onPress={handleSubmit}
                      onPressIn={onPressIn}
                      onPressOut={onPressOut}
                      disabled={loading}
                      style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Send reset link</Text>
                      )}
                    </Pressable>
                  </Animated.View>
                </>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Remembered it?</Text>
                <Pressable
                  onPress={() => navigation.navigate('Login')}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={styles.footerLink}> Back to sign in</Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors, isDark) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent', overflow: 'hidden' },
    safeArea: { flex: 1, zIndex: 1 },
    scrollView: { zIndex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    card: {
      backgroundColor: isDark ? 'rgba(28, 25, 23, 0.84)' : 'rgba(255, 255, 255, 0.86)',
      borderRadius: 24,
      padding: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.18 : 0.08,
      shadowRadius: 20,
      elevation: isDark ? 0 : 4,
    },
    brand: { alignItems: 'center', marginBottom: 24 },
    logo: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    title: {
      fontFamily: 'Geist_800ExtraBold',
      fontSize: 22,
      color: colors.text,
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: 'Geist_400Regular',
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },
    field: { marginBottom: 14 },
    label: {
      fontFamily: 'Geist_700Bold',
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 6,
    },
    input: {
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 14,
      fontFamily: 'Geist_500Medium',
      fontSize: 14,
      color: colors.text,
    },
    errorBox: {
      backgroundColor: isDark ? 'rgba(127, 29, 29, 0.2)' : '#fef2f2',
      borderColor: isDark ? 'rgba(252, 165, 165, 0.35)' : '#fecaca',
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    errorText: { color: '#b91c1c', fontFamily: 'Geist_500Medium', fontSize: 13 },
    successBox: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: isDark ? 'rgba(20, 83, 45, 0.25)' : '#f0fdf4',
      borderColor: isDark ? 'rgba(134, 239, 172, 0.35)' : '#bbf7d0',
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    successTitle: {
      color: isDark ? '#bbf7d0' : '#166534',
      fontFamily: 'Geist_700Bold',
      fontSize: 13,
      marginBottom: 2,
    },
    successText: {
      color: isDark ? '#bbf7d0' : '#166534',
      fontFamily: 'Geist_500Medium',
      fontSize: 12,
      lineHeight: 17,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    primaryBtnText: {
      color: '#fff',
      fontFamily: 'Geist_700Bold',
      fontSize: 16,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 16,
    },
    footerText: { color: colors.textMuted, fontFamily: 'Geist_400Regular', fontSize: 13 },
    footerLink: { color: colors.primaryDark, fontFamily: 'Geist_700Bold', fontSize: 13 },
  });
}
