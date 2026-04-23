import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NotificationCard from '../components/NotificationCard';

const initialNotifications = [
  { id: 1, type: 'Reminder', title: 'Lunch in 30 minutes', message: 'Time to prep your Quinoa Salad for lunch.', time: '10 mins ago', read: false, icon: 'time', color: 'bg-blue-50', iconColor: '#3b82f6' },
  { id: 2, type: 'Expiring', title: 'Ingredient Expiring', message: 'Your Chicken Breast expires tomorrow. Better cook it today!', time: '2 hours ago', read: false, icon: 'alert-triangle', color: 'bg-red-50', iconColor: '#ef4444' },
  { id: 3, type: 'Shopping', title: 'Shopping List Update', message: '3 new items added to your list based on next week\'s plan.', time: '5 hours ago', read: true, icon: 'cart', color: 'bg-orange-50', iconColor: '#f97316' },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState('All');

  const filters = ['All', 'Reminders', 'Expiring', 'Shopping'];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 flex-row items-center justify-between bg-white border-b border-stone-200">
        <Text className="text-2xl font-bold text-dark">Notifications</Text>
        <TouchableOpacity>
          <Text className="text-primary font-bold text-xs">Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 py-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-4 mb-6">
          {filters.map((f) => (
            <TouchableOpacity 
              key={f}
              onPress={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl border ${filter === f ? 'bg-primary border-primary' : 'bg-white border-stone-100'}`}
            >
              <Text className={`text-xs font-bold ${filter === f ? 'text-white' : 'text-stone-400'}`}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList 
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <NotificationCard 
              notification={item} 
              onDelete={() => setNotifications(notifications.filter(n => n.id !== item.id))}
            />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 space-y-4">
              <Ionicons name="notifications-off-outline" size={48} color="#d6d3d1" />
              <Text className="text-stone-400 font-medium">No notifications yet</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
