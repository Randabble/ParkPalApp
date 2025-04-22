import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getUserBookings, getHostBookings, updateBookingStatus, Booking, filterOldCancelledBookings } from '@/lib/bookings';
import { router } from 'expo-router';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

export default function BookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading bookings for user:', user.uid, 'role:', user.role);
      
      // Get bookings based on user role
      const userBookings = await getUserBookings(user.uid);
      const hostBookings = user.role === 'host' ? await getHostBookings(user.uid) : [];
      
      console.log('Loaded user bookings:', userBookings.length);
      console.log('Loaded host bookings:', hostBookings.length);
      
      // Combine and filter out old cancelled bookings
      const allBookings = [...userBookings, ...hostBookings]
        .filter(booking => {
          const isOldCancelled = booking.status === 'cancelled' && 
            new Date(booking.end_time) < new Date();
          return !isOldCancelled;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log('Total filtered bookings:', allBookings.length);
      setBookings(allBookings);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: Booking['status']) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      await loadBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'confirmed':
        return '#4CAF50';
      case 'cancelled':
        return '#FF385C';
      case 'completed':
        return '#666';
      default:
        return '#666';
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    // Add debugging logs
    console.log('Booking item:', item);
    console.log('Current user:', user);
    
    // Determine if the current user is a host based on their role
    const isHost = user?.role === 'host';
    console.log('Is host?', isHost, 'user role:', user?.role);
    
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.bookingItem}
        onPress={() => router.push(`/booking/${item.id}`)}
      >
        <View style={styles.bookingHeader}>
          <ThemedText style={styles.listingTitle}>{item.listing_title}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <ThemedText style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <FontAwesome name="calendar" size={16} color="#666" />
          <ThemedText style={styles.detailText}>
            {format(new Date(item.start_time), 'MMM d, yyyy')}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <FontAwesome name="clock-o" size={16} color="#666" />
          <ThemedText style={styles.detailText}>
            {format(new Date(item.start_time), 'h:mm a')} - {format(new Date(item.end_time), 'h:mm a')}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <FontAwesome name="dollar" size={16} color="#666" />
          <ThemedText style={styles.detailText}>
            ${item.total_price}
          </ThemedText>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/messages/${item.id}`)}
          >
            <FontAwesome name="comments" size={20} color="#007AFF" />
            <ThemedText style={styles.actionButtonText}>
              {isHost ? 'Message Driver' : 'Message Host'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading bookings...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>
          {user?.role === 'host' ? 'Incoming Bookings' : 'Your Bookings'}
        </ThemedText>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="calendar" size={50} color="#ccc" />
          <ThemedText style={styles.emptyText}>No bookings yet</ThemedText>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#FF385C',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  bookingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  messageButtonText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
}); 