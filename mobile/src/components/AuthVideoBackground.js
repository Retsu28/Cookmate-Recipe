import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAppTheme } from '../context/ThemeContext';

const backgroundVideo = require('../../assets/authformbackground.mp4');

export default function AuthVideoBackground() {
  const { colors, isDark } = useAppTheme();
  const player = useVideoPlayer(backgroundVideo, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
    playerInstance.volume = 0;
    playerInstance.play();
  });

  return (
    <View pointerEvents="none" style={[styles.root, { backgroundColor: colors.background }]}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="cover"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
      <View
        style={[
          styles.overlay,
          { backgroundColor: isDark ? 'rgba(12, 10, 9, 0.52)' : 'rgba(28, 25, 23, 0.36)' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
