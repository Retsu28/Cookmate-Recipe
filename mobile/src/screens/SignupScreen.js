import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import AuthVideoBackground from '../components/AuthVideoBackground';

const EMAIL_RE = /^[^\s@]+@gmail\.com$/i;
const MIN_PASSWORD_LEN = 8;

function normalizeFullName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function getPasswordRequirements(pw) {
  return [
    { label: 'At least 8 characters', met: pw.length >= MIN_PASSWORD_LEN },
    { label: 'At least 1 number', met: /\d/.test(pw) },
    { label: 'At least 1 lowercase letter', met: /[a-z]/.test(pw) },
    { label: 'At least 1 uppercase letter', met: /[A-Z]/.test(pw) },
    { label: 'At least 1 special character', met: /[^A-Za-z0-9]/.test(pw) },
  ];
}

function scorePassword(requirements) {
  const score = requirements.filter((item) => item.met).length;
  if (score === 0) return { score, color: '#e7e5e4' };
  if (score <= 1) return { score, color: '#ef4444' };
  if (score <= 2) return { score, color: '#fb923c' };
  if (score <= 3) return { score, color: '#eab308' };
  if (score <= 4) return { score, color: '#84cc16' };
  return { score, color: '#22c55e' };
}

export default function SignupScreen({ navigation }) {
  const { login } = useAuth();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { cardStyle, fieldStyle, shakeStyle, buttonStyle, onPressIn, onPressOut, triggerShake } =
    useAuthAnimations(5);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const strengthBar = useRef(new Animated.Value(0)).current;
  const passwordRequirements = useMemo(() => getPasswordRequirements(password), [password]);
  const strength = useMemo(() => scorePassword(passwordRequirements), [passwordRequirements]);

  useEffect(() => {
    Animated.timing(strengthBar, {
      toValue: strength.score / 5,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [strength.score, strengthBar]);

  const validate = () => {
    if (!normalizeFullName(name)) return 'Please enter your full name.';
    if (!EMAIL_RE.test(normalizeEmail(email))) return 'Email must be a @gmail.com address.';
    if (password.length < MIN_PASSWORD_LEN) return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    if (password !== confirm) return 'Passwords do not match.';
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
      const result = await authService.signup(normalizeFullName(name), normalizeEmail(email), password);
      await login(result.user);
      // AppNavigator auto-swaps AuthStack → AppStack once authenticated.
    } catch (err) {
      setError(err?.message || 'Unable to create account. Please try again.');
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
              onToggle={() => setPanelCollapsed((c) => !c)}
              heading="Join CookMate."
              subheading="Create an account to save recipes, plan meals, and cook with AI."
            />

            <Animated.View style={[styles.card, cardStyle, shakeStyle]}>
              <View style={styles.brand}>
                <View style={styles.logo}>
                  <Ionicons name="restaurant" size={26} color="#fff" />
                </View>
                <Text style={styles.title}>Create your CookMate</Text>
                <Text style={styles.subtitle}>Save recipes, plan meals, and cook with AI.</Text>
              </View>

              <AnimatedField index={0} fieldStyle={fieldStyle}>
                <FieldInput
                  colors={colors}
                  label="FULL NAME"
                  styles={styles}
                  value={name}
                  onChangeText={setName}
                  placeholder="Jane Doe"
                  autoCapitalize="words"
                  textContentType="name"
                  editable={!loading}
                />
              </AnimatedField>

              <AnimatedField index={1} fieldStyle={fieldStyle}>
                <FieldInput
                  colors={colors}
                  label="EMAIL"
                  styles={styles}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@gmail.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                />
              </AnimatedField>

              <Animated.View style={[styles.field, fieldStyle(2)]}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.textSubtle}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
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
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthTrack}>
                    <Animated.View
                      style={[
                        styles.strengthFill,
                        {
                          backgroundColor: strength.color,
                          width: strengthBar.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.requirementsHeader}>
                    <Text style={styles.requirementsTitle}>Must contain:</Text>
                    <Text style={styles.requirementsStatus}>
                      {password.length === 0 ? 'Enter a password' : `${strength.score}/5 complete`}
                    </Text>
                  </View>
                  <View style={styles.requirementsList}>
                    {passwordRequirements.map((item) => (
                      <Animated.View
                        key={item.label}
                        style={[
                          styles.requirementRow,
                          {
                            opacity: item.met ? 1 : 0.75,
                            transform: [{ translateX: item.met ? 2 : 0 }],
                          },
                        ]}
                      >
                        <Ionicons
                          name={item.met ? 'checkmark-outline' : 'close-outline'}
                          size={15}
                          color={item.met ? '#16a34a' : colors.textSubtle}
                        />
                        <Text style={[styles.requirementText, item.met && styles.requirementTextMet]}>
                          {item.label}
                        </Text>
                      </Animated.View>
                    ))}
                  </View>
                </View>
              </Animated.View>

              <AnimatedField index={3} fieldStyle={fieldStyle}>
                <FieldInput
                  colors={colors}
                  label="CONFIRM PASSWORD"
                  styles={styles}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Re-enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  editable={!loading}
                />
              </AnimatedField>

              {error ? (
                <Animated.View style={[styles.errorBox, fieldStyle(4)]}>
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
                    <Text style={styles.primaryBtnText}>Create account</Text>
                  )}
                </Pressable>
              </Animated.View>

              <Text style={styles.terms}>
                By continuing you agree to CookMate&apos;s Terms of Service and Privacy Policy.
              </Text>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <Pressable
                  onPress={() => navigation.navigate('Login')}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={styles.footerLink}> Sign in</Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function FieldInput({ label, colors, styles, ...inputProps }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        autoCorrect={false}
        style={styles.input}
        {...inputProps}
      />
    </View>
  );
}

// Thin wrapper so the staggered entry animation wraps a FieldInput
// without breaking the existing style prop contract on the inner View.
function AnimatedField({ index, fieldStyle, children }) {
  return <Animated.View style={fieldStyle(index)}>{children}</Animated.View>;
}

function createStyles(colors, isDark) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.background : '#1c1917' },
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
    passwordWrap: { position: 'relative', justifyContent: 'center' },
    eyeBtn: { position: 'absolute', right: 10, padding: 6 },
    strengthWrap: { paddingTop: 8 },
    strengthTrack: {
      height: 6,
      width: '100%',
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(68, 64, 60, 0.7)' : '#f5f5f4',
      overflow: 'hidden',
    },
    strengthFill: {
      height: '100%',
      borderRadius: 999,
    },
    requirementsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 12,
    },
    requirementsTitle: {
      color: colors.textMuted,
      fontFamily: 'Geist_800ExtraBold',
      fontSize: 12,
    },
    requirementsStatus: {
      color: colors.textMuted,
      fontFamily: 'Geist_800ExtraBold',
      fontSize: 12,
      textAlign: 'right',
      flexShrink: 1,
    },
    requirementsList: {
      marginTop: 8,
      gap: 6,
    },
    requirementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    requirementText: {
      color: colors.textSubtle,
      fontFamily: 'Geist_600SemiBold',
      fontSize: 12,
    },
    requirementTextMet: {
      color: '#16a34a',
      fontFamily: 'Geist_700Bold',
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
    terms: {
      fontFamily: 'Geist_400Regular',
      fontSize: 11,
      color: colors.textSubtle,
      textAlign: 'center',
      marginTop: 12,
      paddingHorizontal: 8,
      lineHeight: 16,
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
