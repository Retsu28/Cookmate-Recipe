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
import { plannerApi, notificationApi } from '../api/api';
import { formatPlanWindow, getCountdownText, getPlanWindowStatus } from '../notifications/plannerNotifications';
import { useAuth } from '../context/AuthContext';


export default function NotificationsScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const [plannerNotifications, setPlannerNotifications] = useState([]);
  const [dbNotifications, setDbNotifications] = useState([]);
  const [filter, setFilter] = useState('All');
  const isInitialLoading = useInitialContentLoading();

  const notifications = [...dbNotifications, ...plannerNotifications];
  const filters = ['All', 'Reminders', 'Shopping', 'Recipes'];
  const selectedType = filter.replace(/s$/, '');
  const filteredNotifications = filter === 'All'
    ? notifications
    : notifications.filter((n) => n.type === selectedType);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Load both planner notifications and DB notifications
        const [upcomingRes, groceryRes, dbNotifsRes, statesRes] = await Promise.all([
          plannerApi.getUpcoming({ lookaheadHours: 168, lookbackHours: 24 }),
          plannerApi.getGroceryList().catch(() => null),
          user?.id ? notificationApi.getNotifications(user.id).catch(() => null) : Promise.resolve(null),
          user?.id ? notificationApi.getPlannerStates().catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const plans = upcomingRes?.data?.plans || [];
        const groceryList = groceryRes?.data?.groceryList;
        const dbNotifs = dbNotifsRes?.data?.notifications || [];
        const states = statesRes?.data?.states || [];
        const storedReadIds = states.filter(s => s.is_read).map(s => s.ref_id);
        const storedDeletedIds = states.filter(s => s.is_deleted).map(s => s.ref_id);

        const nextPlannerNotifications = [];
        const nextDbNotifications = [];

        // Convert DB notifications
        dbNotifs.forEach((notif) => {
          const isRecipe = notif.type?.toLowerCase() === 'recipe';
          nextDbNotifications.push({
            id: notif.id + 100000, // Offset to avoid ID collision
            dbId: notif.id,
            type: isRecipe ? 'Recipe' : 'System',
            title: notif.title,
            message: notif.message,
            time: new Date(notif.created_at).toLocaleDateString(),
            read: notif.is_read,
            icon: isRecipe ? 'sparkles' : 'notifications',
            iconColor: isRecipe ? '#22c55e' : (colors.primary || '#f97316'),
            actionPath: isRecipe ? 'AllRecipes' : 'Home',
            source: 'db',
          });
        });

        plans.filter((plan) => !storedDeletedIds.includes(plan.id)).forEach((plan) => {
          const status = getPlanWindowStatus(plan);
          const isRead = storedReadIds.includes(plan.id);
          nextPlannerNotifications.push({
            id: plan.id,
            type: 'Reminder',
            title: `${plan.meal_type_label} · ${formatPlanWindow(plan)}`,
            message: `${getCountdownText(plan)} · ${plan.recipe?.title || 'Planned meal'}`,
            time: status === 'active' ? 'Active now' : 'Upcoming',
            read: isRead,
            icon: 'time',
            iconColor: colors.primary || '#f97316',
            actionPath: plan.recipe?.id ? 'RecipeDetail' : 'Planner',
            recipeId: plan.recipe?.id || plan.recipe_id,
            source: 'planner',
          });
        });

        if (groceryList && groceryList.totalItems > 0 && !storedDeletedIds.includes(-1)) {
          const groceryId = -1;
          const isGroceryRead = storedReadIds.includes(groceryId);
          nextPlannerNotifications.push({
            id: groceryId,
            type: 'Shopping',
            title: 'Grocery list ready',
            message: `${groceryList.totalItems} items from your meal planner.`,
            time: 'Now',
            read: isGroceryRead,
            icon: 'cart',
            iconColor: colors.primary || '#f97316',
            actionPath: 'Planner',
            source: 'planner',
          });
        }

        setPlannerNotifications(nextPlannerNotifications);
        setDbNotifications(nextDbNotifications);
      } catch {
        setPlannerNotifications([]);
        setDbNotifications([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [colors.primary, user?.id]);

  const markAllRead = async () => {
    // Update local state
    const allPlannerIds = plannerNotifications.map(n => n.id);
    setPlannerNotifications((curr) => curr.map((n) => ({ ...n, read: true })));
    setDbNotifications((curr) => curr.map((n) => ({ ...n, read: true })));

    // Persist planner read states to DB
    try {
      await Promise.all([
        ...plannerNotifications.map(n =>
          notificationApi.upsertPlannerState(
            n.type === 'Shopping' ? 'grocery_list' : 'meal_plan',
            n.id, true, undefined
          )
        ),
        notificationApi.markAllAsRead(),
      ]);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id) => {
    const notif = notifications.find((n) => n.id === id);
    if (!notif) return;

    if (notif.source === 'db') {
      setDbNotifications((curr) => curr.filter((n) => n.id !== id));
      try {
        await notificationApi.deleteNotification(notif.dbId);
      } catch (err) {
        console.error('Failed to delete notification:', err);
      }
    } else {
      setPlannerNotifications((curr) => curr.filter((n) => n.id !== id));
      const refType = notif.type === 'Shopping' ? 'grocery_list' : 'meal_plan';
      try {
        await notificationApi.upsertPlannerState(refType, id, undefined, true);
      } catch (err) {
        console.error('Failed to delete planner notification:', err);
      }
    }
  };

  const clearAll = async () => {
    const currentPlanner = plannerNotifications;
    const currentDb = dbNotifications;
    setPlannerNotifications([]);
    setDbNotifications([]);
    try {
      await Promise.all([
        ...currentDb.map(n => notificationApi.deleteNotification(n.dbId)),
        ...currentPlanner.map(n =>
          notificationApi.upsertPlannerState(
            n.type === 'Shopping' ? 'grocery_list' : 'meal_plan',
            n.id, undefined, true
          )
        ),
      ]);
    } catch (err) {
      console.error('Failed to persist clear all:', err);
    }
  };

  const markRead = async (id) => {
    const notif = notifications.find((n) => n.id === id);
    if (!notif) return;

    if (notif.source === 'db') {
      // Update local state for DB notification
      setDbNotifications((curr) => curr.map((n) => n.id === id ? { ...n, read: true } : n));
      // Call API to persist
      try {
        await notificationApi.markAsRead(notif.dbId);
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    } else {
      setPlannerNotifications((curr) => curr.map((n) => n.id === id ? { ...n, read: true } : n));
      const refType = notif.type === 'Shopping' ? 'grocery_list' : 'meal_plan';
      try {
        await notificationApi.upsertPlannerState(refType, id, true, undefined);
      } catch (err) {
        console.error('Failed to mark planner notification as read:', err);
      }
    }
  };

  const openNotification = (notification) => {
    markRead(notification.id);
    if (notification.source === 'db' && notification.actionPath) {
      navigation.navigate(notification.actionPath);
      return;
    }
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
            onDelete={() => deleteNotification(item.id)}
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
