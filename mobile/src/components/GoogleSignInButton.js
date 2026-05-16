/**
 * Google Sign-In button for the mobile Expo app.
 *
 * Uses the native Google Sign-In SDK on Android/iOS outside Expo Go and
 * the Expo AuthSession proxy inside Expo Go. The Google ID token is exchanged
 * for a Firebase session, then for the CookMate backend session.
 *
 * Client IDs are read from app.json -> expo.extra:
 *   googleWebClientId     - Web OAuth client ID, used by the backend verifier
 *   googleAndroidClientId - Android OAuth client ID, configured in Google Cloud
 *   googleIosClientId     - iOS OAuth client ID, configured in Google Cloud
 *   googleAuthRedirectUri - Firebase Auth handler URI authorized on the Web OAuth client
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
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../context/AuthContext';
import { authService, MfaRequiredError } from '../services/authService';
import { useAppTheme } from '../context/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

let nativeGoogleSignInModule = null;
const EXPO_AUTH_PROXY_BASE_URL = 'https://auth.expo.io';
const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const DEFAULT_GOOGLE_AUTH_REDIRECT_URI =
  'https://cookmate-9272d.firebaseapp.com/__/auth/handler';

async function loadNativeGoogleSignIn() {
  if (!nativeGoogleSignInModule) {
    try {
      nativeGoogleSignInModule = await import('@react-native-google-signin/google-signin');
    } catch (e) {
      console.warn('[GoogleSignIn] Native module not available:', e?.message || e);
      nativeGoogleSignInModule = null;
    }
  }
  return nativeGoogleSignInModule;
}

function isRunningInExpoGo() {
  return Constants.appOwnership === 'expo' || Boolean(Constants.expoGoConfig);
}

function canUseNativeGoogleSignIn() {
  const isExpoGo = isRunningInExpoGo();
  return (Platform.OS === 'android' || Platform.OS === 'ios') && !isExpoGo;
}

function getConfig() {
  const extra =
    Constants?.expoConfig?.extra || Constants?.manifest2?.extra?.expoClient?.extra || {};
  return {
    webClientId: extra.googleWebClientId || '',
    androidClientId: extra.googleAndroidClientId || '',
    iosClientId: extra.googleIosClientId || '',
    googleAuthRedirectUri:
      extra.googleAuthRedirectUri || DEFAULT_GOOGLE_AUTH_REDIRECT_URI,
  };
}

function getExpoProxyProjectName() {
  const originalFullName = Constants.expoConfig?.originalFullName;
  if (originalFullName) return originalFullName;

  const owner = Constants.expoConfig?.owner;
  const slug = Constants.expoConfig?.slug;
  if (owner && slug) return `@${owner}/${slug}`;

  return '';
}

function getQueryParams(input) {
  const url = new URL(input, 'https://cookmate.local');
  const params = Object.fromEntries(url.searchParams);

  if (url.hash) {
    new URLSearchParams(url.hash.replace(/^#/, '')).forEach((value, key) => {
      params[key] = value;
    });
  }

  return params;
}

async function createStateToken(byteCount = 16) {
  try {
    const bytes = await Crypto.getRandomBytesAsync(byteCount);
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function buildExpoProxyStartUrl({ authUrl, projectName, returnUrl }) {
  const proxyUrl = `${EXPO_AUTH_PROXY_BASE_URL}/${projectName}`;
  const params = new URLSearchParams({ authUrl, returnUrl });
  return `${proxyUrl}/start?${params.toString()}`;
}

function getGoogleErrorMessage(err, statusCodes = {}) {
  if (err?.code === statusCodes.SIGN_IN_CANCELLED || err?.code === 'SIGN_IN_CANCELLED') {
    return '';
  }
  if (err?.code === statusCodes.IN_PROGRESS || err?.code === 'IN_PROGRESS') {
    return 'Google sign-in is already in progress.';
  }
  if (
    err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE ||
    err?.code === 'PLAY_SERVICES_NOT_AVAILABLE'
  ) {
    return 'Google Play Services is not available or needs to be updated.';
  }
  return err?.message || 'Google sign-in failed. Please try again.';
}

export default function GoogleSignInButton({ label = 'Continue with Google', onError, onMfaRequired }) {
  const { login } = useAuth();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { webClientId, androidClientId, iosClientId, googleAuthRedirectUri } = getConfig();
  const isExpoGo = isRunningInExpoGo();

  const hasAnyClientId = Boolean(
    webClientId ||
      (Platform.OS === 'android' && androidClientId) ||
      (Platform.OS === 'ios' && iosClientId)
  );

  const [loading, setLoading] = useState(false);

  const handleNativeSignIn = async () => {
    const nativeModule = await loadNativeGoogleSignIn();
    if (!nativeModule) {
      throw new Error('Google Sign-In native module is not available. Use Expo Go proxy instead.');
    }
    const { GoogleSignin } = nativeModule;

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

  const handleExpoGoProxySignIn = async () => {
    const projectName = getExpoProxyProjectName();
    if (!projectName) {
      throw new Error('Google Sign-In needs expo.owner and expo.slug in app.json for Expo Go.');
    }

    const proxyRedirectUri = `${EXPO_AUTH_PROXY_BASE_URL}/${projectName}`;
    const returnUrl = AuthSession.getDefaultReturnUrl();
    const firebaseRedirectUri = googleAuthRedirectUri || DEFAULT_GOOGLE_AUTH_REDIRECT_URI;
    const state = await createStateToken();
    const nonce = await createStateToken();

    // Firebase's handler must be authorized on the Google Web OAuth client.
    // Expo Go still needs the proxy redirect at runtime so Android/iOS can
    // return the ID token to this app after Google finishes.
    const authParams = new URLSearchParams({
      client_id: webClientId,
      redirect_uri: proxyRedirectUri,
      response_type: 'id_token',
      scope: 'openid profile email',
      state,
      nonce,
      prompt: 'select_account',
    });
    const authUrl = `${GOOGLE_AUTHORIZATION_ENDPOINT}?${authParams.toString()}`;
    const startUrl = buildExpoProxyStartUrl({ authUrl, projectName, returnUrl });

    const response = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
    if (response?.type === 'cancel' || response?.type === 'dismiss') {
      return;
    }
    if (response?.type !== 'success') {
      throw new Error('Google sign-in was not completed.');
    }

    const params = getQueryParams(response.url);
    if (params.error) {
      const description = params.error_description || params.error;
      if (params.error === 'redirect_uri_mismatch') {
        throw new Error(
          `Google redirect mismatch. Add both authorized redirect URIs to the Web OAuth client: ${proxyRedirectUri} and ${firebaseRedirectUri}.`
        );
      }
      throw new Error(description);
    }
    if (params.state !== state) {
      throw new Error('Google sign-in state check failed. Please try again.');
    }

    const idToken = params.id_token;
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
      if (isExpoGo) {
        await handleExpoGoProxySignIn();
      } else if (canUseNativeGoogleSignIn()) {
        await handleNativeSignIn();
      } else {
        await handleExpoGoProxySignIn();
      }
    } catch (err) {
      if (err instanceof MfaRequiredError) {
        onMfaRequired?.(err.mfaUserId);
        return;
      }
      const moduleStatusCodes = nativeGoogleSignInModule?.statusCodes;
      const message = getGoogleErrorMessage(err, moduleStatusCodes);
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
