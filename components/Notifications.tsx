import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { Notification, getUserNotifications, markNotificationAsRead } from '@/lib/notifications';
import { format } from 'date-fns';
import { router } from 'expo-router';

export function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const userNotifications = await getUserNotifications(user.uid);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark notification as read
      await markNotificationAsRead(notification.id);
      
      // Navigate based on notification type
      if (notification.booking_id) {
        router.push(`/booking/${notification.booking_id}`);
      } else if (notification.listing_id) {
        router.push(`/listing/${notification.listing_id}`);
      }
      
      // Refresh notifications
      loadNotifications();
    } catch (error) {
      console.error('Error handling notification:', error);
      Alert.alert('Error', 'Failed to process notification');
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
    >
      <ThemedView style={styles.notificationContent}>
        <ThemedText style={styles.notificationTitle}>{item.title}</ThemedText>
        <ThemedText style={styles.notificationMessage}>{item.message}</ThemedText>
        <ThemedText style={styles.notificationTime}>
          {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
        </ThemedText>
      </ThemedView>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading notifications...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <ThemedText style={styles.emptyText}>No notifications</ThemedText>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  notificationItem: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  unreadNotification: {
    backgroundColor: '#f0f0f0',
  },
  notificationContent: {
    padding: 16,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },
}); 