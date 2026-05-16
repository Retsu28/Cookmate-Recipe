import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');

export default function CameraSavesOverlay({
  saves,
  savesLoading,
  savesError,
  restoringSaveId,
  loadCameraSaves,
  restoreSave,
  deleteSave,
  clearAllSaves,
  onClose,
}) {
  return (
    <View style={st.savesOverlay}>
      <SafeAreaView style={st.savesSafe}>
        <View style={st.savesHeader}>
          <Text style={st.savesTitle}>My Saves ({saves.length})</Text>
          <View style={st.savesHeaderRight}>
            {saves.length > 0 && (
              <TouchableOpacity onPress={clearAllSaves}>
                <Text style={st.savesClearText}>Clear All</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={st.savesCloseBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        {savesLoading ? (
          <View style={st.savesEmpty}>
            <Ionicons name="images-outline" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={st.savesEmptyText}>Loading saved AI camera results...</Text>
          </View>
        ) : savesError ? (
          <View style={st.savesEmpty}>
            <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={st.savesEmptyText}>{savesError}</Text>
            <TouchableOpacity onPress={loadCameraSaves}>
              <Text style={st.savesClearText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : saves.length > 0 ? (
          <ScrollView contentContainerStyle={st.savesGrid}>
            {saves.map(save => (
              <View key={save.id} style={st.saveItem}>
                <TouchableOpacity onPress={() => restoreSave(save.id)} disabled={restoringSaveId !== null} style={st.saveOpenBtn}>
                  {save.thumbnailImageData ? (
                    <Image source={{ uri: save.thumbnailImageData }} style={st.saveThumb} />
                  ) : (
                    <View style={st.saveThumbFallback}>
                      <Ionicons name="restaurant" size={22} color="rgba(255,255,255,0.55)" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteSave(save.id)} style={st.saveDeleteBtn}>
                  <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
                <View style={st.saveDateWrap}>
                  <Text style={st.saveDateText}>{new Date(save.createdAt).toLocaleDateString()}</Text>
                </View>
                {restoringSaveId === save.id && (
                  <View style={st.saveLoadingOverlay}>
                    <Text style={st.saveLoadingText}>Loading</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={st.savesEmpty}>
            <Ionicons name="images-outline" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={st.savesEmptyText}>No saved AI camera results yet.</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  savesOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 50 },
  savesSafe: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  savesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingTop: 8 },
  savesTitle: { fontFamily: 'Geist_700Bold', fontSize: 18, color: '#fff' },
  savesHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  savesClearText: { fontFamily: 'Geist_700Bold', fontSize: 11, color: '#f97316', letterSpacing: 0.5 },
  savesCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  savesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 100 },
  saveItem: { width: (SW - 56) / 3, aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#292524' },
  saveOpenBtn: { width: '100%', height: '100%' },
  saveThumb: { width: '100%', height: '100%' },
  saveThumbFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#292524' },
  saveDeleteBtn: { position: 'absolute', top: 4, right: 4 },
  saveDateWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.5)' },
  saveDateText: { fontFamily: 'Geist_400Regular', fontSize: 8, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  saveLoadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  saveLoadingText: { fontFamily: 'Geist_700Bold', fontSize: 9, color: '#fff', letterSpacing: 1 },
  savesEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  savesEmptyText: { fontFamily: 'Geist_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
});
