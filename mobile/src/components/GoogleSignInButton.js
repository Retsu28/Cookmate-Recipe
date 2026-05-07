/**
 * Google Sign-In button for the mobile Expo app.
 *
 * Uses the native Google Sign-In SDK on Android/iOS and falls back to
 * `expo-auth-session/providers/google` elsewhere. The ID token is then
 * exchanged for a CookMate JWT via POST /api/auth/google.
 *
 * Client IDs are read from app.json -> expo.extra:
 *   googleWebClientId     - Web OAuth client ID, used by the backend verifier
 *   googleAndroidClientId - Android OAuth client ID, configured in Google Cloud
 *   googleIosClientId     - iOS OAuth client ID, configured in Google Cloud
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useAppTheme } from '../context/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

function getConfig() {
  const extra =
    Constants?.expoConfig?.extra || Constants?.manifest2?.extra?.expoClient?.extra || {};
  return {
    webClientId: extra.googleWebClientId || '',
    androidClientId: extra.googleAndroidClientId || '',
    iosClientId: extra.googleIosClientId || '',
  };
}

function getGoogleErrorMessage(err) {
  if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
    return '';
  }
  if (err?.code === statusCodes.IN_PROGRESS) {
    return 'Google sign-in is already in progress.';
  }
  if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play Services is not available or needs to be updated.';
  }
  return err?.message || 'Google sign-in failed. Please try again.';
}

export default function GoogleSignInButton({ label = 'Continue with Google', onError }) {
  const { login } = useAuth();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { webClientId, androidClientId, iosClientId } = getConfig();
  const [, , promptAsync] = Google.useIdTokenAuthRequest({
    webClientId,
    androidClientId: androidClientId || undefined,
    iosClientId: iosClientId || undefined,
    scopes: ['openid', 'profile', 'email'],
  });

  const hasAnyClientId = Boolean(
    webClientId ||
      (Platform.OS === 'android' && androidClientId) ||
      (Platform.OS === 'ios' && iosClientId)
  );

  const [loading, setLoading] = useState(false);

  const handleNativeSignIn = async () => {
    GoogleSignin.configure({
      webClientId,
      iosClientId: iosClientId || undefined,
      offlineAccess: false,
    });

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    await GoogleSignin.signOut().catch(() => {});
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult?.data?.idToken || signInResult?.idToken;

    if (!idToken) {
      throw new Error('Google sign-in did not return an ID token.');
    }

    const result = await authService.googleLogin(idToken);
    await login(result.user);
  };

  const handleBrowserSignIn = async () => {
    const response = await promptAsync();
    if (response?.type === 'cancel' || response?.type === 'dismiss') {
      return;
    }
    if (response?.type !== 'success') {
      throw new Error('Google sign-in was not completed.');
    }

    const idToken = response?.authentication?.idToken || response?.params?.id_token;

    if (!idToken) {
      throw new Error('Google sign-in did not return an ID token.');
    }

    const result = await authService.googleLogin(idToken);
    await login(result.user);
  };

  const handlePress = async () => {
    if (!webClientId) {
      onError?.('Google Sign-In disabled - set googleWebClientId in app.json.');
      return;
    }

    setLoading(true);
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        await handleNativeSignIn();
      } else {
        await handleBrowserSignIn();
      }
    } catch (err) {
      const message = getGoogleErrorMessage(err);
      if (message) onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  if (!hasAnyClientId) {
    return (
      <View style={styles.disabled}>
        <Text style={styles.disabledText}>
          Google Sign-In disabled - set googleWebClientId in app.json.
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        pressed && !loading && { opacity: 0.85 },
        loading && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          <Ionicons name="logo-google" size={18} color="#ea4335" />
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function createStyles(colors, isDark) {
  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
      paddingHorizontal: 14,
    },
    label: {
      fontFamily: 'Geist_600SemiBold',
      fontSize: 14,
      color: colors.text,
    },
    disabled: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    disabledText: {
      fontFamily: 'Geist_500Medium',
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
