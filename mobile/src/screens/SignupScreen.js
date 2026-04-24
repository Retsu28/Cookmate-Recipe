import React, { useState } from 'react';
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
import { authService } from '../services/authService';
import { colors } from '../theme';
import { useAuthAnimations } from '../hooks/useAuthAnimations';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ navigation }) {
  const { login } = useAuth();
  const { cardStyle, fieldStyle, shakeStyle, buttonStyle, onPressIn, onPressOut, triggerShake } =
    useAuthAnimations(5);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validate = () => {
    if (!name.trim()) return 'Please enter your full name.';
    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
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
      const result = await authService.signup(name.trim(), email.trim(), password);
      await login(result.token);
      // AppNavigator auto-swaps AuthStack → AppStack once authenticated.
    } catch (err) {
      setError(err?.message || 'Unable to create account. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
                label="FULL NAME"
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
                label="EMAIL"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
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
                  placeholder="At least 6 characters"
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
            </Animated.View>

            <AnimatedField index={3} fieldStyle={fieldStyle}>
              <FieldInput
                label="CONFIRM PASSWORD"
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
  );
}

function FieldInput({ label, ...inputProps }) {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primarySoft },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
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
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontFamily: 'Geist_500Medium',
    fontSize: 14,
    color: colors.text,
  },
  passwordWrap: { position: 'relative', justifyContent: 'center' },
  eyeBtn: { position: 'absolute', right: 10, padding: 6 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
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
