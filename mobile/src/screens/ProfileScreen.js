import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LogoutButton from '../components/LogoutButton';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { profileApi } from '../api/api';
import { ProfileContentSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';

const profileTabs = ['My Recipes', 'Saved', 'Activity'];

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const [notifications, setNotifications] = useState(true);
  const [activeTab, setActiveTab] = useState('My Recipes');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const isInitialLoading = useInitialContentLoading();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadProfile = async () => {
        setProfileLoading(true);
        if (!user?.id) {
          setProfile(null);
          setProfileLoading(false);
          return;
        }
        try {
          const { data } = await profileApi.getProfile(user.id);
          if (active) setProfile(data.profile);
        } catch (error) {
          console.error('Failed to load profile', error);
        } finally {
          if (active) setProfileLoading(false);
        }
      };
      loadProfile();
      return () => { active = false; };
    }, [user?.id])
  );

  const displayName = useMemo(() => {
    const name = profile?.full_name || user?.full_name || user?.name;
    return typeof name === 'string' && name.trim() ? name.trim() : 'CookMate Chef';
  }, [profile?.full_name, user?.full_name, user?.name]);

  const displayInitial = useMemo(() => {
    const trimmed = displayName.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  }, [displayName]);

  const displayEmail = user?.email || profile?.email || 'No email available';
  const openAccountSettings = () => {
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator) {
      parentNavigator.navigate('AccountSettings');
    } else {
      navigation.navigate('AccountSettings');
    }
  };

  if (isInitialLoading || profileLoading) {
    return <ProfileContentSkeleton colors={colors} />;
  }

  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>
      <ScrollView style={st.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profile header card — matches web */}
        <View style={[st.headerCard, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }]}>
          <View style={[st.avatarLg, { backgroundColor: colors.primary }]}>
            <Text style={st.avatarLgText}>{displayInitial}</Text>
          </View>
          <Text style={[st.nameText, { color: colors.text }]}>{displayName}</Text>
          <Text style={[st.emailText, { color: colors.textMuted }]}>{displayEmail}</Text>

          {/* Stats row — matches web Recipes / Followers / Avg Rating */}
          <View style={[st.statsRow, { borderTopColor: isDark ? colors.border : '#d6d3d1' }]}>
            {[
              { num: '12', label: 'RECIPES' },
              { num: '248', label: 'FOLLOWERS' },
              { num: '4.8', label: 'AVG RATING' },
            ].map((stat, i) => (
              <View key={i} style={[st.statCol, i < 2 && { borderRightWidth: 1, borderRightColor: isDark ? colors.border : '#d6d3d1' }]}>
                <Text style={[st.statNum, { color: colors.primary }]}>{stat.num}</Text>
                <Text style={[st.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons — matches web */}
          <View style={st.actionRow}>
            <TouchableOpacity
              onPress={openAccountSettings}
              style={[st.editBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={st.editBtnText}>EDIT PROFILE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.shareBtn, { borderColor: colors.border }]}>
              <Ionicons name="share-outline" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs — matches web sidebar nav */}
        <View style={[st.tabRow, { borderBottomColor: colors.border }]}>
          {profileTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[st.tabItem, activeTab === tab && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
            >
              <Text style={[st.tabText, { color: activeTab === tab ? colors.primary : colors.textSubtle }]}>{tab.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={st.body}>
          {/* Tab Content */}
          {activeTab === 'My Recipes' && (
            <View style={st.emptyState}>
              <Ionicons name="restaurant-outline" size={40} color={colors.textSubtle} />
              <Text style={[st.emptyText, { color: colors.textSubtle }]}>Your created recipes will appear here.</Text>
            </View>
          )}
          {activeTab === 'Saved' && (
            <View style={st.emptyState}>
              <Ionicons name="bookmark-outline" size={40} color={colors.textSubtle} />
              <Text style={[st.emptyText, { color: colors.textSubtle }]}>Bookmark recipes to save them for later.</Text>
            </View>
          )}
          {activeTab === 'Activity' && (
            <View style={st.activityWrap}>
              {/* Activity Heatmap placeholder — matches web */}
              <View style={[st.heatmapCard, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }]}>
                <Text style={[st.miniLabel, { color: colors.textSubtle }]}>ACTIVITY HEATMAP</Text>
                <View style={st.heatmapGrid}>
                  {Array.from({ length: 28 }, (_, i) => {
                    const intensity = Math.random();
                    const bg = intensity > 0.7 ? colors.primary : intensity > 0.4 ? (isDark ? '#431407' : '#fed7aa') : (isDark ? colors.border : '#e7e5e4');
                    return <View key={i} style={[st.heatCell, { backgroundColor: bg }]} />;
                  })}
                </View>
                <Text style={[st.heatCaption, { color: colors.textMuted }]}>42 recipes cooked this year</Text>
              </View>

              {/* Health Score — matches web */}
              <View style={[st.healthCard, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }]}>
                <Text style={[st.miniLabel, { color: colors.textSubtle }]}>HEALTH SCORE</Text>
                <View style={st.healthRow}>
                  <Text style={[st.healthNum, { color: colors.primary }]}>78</Text>
                  <Text style={[st.healthUnit, { color: colors.textMuted }]}>/100</Text>
                </View>
                <View style={[st.healthBar, { backgroundColor: isDark ? colors.border : '#e7e5e4' }]}>
                  <View style={[st.healthBarFill, { width: '78%', backgroundColor: colors.primary }]} />
                </View>
                <Text style={[st.healthCaption, { color: colors.textMuted }]}>Based on ingredient balance and variety</Text>
              </View>
            </View>
          )}

          {/* Settings Section */}
          <View style={st.settingsSection}>
            <Text style={[st.miniLabel, { color: colors.textSubtle, marginBottom: 12 }]}>PREFERENCES</Text>

            <View style={[st.settingsCard, { borderColor: colors.border }]}>
              {[
                { icon: 'notifications-outline', label: 'Push Notifications', type: 'switch', value: notifications, onChange: setNotifications },
                { icon: 'moon-outline', label: 'Dark Mode', type: 'switch', value: isDark, onChange: () => toggleTheme() },
                { icon: 'globe-outline', label: 'Language', type: 'value', value: 'English (US)' },
                { icon: 'shield-checkmark-outline', label: 'Privacy', type: 'arrow' },
                { icon: 'help-circle-outline', label: 'Help & Support', type: 'arrow' },
              ].map((item, i, arr) => (
                <View key={i} style={[st.settingRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <View style={st.settingLeft}>
                    <Ionicons name={item.icon} size={18} color={colors.primary} />
                    <Text style={[st.settingLabel, { color: colors.text }]}>{item.label}</Text>
                  </View>
                  {item.type === 'switch' && (
                    <Switch
                      value={item.value}
                      onValueChange={item.onChange}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.surface}
                    />
                  )}
                  {item.type === 'value' && (
                    <Text style={[st.settingValue, { color: colors.textSubtle }]}>{item.value}</Text>
                  )}
                  {item.type === 'arrow' && (
                    <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                  )}
                </View>
              ))}
            </View>
          </View>

          <LogoutButton />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  // Header
  headerCard: { paddingTop: 32, paddingBottom: 24, alignItems: 'center' },
  avatarLg: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarLgText: { color: '#fff', fontFamily: 'Geist_800ExtraBold', fontSize: 30 },
  nameText: { fontFamily: 'Geist_800ExtraBold', fontSize: 22, letterSpacing: -0.3 },
  emailText: { fontFamily: 'Geist_400Regular', fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', width: '100%', marginTop: 20, paddingTop: 18, borderTopWidth: 1 },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: 'Geist_800ExtraBold', fontSize: 22 },
  statLabel: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 1.5, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18, paddingHorizontal: 24 },
  editBtn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 2, color: '#fff' },
  shareBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  // Tabs
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
  // Body
  body: { padding: 16, gap: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: 'Geist_400Regular', fontSize: 13, textAlign: 'center' },
  // Activity
  activityWrap: { gap: 16 },
  heatmapCard: { padding: 20, gap: 12 },
  miniLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2 },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heatCell: { width: 16, height: 16 },
  heatCaption: { fontFamily: 'Geist_400Regular', fontSize: 11, marginTop: 4 },
  healthCard: { padding: 20, gap: 8 },
  healthRow: { flexDirection: 'row', alignItems: 'baseline' },
  healthNum: { fontFamily: 'Geist_800ExtraBold', fontSize: 36 },
  healthUnit: { fontFamily: 'Geist_400Regular', fontSize: 16, marginLeft: 2 },
  healthBar: { height: 6, width: '100%', marginTop: 4 },
  healthBarFill: { height: '100%' },
  healthCaption: { fontFamily: 'Geist_400Regular', fontSize: 11 },
  // Settings
  settingsSection: { gap: 0 },
  settingsCard: { borderWidth: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontFamily: 'Geist_500Medium', fontSize: 14 },
  settingValue: { fontFamily: 'Geist_700Bold', fontSize: 11, letterSpacing: 0.5 },
});
