import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { colors } from '../theme';

/**
 * Small sign-out trigger styled to sit inside any existing card or
 * screen footer without redesigning the host screen.
 *
 * Clears the SecureStore token through AuthContext.logout(); the
 * navigator will automatically swap to the auth stack because it
 * branches on `isAuthenticated`.
 */
export default function LogoutButton({ label = 'Sign out', style }) {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);

  const handlePress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await authService.logout();
      await logout();
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={busy}
      activeOpacity={0.85}
      style={[styles.btn, busy && { opacity: 0.6 }, style]}
    >
      {busy ? (
        <ActivityIndicator color="#b91c1c" size="small" />
      ) : (
        <>
          <Ionicons name="log-out-outline" size={18} color="#b91c1c" />
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
  },
  label: {
    color: '#b91c1c',
    fontFamily: 'Geist_700Bold',
    fontSize: 14,
    marginLeft: 6,
  },
  // colors import kept to stay consistent with theme module, ensures
  // any future theming edits land in one place
  _themeRef: { color: colors?.primary },
});
