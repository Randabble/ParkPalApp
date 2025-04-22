import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getUserNotifications, markNotificationAsRead } from '@/lib/notifications';

interface Notification {
  id: string;
  type: 'booking_request' | 'booking_accepted' | 'booking_declined';
  listing_id: string;
  listing_title: string;
  created_at: Date;
  read: boolean;
  booking_id?: string;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Use the getUserNotifications function instead of direct Firestore query
    const loadNotifications = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the getUserNotifications function which has fallback logic
        const userNotifications = await getUserNotifications(user.uid);
        
        // Convert the notifications to the expected format
        const formattedNotifications = userNotifications.map(notification => ({
          id: notification.id,
          type: notification.type,
          listing_id: notification.listing_id || '',
          listing_title: notification.title || 'Parking Space',
          created_at: new Date(notification.created_at),
          read: notification.read,
          booking_id: notification.booking_id
        }));
        
        setNotifications(formattedNotifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
        setError('Failed to load notifications. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_request':
        return <FontAwesome name="clock-o" size={24} color="#007AFF" />;
      case 'booking_accepted':
        return <FontAwesome name="check-circle" size={24} color="#4CAF50" />;
      case 'booking_declined':
        return <FontAwesome name="times-circle" size={24} color="#F44336" />;
      default:
        return <FontAwesome name="bell" size={24} color="#007AFF" />;
    }
  };

  const getNotificationMessage = (type: string, listingTitle: string) => {
    switch (type) {
      case 'booking_request':
        return `Booking request for ${listingTitle}`;
      case 'booking_accepted':
        return `Your booking for ${listingTitle} was accepted`;
      case 'booking_declined':
        return `Your booking for ${listingTitle} was declined`;
      default:
        return 'New notification';
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark notification as read
      await markNotificationAsRead(notification.id);
      
      // Navigate based on notification type
      if (notification.booking_id) {
        // If there's a booking_id, navigate to the booking details page
        router.push(`/booking/${notification.booking_id}`);
      } else if (notification.listing_id) {
        // If there's only a listing_id, navigate to the listing page
        router.push(`/listing/${notification.listing_id}`);
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="exclamation-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            // Reload notifications
            if (user) {
              getUserNotifications(user.uid)
                .then(userNotifications => {
                  const formattedNotifications = userNotifications.map(notification => ({
                    id: notification.id,
                    type: notification.type,
                    listing_id: notification.listing_id || '',
                    listing_title: notification.title || 'Parking Space',
                    created_at: new Date(notification.created_at),
                    read: notification.read,
                    booking_id: notification.booking_id
                  }));
                  setNotifications(formattedNotifications);
                })
                .catch(err => {
                  console.error('Error reloading notifications:', err);
                  setError('Failed to load notifications. Please try again later.');
                })
                .finally(() => setLoading(false));
            }
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="bell-slash" size={48} color="#999" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notificationItem, !item.read && styles.unreadNotification]}
              onPress={() => handleNotificationPress(item)}
            >
              <View style={styles.iconContainer}>
                {getNotificationIcon(item.type)}
              </View>
              <View style={styles.contentContainer}>
                <Text style={styles.message}>
                  {getNotificationMessage(item.type, item.listing_title)}
                </Text>
                <Text style={styles.timestamp}>
                  {item.created_at.toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
}); 