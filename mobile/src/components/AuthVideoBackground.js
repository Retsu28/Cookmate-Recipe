import React from 'react';
import { StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';


const backgroundVideo = require('../../assets/authformbackground.mp4');
const AUTH_FALLBACK = '#0c0a09';
const AUTH_OVERLAY = 'rgba(28, 25, 23, 0.35)';

export default function AuthVideoBackground() {
  const player = useVideoPlayer(backgroundVideo, (p) => {
    try {
      p.loop = true;
      p.muted = true;
      p.volume = 0;
      p.audioMixingMode = 'mixWithOthers';
      p.staysActiveInBackground = false;
      p.play();
    } catch {
      // Best-effort: keep auth screen usable if playback is rejected.
    }
  });

  return (
    <View pointerEvents="none" style={styles.root}>
      {player ? (
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
          contentFit="cover"
          allowsPictureInPicture={false}
          playsInline
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
