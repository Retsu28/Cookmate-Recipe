import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

let VideoView = null;
let useVideoPlayer = null;
try {
  const mod = require('expo-video');
  VideoView = mod.VideoView;
  useVideoPlayer = mod.useVideoPlayer;
} catch {
  // expo-video not available (e.g. Expo Go)
}

const BACKGROUND_VIDEO_URI =
  'https://res.cloudinary.com/drtr06hnf/video/upload/v1778771966/authformbackground_mk5gei.mp4';

function VideoPlayer() {
  const player = useVideoPlayer(BACKGROUND_VIDEO_URI, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
    p.audioMixingMode = 'mixWithOthers';
    p.staysActiveInBackground = false;
    p.play();
  });

  useEffect(() => {
    if (player) {
      player.play();
    }
  }, [player]);

  return (
    <VideoView
      player={player}
      style={styles.video}
      nativeControls={false}
      contentFit="cover"
      allowsPictureInPicture={false}
      allowsFullscreen={false}
      startsPictureInPictureAutomatically={false}
    />
  );
}

export default function AuthVideoBackground() {
  return (
    <View pointerEvents="none" style={styles.root}>
      {VideoView && useVideoPlayer ? <VideoPlayer /> : null}
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0c0a09',
    zIndex: 0,
    elevation: 0,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 25, 23, 0.35)',
  },
});
