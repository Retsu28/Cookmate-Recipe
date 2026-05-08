import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NotificationCard from '../components/NotificationCard';
import { useAppTheme } from '../context/ThemeContext';
import { NotificationsContentSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';
import { plannerApi } from '../api/api';
import { formatPlanWindow, getCountdownText, getPlanWindowStatus } from '../notifications/plannerNotifications';

export default function NotificationsScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('All');
  const isInitialLoading = useInitialContentLoading();

  const filters = ['All', 'Reminders', 'Shopping'];
  const selectedType = filter.replace(/s$/, '');
  const filteredNotifications = filter === 'All'
    ? notifications
    : notifications.filter((n) => n.type === selectedType);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [upcomingRes, groceryRes] = await Promise.all([
          plannerApi.getUpcoming({ lookaheadHours: 168, lookbackHours: 24 }),
          plannerApi.getGroceryList().catch(() => null),
        ]);
        if (cancelled) return;
        const plans = upcomingRes?.data?.plans || [];
        const groceryList = groceryRes?.data?.groceryList;
        const nextNotifications = [];

        plans.forEach((plan) => {
          const status = getPlanWindowStatus(plan);
          nextNotifications.push({
            id: plan.id,
            type: 'Reminder',
            title: `${plan.meal_type_label} · ${formatPlanWindow(plan)}`,
            message: `${getCountdownText(plan)} · ${plan.recipe?.title || 'Planned meal'}`,
            time: status === 'active' ? 'Active now' : 'Upcoming',
            read: false,
            icon: 'time',
            iconColor: colors.primary || '#f97316',
            actionPath: plan.recipe?.id ? 'RecipeDetail' : 'Planner',
            recipeId: plan.recipe?.id || plan.recipe_id,
          });
        });

        if (groceryList && groceryList.totalItems > 0) {
          nextNotifications.push({
            id: -1,
            type: 'Shopping',
            title: 'Grocery list ready',
            message: `${groceryList.totalItems} items from your meal planner.`,
            time: 'Now',
            read: false,
            icon: 'cart',
            iconColor: colors.primary || '#f97316',
            actionPath: 'Planner',
          });
        }

        setNotifications(nextNotifications);
      } catch {
        setNotifications([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [colors.primary]);

  const markAllRead = () => {
    setNotifications((curr) => curr.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => setNotifications([]);

  const markRead = (id) => {
    setNotifications((curr) => curr.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const openNotification = (notification) => {
    markRead(notification.id);
    if (notification.recipeId) {
      navigation.navigate('RecipeDetail', { id: notification.recipeId });
      return;
    }
    if (notification.actionPath === 'Planner') {
      navigation.navigate('Main', { screen: 'Planner' });
      return;
    }
    navigation.navigate('Main', { screen: 'Home' });
  };

  if (isInitialLoading) {
    return <NotificationsContentSkeleton colors={colors} />;
  }

  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>
      {/* Header — matches web */}
      <View style={[st.pageHeader, { borderBottomColor: colors.border }]}>
        <View style={st.titleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[st.pageTitle, { color: colors.text }]}>Updates</Text>
          {unreadCount > 0 && (
            <View style={[st.badge, { backgroundColor: colors.primary }]}>
              <Text style={st.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={st.headerActions}>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={[st.actionLink, { color: colors.textSubtle }]}>MARK ALL READ</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAll}>
            <Text style={[st.actionLink, { color: colors.textSubtle }]}>CLEAR ALL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter pills — matches web tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterScroll} contentContainerStyle={st.filterContent}>
        {filters.map((f) => {
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                st.filterPill,
                active
                  ? { backgroundColor: colors.primary }
                  : { borderWidth: 1, borderColor: colors.border },
              ]}
            >
              <Text style={[st.filterText, { color: active ? '#fff' : colors.textSubtle }]}>{f.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.listContent}
        renderItem={({ item }) => (
          <NotificationCard
            notification={item}
            onPress={() => openNotification(item)}
          />
        )}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="calendar-outline" size={44} color={colors.textSubtle} />
            <Text style={[st.emptyText, { color: colors.textSubtle }]}>No planner updates yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  pageHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 1, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 28, letterSpacing: -0.5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 0 },
  badgeText: { fontFamily: 'Geist_700Bold', fontSize: 10, color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 16 },
  actionLink: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
  filterScroll: { flexGrow: 0, borderBottomWidth: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8 },
  filterText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 86 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: 'Geist_400Regular', fontSize: 14 },
});
