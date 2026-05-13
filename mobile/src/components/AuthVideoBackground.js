import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Keyboard, Platform } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

const backgroundVideo = require('../../assets/authformbackground.mp4');
const AUTH_FALLBACK = '#0c0a09';
const AUTH_OVERLAY = 'rgba(28, 25, 23, 0.35)';

export default function AuthVideoBackground() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Setup keyboard listeners to pause video when typing
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const player = useVideoPlayer(backgroundVideo, (p) => {
    try {
      p.loop = true;
      p.muted = true;
      p.volume = 0;
      p.audioMixingMode = 'mixWithOthers';
      p.staysActiveInBackground = false;
      // Lower quality for better performance
      if (p.timeUpdateEventInterval) {
        p.timeUpdateEventInterval = 500; // Update every 500ms instead of default
      }
      p.play();
    } catch {
      // Best-effort: keep auth screen usable if playback is rejected.
    }
  });

  // Pause video when keyboard is visible (user typing)
  useEffect(() => {
    if (!player) return;
    try {
      if (isKeyboardVisible) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      // Ignore player errors
    }
  }, [isKeyboardVisible, player]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (player) {
        try {
          player.pause();
        } catch {
          // Ignore
        }
      }
    };
  }, [player]);

  return (
    <View pointerEvents="none" style={styles.root}>
      {player ? (
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
          contentFit="cover"
          allowsPictureInPicture={false}
          allowsFullscreen={false}
          startsPictureInPictureAutomatically={false}
          // Use hardware acceleration when available
          renderMode="texture"
        />
      ) : null}
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_FALLBACK,
    zIndex: 0,
    elevation: 0,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_OVERLAY,
  },
});
