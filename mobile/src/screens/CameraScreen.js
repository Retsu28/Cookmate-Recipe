import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { CameraAnalysisSkeleton, CameraPermissionSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';

const detectedIngredients = ['Chicken', 'Sun-dried Tomatoes', 'Spinach', 'Cream'];

export default function CameraScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState('back');
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const cameraRef = useRef(null);
  const isInitialLoading = useInitialContentLoading();

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
        setAnalysisComplete(false);
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        setCapturedImage(photo.uri);
        setTimeout(() => {
          setLoading(false);
          setAnalysisComplete(true);
        }, 2000);
      } catch (error) {
        console.error('Failed to take picture', error);
        setLoading(false);
      }
    }
  };

  if (isInitialLoading || hasPermission === null) {
    return <CameraPermissionSkeleton colors={colors} />;
  }
  if (hasPermission === false) {
    return (
      <View style={st.permWrap}>
        <Text style={st.permText}>No access to camera. Please enable permissions in settings.</Text>
      </View>
    );
  }

  return (
    <View style={st.root}>
      {capturedImage ? (
        <View style={st.flex1}>
          <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFillObject} />
          {loading && (
            <View style={st.loadingOverlay}>
              <View style={st.loadingCardWrap}>
                <CameraAnalysisSkeleton colors={colors} />
              </View>
            </View>
          )}
          {analysisComplete && (
            <SafeAreaView style={st.resultSafe} pointerEvents="box-none">
              {/* Analysis card — matches web dark header + content */}
              <View style={[st.resultCard, { backgroundColor: colors.surface }]}>
                <View style={st.resultHeader}>
                  <View style={st.resultIconBox}>
                    <Ionicons name="restaurant" size={16} color={colors.primary} />
                  </View>
                  <View style={st.resultHeaderText}>
                    <Text style={st.resultTitle}>Analysis Complete</Text>
                    <Text style={st.resultSub}>Creamy Tuscan Chicken · 450 kcal</Text>
                  </View>
                </View>

                {/* Ingredient badges */}
                <View style={st.badgeWrap}>
                  {detectedIngredients.map((ing) => (
                    <View key={ing} style={[st.badge, { backgroundColor: isDark ? colors.surfaceAlt : '#f5f5f4' }]}>
                      <Text style={[st.badgeText, { color: colors.text }]}>{ing.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <View style={st.resultActions}>
                  <TouchableOpacity
                    onPress={() => { setCapturedImage(null); setAnalysisComplete(false); }}
                    style={[st.retakeBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[st.retakeBtnText, { color: colors.text }]}>RETAKE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('RecipeDetail', { id: 1 })}
                    style={[st.viewBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={st.viewBtnText}>VIEW RECIPE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          )}
        </View>
      ) : (
        <View style={st.flex1}>
          <CameraView style={StyleSheet.absoluteFillObject} facing={type} ref={cameraRef} />
          <SafeAreaView style={st.cameraSafe} pointerEvents="box-none">
            {/* Top controls */}
            <View style={st.topBar}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={st.camBtn}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setType(type === 'back' ? 'front' : 'back')}
                style={st.camBtn}
              >
                <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Bottom controls */}
            <View style={st.bottomBar}>
              <View style={st.hintPill}>
                <Text style={st.hintText}>Point at ingredients or a dish</Text>
              </View>

              <View style={st.captureRow}>
                <TouchableOpacity style={st.sideBtn}>
                  <Ionicons name="images-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={takePicture} style={st.captureOuter}>
                  <View style={st.captureInner} />
                </TouchableOpacity>
                <TouchableOpacity style={st.sideBtn}>
                  <Ionicons name="flash-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  flex1: { flex: 1 },
  permWrap: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 40 },
  permText: { fontFamily: 'Geist_400Regular', fontSize: 14, color: '#fff', textAlign: 'center' },
  // Loading
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  loadingCardWrap: { position: 'absolute', left: 12, right: 12, bottom: 100 },
  loadingText: { fontFamily: 'Geist_700Bold', fontSize: 14, color: '#fff', marginTop: 14 },
  // Result
  resultSafe: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 100 },
  resultCard: { overflow: 'hidden', borderRadius: 0 },
  resultHeader: { backgroundColor: '#24160f', flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12 },
  resultIconBox: { width: 36, height: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  resultHeaderText: { flex: 1 },
  resultTitle: { fontFamily: 'Geist_700Bold', fontSize: 16, color: '#fff' },
  resultSub: { fontFamily: 'Geist_400Regular', fontSize: 12, color: '#a8a29e', marginTop: 2 },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.5 },
  resultActions: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 4 },
  retakeBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  retakeBtnText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1.5 },
  viewBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  viewBtnText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1.5, color: '#fff' },
  // Camera
  cameraSafe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between' },
  camBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  bottomBar: { alignItems: 'center', gap: 20 },
  hintPill: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  hintText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1, color: '#fff' },
  captureRow: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  sideBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  captureOuter: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#f97316' },
  captureInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f97316' },
});
