import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CameraScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState('back');
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setLoading(true);
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        setCapturedImage(photo.uri);
        // Simulate AI analysis
        setTimeout(() => {
          setLoading(false);
          Alert.alert(
            "AI Analysis Complete",
            "Detected: Creamy Tuscan Chicken",
            [
              { text: "View Recipe", onPress: () => navigation.navigate('RecipeDetail', { id: 1 }) },
              { text: "Retake", onPress: () => setCapturedImage(null) }
            ]
          );
        }, 2000);
      } catch (error) {
        console.error('Failed to take picture', error);
        setLoading(false);
      }
    }
  };

  if (hasPermission === null) {
    return <View className="flex-1 bg-black items-center justify-center"><ActivityIndicator color="#22C55E" /></View>;
  }
  if (hasPermission === false) {
    return <View className="flex-1 bg-black items-center justify-center p-10"><Text className="text-white text-center">No access to camera. Please enable permissions in settings.</Text></View>;
  }

  return (
    <View className="flex-1 bg-black">
      {capturedImage ? (
        <View className="flex-1">
          <Image source={{ uri: capturedImage }} className="flex-1" />
          {loading && (
            <View className="absolute inset-0 bg-black/60 items-center justify-center">
              <ActivityIndicator size="large" color="#22C55E" />
              <Text className="text-white font-bold mt-4">Analyzing image...</Text>
            </View>
          )}
        </View>
      ) : (
        <View className="flex-1">
          <CameraView style={StyleSheet.absoluteFillObject} facing={type} ref={cameraRef} />
          <SafeAreaView className="flex-1 justify-between p-6" pointerEvents="box-none">
            <View className="flex-row justify-between">
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setType(
                type === 'back'
                  ? 'front'
                  : 'back'
              )}>
                <Ionicons name="camera-reverse-outline" size={32} color="white" />
              </TouchableOpacity>
            </View>

            <View className="items-center space-y-8" pointerEvents="box-none">
              <View className="bg-white/10 px-6 py-2 rounded-full border border-white/20">
                <Text className="text-white text-xs font-bold">Point at ingredients or a dish</Text>
              </View>
              
              <View className="flex-row items-center space-x-12">
                <TouchableOpacity className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
                  <Ionicons name="images-outline" size={24} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={takePicture}
                  className="w-20 h-20 bg-white rounded-full items-center justify-center border-4 border-primary"
                >
                  <View className="w-14 h-14 bg-primary rounded-full" />
                </TouchableOpacity>

                <TouchableOpacity className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
                  <Ionicons name="flash-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}
