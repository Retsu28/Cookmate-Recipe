import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { mfaApi } from '../api/api';

export default function MFADisableModal({ visible, onClose, onDisabled }) {
  const { colors, isDark } = useAppTheme();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const inputRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Reset state every time modal opens and auto-focus input
  useEffect(() => {
    if (visible) {
      setCode('');
      setError(null);
      setLoading(false);
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      backdropAnim.setValue(0);
    }
  }, [visible, backdropAnim]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const handleConfirm = async () => {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Please enter a valid 6-digit code.');
      triggerShake();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await mfaApi.disable(trimmed);
      onDisabled();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Invalid code. Please try again.';
      setError(msg);
      triggerShake();
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={st.keyboardView}
      >
        {/* Backdrop */}
        <Animated.View style={[st.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={st.backdropPress} onPress={handleClose} />
        </Animated.View>

        {/* Sheet */}
        <View style={[st.sheet, { backgroundColor: isDark ? '#1c1917' : '#ffffff', borderColor: colors.border }]}>
          {/* Header */}
          <View style={st.sheetHeader}>
            <View style={[st.iconWrap, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2' }]}>
              <Ionicons name="shield-off-outline" size={24} color="#ef4444" />
            </View>
            <View style={st.headerText}>
              <Text style={[st.sheetTitle, { color: colors.text }]}>Disable MFA</Text>
              <Text style={[st.sheetSub, { color: colors.textMuted }]}>
                Enter your authenticator code to confirm.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={loading}
              style={[st.closeBtn, { backgroundColor: colors.surfaceAlt }]}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Warning banner */}
          <View style={[st.warningBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#fecaca' }]}>
            <Ionicons name="warning-outline" size={16} color="#ef4444" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={st.warningText}>
              Disabling MFA removes an important layer of security from your account.
            </Text>
          </View>

          {/* Code input */}
          <Text style={[st.label, { color: colors.textMuted }]}>AUTHENTICATOR CODE</Text>
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(v) => {
                if (/^\d{0,6}$/.test(v)) setCode(v);
                if (error) setError(null);
              }}
              placeholder="000000"
              placeholderTextColor={colors.textSubtle}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
              style={[
                st.codeInput,
                {
                  borderColor: error ? '#ef4444' : colors.border,
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                },
              ]}
              textAlign="center"
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
            />
          </Animated.View>

          {/* Error */}
          {error ? (
            <View style={[st.errorBox, { backgroundColor: isDark ? 'rgba(127,29,29,0.2)' : '#fef2f2', borderColor: isDark ? 'rgba(252,165,165,0.35)' : '#fecaca' }]}>
              <Ionicons name="alert-circle-outline" size={15} color="#b91c1c" style={{ marginRight: 6 }} />
              <Text style={st.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Buttons */}
          <View style={st.btnRow}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={loading}
              style={[st.cancelBtn, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
              activeOpacity={0.75}
            >
              <Text style={[st.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={loading || code.length < 6}
              style={[st.confirmBtn, { opacity: (loading || code.length < 6) ? 0.55 : 1 }]}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={st.confirmBtnText}>Disable MFA</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdropPress: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 24,
    paddingBottom: 36,
    gap: 14,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 2 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerText: { flex: 1 },
  sheetTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 18, letterSpacing: -0.3 },
  sheetSub: { fontFamily: 'Geist_400Regular', fontSize: 13, lineHeight: 18, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  warningText: { color: '#b91c1c', fontFamily: 'Geist_500Medium', fontSize: 12, flex: 1, lineHeight: 17 },
  label: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1.5 },
  codeInput: {
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    fontSize: 30,
    fontFamily: 'Geist_700Bold',
    letterSpacing: 14,
  },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 },
  errorText: { color: '#b91c1c', fontFamily: 'Geist_500Medium', fontSize: 13, flex: 1, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontFamily: 'Geist_700Bold', fontSize: 15 },
  confirmBtn: { flex: 1, height: 50, borderRadius: 14, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: '#fff', fontFamily: 'Geist_700Bold', fontSize: 15 },
});
