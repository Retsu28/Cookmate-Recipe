import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
} from '@expo-google-fonts/geist';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/components/SplashScreen';

function PostLoginSplash({ colors, isDark }) {
  const { showPostLoginSplash, finishPostLoginSplash } = useAuth();

  if (!showPostLoginSplash) return null;

  return (
    <SplashScreen
      colors={colors}
      isDark={isDark}
      onFinished={finishPostLoginSplash}
    />
  );
}

function AppContent({ fontsLoaded }) {
  const { colors, navigationTheme, isDark, isReady } = useAppTheme();
  const [splashDone, setSplashDone] = useState(false);

  if (!fontsLoaded || !isReady) {
    return (
      <View style={[styles.root, styles.loading, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaProvider style={styles.safeArea}>
        <AuthProvider>
          <NavigationContainer theme={navigationTheme}>
            <AppNavigator />
            <StatusBar style={isDark ? 'light' : 'dark'} />
          </NavigationContainer>
          <PostLoginSplash colors={colors} isDark={isDark} />
        </AuthProvider>
      </SafeAreaProvider>
      {!splashDone && (
        <SplashScreen
          colors={colors}
          isDark={isDark}
          onFinished={() => setSplashDone(true)}
        />
      )}
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
  });

  return (
    <ThemeProvider>
      <AppContent fontsLoaded={fontsLoaded} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
