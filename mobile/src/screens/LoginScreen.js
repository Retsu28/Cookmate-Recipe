import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { useAuthAnimations } from '../hooks/useAuthAnimations';
import AuthVisualPanel from '../components/AuthVisualPanel';
import AuthThemeToggle from '../components/AuthThemeToggle';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { cardStyle, fieldStyle, shakeStyle, buttonStyle, onPressIn, onPressOut, triggerShake } =
    useAuthAnimations(3);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const validate = () => {
    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
    if (!password) return 'Please enter your password.';
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const result = await authService.login(email.trim(), password);
      await login(result.user);
      // AppNavigator will auto-swap from AuthStack to AppStack
      // once isAuthenticated flips to true — no manual navigation needed.
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
              onToggle={() => setPanelCollapsed((c) => !c)}
              heading="Cook smarter."
              subheading="Plan meals, discover recipes, and let AI be your sous-chef."
            />

            <Animated.View style={[styles.card, cardStyle, shakeStyle]}>
              <View style={styles.brand}>
                <View style={styles.logo}>
                  <Ionicons name="restaurant" size={26} color="#fff" />
                </View>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Sign in to keep cooking with CookMate.</Text>
              </View>

              <Animated.View style={[styles.field, fieldStyle(0)]}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textSubtle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                  style={styles.input}
                />
              </Animated.View>

              <Animated.View style={[styles.field, fieldStyle(1)]}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Your password"
                    placeholderTextColor={colors.textSubtle}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    editable={!loading}
                    style={[styles.input, { paddingRight: 44 }]}
                  />
                  <Pressable
                    onPress={() => setShowPassword((s) => !s)}
                    style={({ pressed }) => [
                      styles.eyeBtn,
                      { transform: [{ scale: pressed ? 0.85 : 1 }] },
                    ]}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textSubtle}
                    />
                  </Pressable>
                </View>
              </Animated.View>

              {error ? (
                <Animated.View style={[styles.errorBox, fieldStyle(2)]}>
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
                    <Text style={styles.primaryBtnText}>Sign in</Text>
                  )}
                </Pressable>
              </Animated.View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>New to CookMate?</Text>
                <Pressable
                  onPress={() => navigation.navigate('Signup')}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={styles.footerLink}> Create an account</Text>
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
    container: { flex: 1, backgroundColor: 'transparent' },
    safeArea: { flex: 1 },
    scrollView: { zIndex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    card: {
      backgroundColor: isDark ? 'rgba(28, 25, 23, 0.92)' : 'rgba(255, 255, 255, 0.94)',
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
      fontSize: 24,
      color: colors.text,
      letterSpacing: -0.3,
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
    passwordWrap: { position: 'relative', justifyContent: 'center' },
    eyeBtn: { position: 'absolute', right: 10, padding: 6 },
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
      marginTop: 20,
    },
    footerText: { color: colors.textMuted, fontFamily: 'Geist_400Regular', fontSize: 13 },
    footerLink: { color: colors.primaryDark, fontFamily: 'Geist_700Bold', fontSize: 13 },
  });
}
