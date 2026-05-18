import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../context/ThemeContext';
import {
  getOfflineRecipeList,
  removeRecipeFromOffline,
  getDownloadStorageStats,
  getRecipeFolderPath,
} from '../offline/recipeDownload';
import { getCachedImage } from '../offline/imageCache';
import OptimizedImage from '../components/OptimizedImage';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ts));
}

export default function DownloadsScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [imageUris, setImageUris] = useState({});
  const [storageStats, setStorageStats] = useState({
    totalSizeMB: 0,
    availableMB: 500,
    isLowSpace: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    console.log('[DownloadsScreen] Loading downloads...');
    try {
      const rows = await getOfflineRecipeList();
      console.log('[DownloadsScreen] Loaded rows:', rows?.length || 0, rows);
      
      const stats = await getDownloadStorageStats();
      console.log('[DownloadsScreen] Stats:', stats);
      
      if (!rows || rows.length === 0) {
        console.warn('[DownloadsScreen] No downloads found');
      }
      
      rows.sort((a, b) => b.cachedAt - a.cachedAt);
      setDownloads(rows);
      setStorageStats(stats);

      // Resolve cached image URIs
      const uris = {};
      await Promise.all(
        rows.map(async (r) => {
          if (r.imageUrl || r.image) {
            const url = r.imageUrl || r.image;
            const cached = await getCachedImage(url).catch(() => null);
            uris[r.id] = cached ? `file://${cached}` : url;
          }
        }),
      );
      setImageUris(uris);
    } catch (err) {
      console.error('[DownloadsScreen] ERROR loading downloads:', err);
      console.error('[DownloadsScreen] Error message:', err?.message);
      console.error('[DownloadsScreen] Error stack:', err?.stack);
      setDownloads([]);
    } finally {
      setLoading(false);
      console.log('[DownloadsScreen] Load complete');
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRemove = (item) => {
    Alert.alert(
      'Remove Download',
      `Remove "${item.title}" from offline storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (removingId) return;
            setRemovingId(item.id);
            setDownloads((prev) => prev.filter((d) => d.id !== item.id));
            try {
              await removeRecipeFromOffline(item.id);
            } catch {
              setDownloads((prev) => [item, ...prev]);
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => {
    const imageUri = imageUris[item.id];
    return (
      <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Thumbnail */}
        <View style={[st.thumb, { backgroundColor: isDark ? '#292524' : '#fff7ed' }]}>
          {imageUri ? (
            <OptimizedImage
              source={{ uri: imageUri }}
              style={st.thumbImg}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
          )}
        </View>

        {/* Info */}
        <View style={st.info}>
          <Text style={[st.title, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={st.badges}>
            {item.hasVideo && (
              <View style={[st.badge, { backgroundColor: isDark ? '#431407' : '#fff7ed' }]}>
                <Ionicons name="videocam" size={10} color={colors.primary} />
                <Text style={[st.badgeText, { color: colors.primary }]}>Video</Text>
              </View>
            )}
            <Text style={[st.meta, { color: colors.textMuted }]}>
              {formatDate(item.cachedAt)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={st.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
            style={[st.openBtn, { backgroundColor: isDark ? '#431407' : '#fff7ed' }]}
            activeOpacity={0.75}
          >
            <Ionicons name="play" size={14} color={colors.primary} />
            <Text style={[st.openBtnText, { color: colors.primary }]}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleRemove(item)}
            disabled={removingId === item.id}
            style={st.removeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {removingId === item.id ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[st.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={st.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <View style={[st.headerIcon, { backgroundColor: isDark ? '#431407' : '#fff7ed' }]}>
            <Ionicons name="cloud-download-outline" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[st.headerTitle, { color: colors.text }]}>Downloads</Text>
            <Text style={[st.headerSub, { color: colors.textMuted }]}>Recipes available offline</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={load}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={st.refreshBtn}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={st.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : downloads.length === 0 ? (
        /* Empty state — mirrors web DownloadsPage */
        <View style={st.centered}>
          <View style={[st.emptyIcon, { backgroundColor: isDark ? '#292524' : '#fff7ed' }]}>
            <Ionicons name="cloud-download-outline" size={36} color={isDark ? '#78350f' : '#fed7aa'} />
          </View>
          <Text style={[st.emptyTitle, { color: colors.text }]}>No downloads yet</Text>
          <Text style={[st.emptyDesc, { color: colors.textMuted }]}>
            Open any recipe and tap "Download for Offline" to save it for use without internet.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Recipes')}
            style={[st.exploreBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={st.exploreBtnText}>Browse Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={st.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={[st.storageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={st.storageRow}>
                <View style={st.storageLeft}>
                  <Ionicons name="server-outline" size={16} color={storageStats.isLowSpace ? '#ef4444' : colors.primary} />
                  <Text style={[st.storageLabel, { color: storageStats.isLowSpace ? '#ef4444' : colors.text }]}>
                    Offline Storage
                  </Text>
                </View>
                <Text style={[st.storageCount, { color: colors.textMuted }]}>
                  {downloads.length} recipe{downloads.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={st.storageDetails}>
                <Text style={[st.storageDetailText, { color: colors.textMuted }]}>
                  Used: {storageStats.totalSizeMB.toFixed(1)} MB • Available: {storageStats.availableMB.toFixed(1)} MB
                </Text>
                {storageStats.isLowSpace && (
                  <Text style={st.lowSpaceWarning}>
                    ⚠️ Low storage space
                  </Text>
                )}
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 18, letterSpacing: -0.3 },
  headerSub: { fontFamily: 'Geist_400Regular', fontSize: 11, marginTop: 1 },
  refreshBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: 'Geist_700Bold', fontSize: 18, marginBottom: 8 },
  emptyDesc: {
    fontFamily: 'Geist_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
    marginBottom: 24,
  },
  exploreBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 999 },
  exploreBtnText: { fontFamily: 'Geist_700Bold', fontSize: 14, color: '#fff', letterSpacing: 0.3 },
  list: { padding: 16, gap: 12 },
  storageCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
  },
  storageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  storageLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storageLabel: { fontFamily: 'Geist_600SemiBold', fontSize: 13 },
  storageCount: { fontFamily: 'Geist_400Regular', fontSize: 12 },
  storageDetails: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  storageDetailText: { fontFamily: 'Geist_400Regular', fontSize: 11, marginTop: 4 },
  lowSpaceWarning: { fontFamily: 'Geist_600SemiBold', fontSize: 11, color: '#ef4444', marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumbImg: { width: '100%', height: '100%' },
  info: { flex: 1, gap: 4 },
  title: { fontFamily: 'Geist_700Bold', fontSize: 14, lineHeight: 19 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontFamily: 'Geist_700Bold', fontSize: 10 },
  meta: { fontFamily: 'Geist_400Regular', fontSize: 11 },
  actions: { flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  openBtnText: { fontFamily: 'Geist_700Bold', fontSize: 12 },
  removeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
