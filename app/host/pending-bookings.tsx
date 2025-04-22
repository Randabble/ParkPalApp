import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { updateBookingStatus } from '@/lib/bookings';
import { router } from 'expo-router';

type PendingBooking = {
  id: string;
  user_id: string;
  listing_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: 'pending';
  created_at: string;
  user_name?: string;
  listing_title?: string;
};

export default function PendingBookings() {
  const { user } = useAuth();
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingBookings();
  }, [user]);

  const loadPendingBookings = async () => {
    if (!user) return;
    try {
      // First, get all listings by this host
      const listingsQuery = query(
        collection(db, 'listings'),
        where('host_id', '==', user.uid)
      );
      const listingsSnapshot = await getDocs(listingsQuery);
      const listingIds = listingsSnapshot.docs.map(doc => doc.id);

      // Then, get all pending bookings for these listings
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('listing_id', 'in', listingIds),
        where('status', '==', 'pending')
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      // Get additional details for each booking
      const bookingsWithDetails = await Promise.all(
        bookingsSnapshot.docs.map(async (doc) => {
          const bookingData = doc.data() as PendingBooking;
          const listingDoc = await getDoc(doc(db, 'listings', bookingData.listing_id));
          const userDoc = await getDoc(doc(db, 'users', bookingData.user_id));
          
          return {
            id: doc.id,
            ...bookingData,
            listing_title: listingDoc.data()?.title || 'Unknown Listing',
            user_name: userDoc.data()?.name || 'Unknown User'
          };
        })
      );

      setPendingBookings(bookingsWithDetails);
    } catch (error) {
      console.error('Error loading pending bookings:', error);
      Alert.alert('Error', 'Failed to load pending bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (bookingId: string) => {
    try {
      await updateBookingStatus(bookingId, 'confirmed', user!.uid);
      Alert.alert('Success', 'Booking has been accepted');
      loadPendingBookings(); // Refresh the list
    } catch (error) {
      console.error('Error accepting booking:', error);
      Alert.alert('Error', 'Failed to accept booking');
    }
  };

  const handleDecline = async (bookingId: string) => {
    try {
      await updateBookingStatus(bookingId, 'cancelled', user!.uid);
      Alert.alert('Success', 'Booking has been declined');
      loadPendingBookings(); // Refresh the list
    } catch (error) {
      console.error('Error declining booking:', error);
      Alert.alert('Error', 'Failed to decline booking');
    }
  };

  const renderBooking = ({ item }: { item: PendingBooking }) => (
    <ThemedView style={styles.bookingCard}>
      <ThemedText style={styles.listingTitle}>{item.listing_title}</ThemedText>
      <ThemedText style={styles.userName}>Booked by: {item.user_name}</ThemedText>
      <ThemedText style={styles.dateTime}>
        From: {format(new Date(item.start_time), 'MMM d, yyyy h:mm a')}
      </ThemedText>
      <ThemedText style={styles.dateTime}>
        To: {format(new Date(item.end_time), 'MMM d, yyyy h:mm a')}
      </ThemedText>
      <ThemedText style={styles.price}>Total Price: ${item.total_price}</ThemedText>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.acceptButton]}
          onPress={() => handleAccept(item.id)}
        >
          <ThemedText style={styles.buttonText}>Accept</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.declineButton]}
          onPress={() => handleDecline(item.id)}
        >
          <ThemedText style={styles.buttonText}>Decline</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading pending bookings...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={pendingBookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <ThemedText style={styles.emptyText}>No pending bookings</ThemedText>
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
  bookingCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    marginBottom: 8,
  },
  dateTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },
}); 