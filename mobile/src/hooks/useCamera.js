import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const CAMERA_CAPTURE_QUALITY = 0.28;
const MAX_CAMERA_BASE64_LENGTH = 7 * 1024 * 1024;

export function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState('back');
  const cameraRef = useRef(null);

  useEffect(() => {
    if (permission) {
      setHasPermission(permission.granted);
    } else {
      requestPermission().then((p) => {
        setHasPermission(p?.granted ?? false);
      });
    }
  }, [permission]);

  const toggleCameraType = () => {
    setType((current) => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (!cameraRef.current) return null;
    try {
      const photo = await cameraRef.current.takePicture({
        base64: true,
        quality: CAMERA_CAPTURE_QUALITY,
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
    cameraRef,
    toggleCameraType,
    takePicture,
  };
}
