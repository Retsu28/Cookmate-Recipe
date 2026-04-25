import React, { useState } from 'react';
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

const initialNotifications = [
  { id: 1, type: 'Reminder', title: 'Lunch Prep in 30 Minutes', message: 'Time to start your Quinoa Salad for lunch today.', time: '10 MINS AGO', read: false, icon: 'time', iconColor: '#3b82f6' },
  { id: 2, type: 'Expiring', title: 'Chicken Breast Expiring', message: 'Your Chicken Breast expires tomorrow. Better cook it today!', time: '2 HRS AGO', read: false, icon: 'alert-circle', iconColor: '#ef4444' },
  { id: 3, type: 'Shopping', title: 'Shopping List Updated', message: '3 new items added to your list based on next week\'s meal plan.', time: '5 HRS AGO', read: true, icon: 'cart', iconColor: '#f97316' },
  { id: 4, type: 'Tip', title: 'Cooking Tip of the Day', message: 'Add a splash of vinegar when poaching eggs for a perfect shape.', time: '1 DAY AGO', read: true, icon: 'bulb', iconColor: '#f59e0b' },
];

export default function NotificationsScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState('All');

  const filters = ['All', 'Reminders', 'Expiring', 'Shopping', 'Tips'];
  const selectedType = filter.replace(/s$/, '');
  const filteredNotifications = filter === 'All'
    ? notifications
    : notifications.filter((n) => n.type === selectedType);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications((curr) => curr.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => setNotifications([]);

  const markRead = (id) => {
    setNotifications((curr) => curr.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const openNotification = (notification) => {
    markRead(notification.id);
    if (notification.type === 'Reminder' || notification.type === 'Shopping') {
      navigation.navigate('Main', { screen: 'Planner' });
      return;
    }
    if (notification.type === 'Expiring') {
      navigation.navigate('Main', { screen: 'Search' });
      return;
    }
    navigation.navigate('Main', { screen: 'Home' });
  };

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
            <View style={[st.badge, { backgroundColor: '#1c1917' }]}>
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
              style={[st.filterPill, active ? { backgroundColor: '#1c1917' } : { borderWidth: 1, borderColor: colors.border }]}
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
            <Ionicons name="notifications-off-outline" size={44} color={colors.textSubtle} />
            <Text style={[st.emptyText, { color: colors.textSubtle }]}>No notifications yet</Text>
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
