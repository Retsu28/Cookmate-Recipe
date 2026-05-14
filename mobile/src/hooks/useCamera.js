import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { Camera } from 'expo-camera';

const TARGET_CAPTURE_MAX_EDGE = 1280;
const CAMERA_CAPTURE_QUALITY = 0.28;
const MAX_CAMERA_BASE64_LENGTH = 7 * 1024 * 1024;

function parsePictureSize(size) {
  const match = String(size || '').match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { size, width, height, maxEdge: Math.max(width, height) };
}

function chooseFastPictureSize(sizes) {
  if (!Array.isArray(sizes) || sizes.length === 0) return null;
  if (sizes.includes('1280x720')) return '1280x720';
  if (sizes.includes('Medium')) return 'Medium';
  const parsed = sizes.map(parsePictureSize).filter(Boolean);
  if (parsed.length === 0) return null;
  const atOrBelowTarget = parsed
    .filter((item) => item.maxEdge <= TARGET_CAPTURE_MAX_EDGE && item.maxEdge >= 640)
    .sort((a, b) => b.maxEdge - a.maxEdge);
  if (atOrBelowTarget[0]) return atOrBelowTarget[0].size;
  return parsed.sort((a, b) => a.maxEdge - b.maxEdge)[0].size;
}

export function useCamera() {
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState('back');
  const [pictureSize, setPictureSize] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const configurePictureSize = async () => {
    try {
      const sizes = await cameraRef.current?.getAvailablePictureSizesAsync?.();
      const nextSize = chooseFastPictureSize(sizes);
      if (nextSize) setPictureSize(nextSize);
    } catch (err) {
      console.warn('[useCamera] picture size optimization skipped:', err?.message || err);
    }
  };

  const toggleCameraType = () => {
    setPictureSize(null);
    setType((current) => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (!cameraRef.current) return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: CAMERA_CAPTURE_QUALITY,
        exif: false,
      });
      if (!photo.base64) return { uri: photo.uri, base64: null, error: 'no_base64' };
      if (photo.base64.length > MAX_CAMERA_BASE64_LENGTH) return { uri: photo.uri, base64: null, error: 'too_large' };
      return { uri: photo.uri, base64: `data:image/jpeg;base64,${photo.base64}`, error: null };
    } catch (e) {
      console.error('[useCamera] takePicture failed:', e);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
      return null;
    }
  };

  return {
    hasPermission,
    type,
    pictureSize,
    cameraRef,
    configurePictureSize,
    toggleCameraType,
    takePicture,
  };
}
