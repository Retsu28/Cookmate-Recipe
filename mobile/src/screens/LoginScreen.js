import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';

import {

  View,

  Text,

  TextInput,

  TouchableOpacity,

  ScrollView,

  KeyboardAvoidingView,

  Keyboard,

  Platform,

  Dimensions,

  ActivityIndicator,

  StyleSheet,

  Animated,

  Pressable,

  Image,

} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';

import { useAppTheme } from '../context/ThemeContext';

import { authService, MfaRequiredError } from '../services/authService';

import { useAuthAnimations } from '../hooks/useAuthAnimations';

import { useRateLimit, formatCountdown } from '../hooks/useRateLimit';

import AuthVisualPanel from '../components/AuthVisualPanel';

import AuthThemeToggle from '../components/AuthThemeToggle';

import GoogleSignInButton from '../components/GoogleSignInButton';

import AsyncStorage from '@react-native-async-storage/async-storage';





const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;



export default function LoginScreen({ navigation }) {

  const { login } = useAuth();

  const { colors, isDark } = useAppTheme();

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { cardStyle, fieldStyle, buttonStyle, onPressIn, onPressOut, triggerShake } =

    useAuthAnimations(3);



  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);

  const [panelCollapsed, setPanelCollapsed] = useState(false);



  const { rateLimit, isLocked, countdown, resetRateLimit, updateFromError } = useRateLimit();



  useEffect(() => {

    AsyncStorage.getItem('cookmate.auth.panelHidden').then((val) => {

      if (val === 'true') setPanelCollapsed(true);

    }).catch(() => {});

  }, []);



  const scrollRef = useRef(null);



  useEffect(() => {

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, () => setPanelCollapsed(true));

    const hide = Keyboard.addListener(hideEvent, () => {});

    return () => { show.remove(); hide.remove(); };

  }, []);



  const handleInputFocus = useCallback((event) => {

    if (!scrollRef.current) return;

    scrollRef.current.scrollToEnd({ animated: true });

  }, []);



  const handleTogglePanel = () => {

    setPanelCollapsed((c) => {

      const next = !c;

      AsyncStorage.setItem('cookmate.auth.panelHidden', String(next)).catch(() => {});

      return next;

    });

  };



  const validate = () => {

    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';

    if (!password) return 'Please enter your password.';

    return null;

  };



  const handleSubmit = async () => {

    if (isLocked) return;

    setError(null);

    resetRateLimit();

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

      if (err instanceof MfaRequiredError) {

        // MFA is enabled — redirect to verification screen

        navigation.navigate('MFAVerification', { mfaUserId: err.mfaUserId });

        return;

      }

      // Check for rate limit info in error

      updateFromError(err);

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

          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}

          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}

        >

          <ScrollView

            ref={scrollRef}

            style={styles.scrollView}

            contentContainerStyle={styles.scroll}

            keyboardShouldPersistTaps="handled"

            keyboardDismissMode="interactive"

            showsVerticalScrollIndicator={false}

          >

            <AuthVisualPanel

              collapsed={panelCollapsed}

              onToggle={handleTogglePanel}

              heading="Cook smarter."

              subheading="Plan meals, discover recipes, and let AI be your sous-chef."

            />



            <Animated.View style={[styles.card, cardStyle]}>

              <View style={styles.brand}>

                <View style={styles.logoContainer}>
                  <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                </View>

                <Text style={styles.title}>Welcome back</Text>

                <Text style={styles.subtitle}>Sign in to keep cooking with CookMate.</Text>

              </View>



              <Animated.View style={[styles.field, fieldStyle(0)]}>

                <Text style={styles.label}>EMAIL</Text>

                <TextInput

                  value={email}

                  onChangeText={(text) => {

                    setEmail(text);

                    if (error) setError(null);

                    if (rateLimit) resetRateLimit();

                  }}

                  placeholder="you@example.com"

                  placeholderTextColor={colors.textSubtle}

                  autoCapitalize="none"

                  autoCorrect={false}

                  keyboardType="email-address"

                  textContentType="emailAddress"

                  editable={!loading && !isLocked}

                  onFocus={handleInputFocus}

                  style={[styles.input, (loading || isLocked) && { opacity: 0.6 }]}

                />

              </Animated.View>



              <Animated.View style={[styles.field, fieldStyle(1)]}>

                <Text style={styles.label}>PASSWORD</Text>

                <View style={styles.passwordWrap}>

                  <TextInput

                    value={password}

                    onChangeText={(text) => {

                      setPassword(text);

                      if (error) setError(null);

                    }}

                    placeholder="Your password"

                    placeholderTextColor={colors.textSubtle}

                    secureTextEntry={!showPassword}

                    autoCapitalize="none"

                    autoCorrect={false}

                    textContentType="password"

                    editable={!loading && !isLocked}

                    onFocus={handleInputFocus}

                    style={[styles.input, { paddingRight: 44 }, (loading || isLocked) && { opacity: 0.6 }]}

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



              <Animated.View style={[styles.forgotRow, fieldStyle(1)]}>

                <Pressable

                  onPress={() => navigation.navigate('ForgotPassword')}

                  hitSlop={8}

                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}

                >

                  <Text style={styles.forgotLink}>Forgot password?</Text>

                </Pressable>

              </Animated.View>



              {/* Rate Limit Lockout */}

              {rateLimit?.locked && (

                <Animated.View style={[styles.lockoutBox, fieldStyle(2)]}>

                  <View style={styles.rlRow}>

                    <View style={styles.rlIconCircleRed}>

                      <Ionicons name="lock-closed" size={16} color="#dc2626" />

                    </View>

                    <View style={{ flex: 1 }}>

                      <Text style={styles.lockoutTitle}>Account temporarily locked</Text>

                      <Text style={styles.lockoutSubtext}>Too many failed attempts. Please wait before trying again.</Text>

                      <View style={styles.countdownRow}>

                        <Ionicons name="time-outline" size={14} color="#dc2626" style={{ marginRight: 5 }} />

                        <Text style={styles.countdownText}>Retry in: {formatCountdown(countdown)}</Text>

                      </View>

                    </View>

                  </View>

                </Animated.View>

              )}



              {/* Rate Limit Warning */}

              {rateLimit && !rateLimit.locked && rateLimit.warning && (

                <Animated.View style={[styles.warningBox, fieldStyle(2)]}>

                  <View style={styles.rlRow}>

                    <View style={styles.rlIconCircleAmber}>

                      <Ionicons name="warning-outline" size={16} color="#d97706" />

                    </View>

                    <View style={{ flex: 1 }}>

                      <Text style={styles.warningTitle}>

                        Warning: {rateLimit.attemptsRemaining} attempt{rateLimit.attemptsRemaining !== 1 ? 's' : ''} remaining

                      </Text>

                      <Text style={styles.warningSubtext}>

                        Your account will be locked after {rateLimit.maxAttempts} failed attempts.

                      </Text>

                      <View style={styles.attemptDots}>

                        {Array.from({ length: rateLimit.maxAttempts }).map((_, i) => (

                          <View

                            key={i}

                            style={[styles.attemptDot, {

                              backgroundColor:

                                i < rateLimit.currentAttempts ? '#ef4444'

                                  : i < rateLimit.currentAttempts + rateLimit.attemptsRemaining ? '#f59e0b'

                                  : '#e5e7eb',

                            }]}

                          />

                        ))}

                      </View>

                    </View>

                  </View>

                </Animated.View>

              )}



              {/* Normal subtle state */}

              {rateLimit && !rateLimit.locked && !rateLimit.warning &&

                rateLimit.attemptsRemaining > 0 && rateLimit.attemptsRemaining < rateLimit.maxAttempts && (

                <Animated.View style={[styles.normalRlRow, fieldStyle(2)]}>

                  <Text style={styles.normalRlText}>

                    Failed attempts: {rateLimit.currentAttempts} / {rateLimit.maxAttempts}

                  </Text>

                  <View style={{ flexDirection: 'row', gap: 3 }}>

                    {Array.from({ length: Math.min(rateLimit.currentAttempts, 5) }).map((_, i) => (

                      <View key={i} style={styles.normalRlDot} />

                    ))}

                  </View>

                </Animated.View>

              )}



              {error && !rateLimit?.locked ? (

                <Animated.View style={[styles.errorBox, fieldStyle(2)]}>

                  <Text style={styles.errorText}>{error}</Text>

                </Animated.View>

              ) : null}



              <Animated.View style={buttonStyle}>

                <Pressable

                  onPress={handleSubmit}

                  onPressIn={onPressIn}

                  onPressOut={onPressOut}

                  disabled={loading || isLocked}

                  style={[styles.primaryBtn, (loading || isLocked) && { opacity: 0.6 }]}

                >

                  {loading ? (

                    <ActivityIndicator color="#fff" />

                  ) : isLocked ? (

                    <View style={styles.lockedBtnContent}>

                      <Ionicons name="lock-closed" size={18} color="#fff" style={{ marginRight: 6 }} />

                      <Text style={styles.primaryBtnText}>Locked</Text>

                    </View>

                  ) : (

                    <Text style={styles.primaryBtnText}>Sign in</Text>

                  )}

                </Pressable>

              </Animated.View>



              <View style={styles.divider} aria-hidden>

                <View style={styles.dividerLine} />

                <Text style={styles.dividerText}>OR</Text>

                <View style={styles.dividerLine} />

              </View>



              <GoogleSignInButton

                label="Sign in with Google"

                onError={setError}

                onMfaRequired={(userId) => navigation.navigate('MFAVerification', { mfaUserId: userId })}

              />



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

    logoContainer: {

      width: 64,

      height: 64,

      borderRadius: 18,

      backgroundColor: '#f97316',

      alignItems: 'center',

      justifyContent: 'center',

      marginBottom: 14,

      shadowColor: '#c2410c',

      shadowOffset: { width: 0, height: 4 },

      shadowOpacity: 0.3,

      shadowRadius: 8,

      elevation: 6,

    },

    logo: {

      width: 44,

      height: 44,

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

    forgotRow: {

      flexDirection: 'row',

      justifyContent: 'flex-end',

      marginTop: -4,

      marginBottom: 12,

    },

    forgotLink: {

      fontFamily: 'Geist_700Bold',

      fontSize: 12,

      color: colors.primaryDark,

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

    // Shared rate limit layout

    rlRow: {

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 12,

    },

    rlIconCircleRed: {

      width: 32,

      height: 32,

      borderRadius: 16,

      backgroundColor: isDark ? 'rgba(220,38,38,0.2)' : '#fee2e2',

      alignItems: 'center',

      justifyContent: 'center',

      flexShrink: 0,

    },

    rlIconCircleAmber: {

      width: 32,

      height: 32,

      borderRadius: 16,

      backgroundColor: isDark ? 'rgba(217,119,6,0.2)' : '#fef3c7',

      alignItems: 'center',

      justifyContent: 'center',

      flexShrink: 0,

    },

    // Warning box

    warningBox: {

      backgroundColor: isDark ? 'rgba(146, 64, 14, 0.15)' : '#fffbeb',

      borderColor: isDark ? 'rgba(251, 191, 36, 0.4)' : '#fde68a',

      borderWidth: 1,

      borderRadius: 14,

      paddingVertical: 12,

      paddingHorizontal: 14,

      marginBottom: 12,

    },

    warningTitle: {

      color: '#92400e',

      fontFamily: 'Geist_600SemiBold',

      fontSize: 13,

    },

    warningSubtext: {

      color: '#b45309',

      fontFamily: 'Geist_400Regular',

      fontSize: 11,

      marginTop: 2,

      lineHeight: 15,

    },

    attemptDots: {

      flexDirection: 'row',

      gap: 4,

      marginTop: 8,

    },

    attemptDot: {

      width: 16,

      height: 6,

      borderRadius: 3,

    },

    // Lockout box

    lockoutBox: {

      backgroundColor: isDark ? 'rgba(127, 29, 29, 0.2)' : '#fef2f2',

      borderColor: isDark ? 'rgba(252, 165, 165, 0.4)' : '#fecaca',

      borderWidth: 1,

      borderRadius: 14,

      paddingVertical: 12,

      paddingHorizontal: 14,

      marginBottom: 12,

    },

    lockoutTitle: {

      color: '#dc2626',

      fontFamily: 'Geist_600SemiBold',

      fontSize: 13,

    },

    lockoutSubtext: {

      color: '#b91c1c',

      fontFamily: 'Geist_400Regular',

      fontSize: 11,

      marginTop: 2,

      lineHeight: 15,

    },

    countdownRow: {

      flexDirection: 'row',

      alignItems: 'center',

      marginTop: 10,

    },

    countdownText: {

      color: '#dc2626',

      fontFamily: 'Geist_700Bold',

      fontSize: 13,

    },

    // Normal subtle state

    normalRlRow: {

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',

      marginBottom: 10,

    },

    normalRlText: {

      color: colors.textMuted,

      fontFamily: 'Geist_400Regular',

      fontSize: 11,

    },

    normalRlDot: {

      width: 6,

      height: 6,

      borderRadius: 3,

      backgroundColor: '#f97316',

    },

    lockedBtnContent: {

      flexDirection: 'row',

      alignItems: 'center',

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

    divider: {

      flexDirection: 'row',

      alignItems: 'center',

      gap: 10,

      marginTop: 18,

      marginBottom: 12,

    },

    dividerLine: {

      flex: 1,

      height: 1,

      backgroundColor: colors.border,

    },

    dividerText: {

      fontFamily: 'Geist_700Bold',

      fontSize: 10,

      color: colors.textMuted,

      letterSpacing: 1.5,

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

