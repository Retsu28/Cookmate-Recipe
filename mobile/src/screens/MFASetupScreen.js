import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Animated,
  Pressable,
  Image,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { mfaApi } from '../api/api';

const STEPS = ['setup', 'verify', 'done'];

export default function MFASetupScreen({ navigation, route }) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [step, setStep] = useState('setup'); // 'setup' | 'verify' | 'done'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [setupData, setSetupData] = useState(null); // { secret, qrCode, otpauthUrl }
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    loadSetup();
  }, []);

  const loadSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mfaApi.setup();
      setSetupData(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to generate QR code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      Clipboard.setString(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirm = async () => {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Please enter a valid 6-digit code.');
      triggerShake();
      return;
    }
    if (!setupData?.secret) {
      setError('Setup data missing. Please go back and try again.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await mfaApi.enable(setupData.secret, trimmed);
      setStep('done');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Invalid code. Please try again.';
      setError(msg);
      triggerShake();
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    if (route.params?.onEnabled) {
      route.params.onEnabled();
    }
    navigation.goBack();
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Setup?',
      'MFA will not be enabled if you cancel now.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Cancel Setup', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Generating secure key…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={step === 'done' ? handleDone : handleCancel} style={styles.backBtn} activeOpacity={0.7}>
              {step === 'done' ? (
                <Text style={[styles.doneLink, { color: colors.primary }]}>Done</Text>
              ) : (
                <>
                  <Ionicons name="close" size={22} color={colors.text} />
                  <Text style={[styles.backText, { color: colors.textMuted }]}>Cancel</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.stepIndicator}>
              {['setup', 'verify', 'done'].map((s, i) => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: STEPS.indexOf(step) >= i ? colors.primary : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Step: Setup — show QR */}
          {step === 'setup' && setupData && (
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="qr-code-outline" size={32} color={colors.primary} />
                </View>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Set Up Authenticator</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Scan this QR code with Google Authenticator, Authy, or Microsoft Authenticator.
              </Text>

              {/* QR Code Image */}
              <View style={[styles.qrContainer, { borderColor: colors.border }]}>
                <Image
                  source={{ uri: setupData.qrCode }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>

              {/* Manual entry fallback */}
              <Text style={[styles.orText, { color: colors.textSubtle }]}>— or enter manually —</Text>
              <View style={[styles.secretBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[styles.secretText, { color: colors.text }]} selectable>
                  {setupData.secret}
                </Text>
                <TouchableOpacity onPress={handleCopySecret} style={styles.copyBtn} activeOpacity={0.7}>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
              {copied && (
                <Text style={[styles.copiedText, { color: colors.primary }]}>Copied to clipboard!</Text>
              )}

              <Pressable
                onPress={() => { setCode(''); setError(null); setStep('verify'); }}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryBtnText}>I've Scanned the QR Code →</Text>
              </Pressable>
            </View>
          )}

          {/* Step: Verify — confirm 6-digit code */}
          {step === 'verify' && (
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="key-outline" size={32} color={colors.primary} />
                </View>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Confirm Your Code</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Enter the 6-digit code shown in your authenticator app to activate MFA.
              </Text>

              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>AUTHENTICATOR CODE</Text>
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
                  autoFocus
                  editable={!saving}
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

              <Pressable
                onPress={handleConfirm}
                disabled={saving || code.length < 6}
                style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: (saving || code.length < 6) ? 0.6 : 1 }]}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Activate MFA</Text>}
              </Pressable>

              <TouchableOpacity onPress={() => { setCode(''); setError(null); setStep('setup'); }} style={styles.backLinkBtn} activeOpacity={0.7}>
                <Text style={[styles.backLinkText, { color: colors.textMuted }]}>← Back to QR Code</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
                </View>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>MFA Enabled!</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Your account is now protected with Two-Factor Authentication. You'll need your authenticator app every time you sign in.
              </Text>

              <View style={[styles.infoBox, { backgroundColor: colors.primarySoft, borderColor: colors.primary + '40' }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={[styles.infoText, { color: colors.primaryDark }]}>
                  Keep your authenticator app installed. If you lose access, you can disable MFA from Privacy & Security settings.
                </Text>
              </View>

              <Pressable
                onPress={handleDone}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

          {/* Error on load */}
          {!loading && !setupData && error && step === 'setup' && (
            <View style={styles.card}>
              <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(127,29,29,0.2)' : '#fef2f2', borderColor: isDark ? 'rgba(252,165,165,0.35)' : '#fecaca' }]}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
              <Pressable onPress={loadSetup} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.primaryBtnText}>Retry</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors, isDark) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0c0a09' : '#fafaf9' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    scroll: { flexGrow: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backText: { fontFamily: 'Geist_600SemiBold', fontSize: 14 },
    doneLink: { fontFamily: 'Geist_700Bold', fontSize: 16 },
    stepIndicator: { flexDirection: 'row', gap: 6 },
    stepDot: { width: 8, height: 8, borderRadius: 4 },
    card: {
      backgroundColor: isDark ? 'rgba(28,25,23,0.94)' : '#ffffff',
      borderRadius: 24,
      padding: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.15 : 0.07,
      shadowRadius: 16,
      elevation: isDark ? 0 : 3,
    },
    iconWrap: { alignItems: 'center', marginBottom: 20 },
    iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: 'Geist_800ExtraBold', fontSize: 22, textAlign: 'center', letterSpacing: -0.3, marginBottom: 8 },
    subtitle: { fontFamily: 'Geist_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    qrContainer: { alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20 },
    qrImage: { width: 200, height: 200 },
    orText: { textAlign: 'center', fontFamily: 'Geist_400Regular', fontSize: 12, marginBottom: 12 },
    secretBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4 },
    secretText: { flex: 1, fontFamily: 'Geist_500Medium', fontSize: 13, letterSpacing: 1, lineHeight: 18 },
    copyBtn: { padding: 4, marginLeft: 8 },
    copiedText: { fontFamily: 'Geist_600SemiBold', fontSize: 12, textAlign: 'center', marginBottom: 16 },
    label: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1.5, marginBottom: 8 },
    codeInput: { height: 64, borderRadius: 16, borderWidth: 1.5, fontSize: 28, fontFamily: 'Geist_700Bold', letterSpacing: 12, marginBottom: 16 },
    errorBox: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12 },
    errorText: { color: '#b91c1c', fontFamily: 'Geist_500Medium', fontSize: 13, flex: 1, lineHeight: 18 },
    primaryBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    primaryBtnText: { color: '#fff', fontFamily: 'Geist_700Bold', fontSize: 16 },
    backLinkBtn: { alignItems: 'center', paddingVertical: 12 },
    backLinkText: { fontFamily: 'Geist_600SemiBold', fontSize: 14 },
    infoBox: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20 },
    infoText: { fontFamily: 'Geist_500Medium', fontSize: 13, flex: 1, lineHeight: 19 },
    loadingText: { fontFamily: 'Geist_400Regular', fontSize: 14, marginTop: 12 },
  });
}
