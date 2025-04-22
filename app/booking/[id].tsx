import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { createNotification } from '../../lib/notifications';
import { MessageThread } from '@/components/MessageThread';
import { FontAwesome } from '@expo/vector-icons';

interface Booking {
  id: string;
  listing_id: string;
  user_id: string;
  host_id: string;
  start_time: any;
  end_time: any;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: any;
}

interface Listing {
  id: string;
  title: string;
  address: string;
  user_id: string;
  price_per_hour: number;
}

export default function BookingDetail() {
  const { id, showMessages: showMessagesParam } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showMessages, setShowMessages] = useState(showMessagesParam === 'true');

  useEffect(() => {
    if (id) {
      loadBookingDetails();
    }
  }, [id]);

  const loadBookingDetails = async () => {
    try {
      setLoading(true);
      console.log('Loading booking details for ID:', id);
      
      const bookingDoc = await getDoc(doc(db, 'bookings', id as string));
      
      if (bookingDoc.exists()) {
        const bookingData = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;
        console.log('Booking data loaded:', bookingData);
        
        // Ensure timestamps are properly handled
        if (bookingData.start_time && !(bookingData.start_time instanceof Timestamp)) {
          bookingData.start_time = Timestamp.fromDate(new Date(bookingData.start_time));
        }
        
        if (bookingData.end_time && !(bookingData.end_time instanceof Timestamp)) {
          bookingData.end_time = Timestamp.fromDate(new Date(bookingData.end_time));
        }
        
        if (bookingData.created_at && !(bookingData.created_at instanceof Timestamp)) {
          bookingData.created_at = Timestamp.fromDate(new Date(bookingData.created_at));
        }
        
        setBooking(bookingData);
        
        // Load listing details
        if (bookingData.listing_id) {
          console.log('Loading listing details for ID:', bookingData.listing_id);
          const listingDoc = await getDoc(doc(db, 'listings', bookingData.listing_id));
          if (listingDoc.exists()) {
            const listingData = { id: listingDoc.id, ...listingDoc.data() } as Listing;
            console.log('Listing data loaded:', listingData);
            setListing(listingData);
          } else {
            console.error('Listing not found for ID:', bookingData.listing_id);
          }
        }
      } else {
        console.error('Booking not found for ID:', id);
        Alert.alert('Error', 'Booking not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading booking details:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async () => {
    if (!booking || !user) return;
    
    try {
      setUpdating(true);
      
      // Update booking status
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'confirmed',
        updated_at: serverTimestamp()
      });
      
      // Create notification for the driver
      await createNotification({
        user_id: booking.user_id,
        type: 'booking_accepted',
        message: `Your booking for ${listing?.title || 'this listing'} has been accepted!`,
        booking_id: booking.id,
        listing_id: booking.listing_id,
        listing_title: listing?.title || 'Unknown Listing'
      });
      
      // Refresh booking details
      loadBookingDetails();
      
      Alert.alert('Success', 'Booking accepted successfully');
    } catch (error) {
      console.error('Error accepting booking:', error);
      Alert.alert('Error', 'Failed to accept booking');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeclineBooking = async () => {
    if (!booking || !user) return;
    
    try {
      setUpdating(true);
      
      // Update booking status
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'cancelled',
        updated_at: serverTimestamp()
      });
      
      // Create notification for the driver
      await createNotification({
        user_id: booking.user_id,
        type: 'booking_declined',
        message: `Your booking for ${listing?.title || 'this listing'} has been declined.`,
        booking_id: booking.id,
        listing_id: booking.listing_id,
        listing_title: listing?.title || 'Unknown Listing'
      });
      
      // Refresh booking details
      loadBookingDetails();
      
      Alert.alert('Success', 'Booking declined');
    } catch (error) {
      console.error('Error declining booking:', error);
      Alert.alert('Error', 'Failed to decline booking');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !user) return;
    
    try {
      setUpdating(true);
      
      // Update booking status
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'cancelled',
        updated_at: serverTimestamp()
      });
      
      // Create notification for the host
      await createNotification({
        user_id: booking.host_id,
        type: 'booking_cancelled',
        message: `Booking for ${listing?.title || 'this listing'} has been cancelled.`,
        booking_id: booking.id,
        listing_id: booking.listing_id,
        listing_title: listing?.title || 'Unknown Listing'
      });
      
      // Refresh booking details
      loadBookingDetails();
      
      Alert.alert('Success', 'Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', 'Failed to cancel booking');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'confirmed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      case 'completed':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Not available';
    try {
      // Handle different date formats
      if (date instanceof Timestamp) {
        return format(date.toDate(), 'MMM dd, yyyy hh:mm a');
      } else if (typeof date === 'string') {
        return format(new Date(date), 'MMM dd, yyyy hh:mm a');
      } else if (date.toDate && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMM dd, yyyy hh:mm a');
      } else {
        console.error('Unknown date format:', date);
        return 'Invalid date format';
      }
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!booking || !listing) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ff0000" />
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isHost = user?.uid === booking.host_id;
  const isDriver = user?.uid === booking.user_id;
  const canManageBooking = isHost && booking.status === 'pending';
  
  // Add debugging logs
  console.log('User ID:', user?.uid);
  console.log('Booking host ID:', booking.host_id);
  console.log('Booking user ID:', booking.user_id);
  console.log('Booking status:', booking.status);
  console.log('Is host?', isHost);
  console.log('Is driver?', isDriver);
  console.log('Can manage booking?', canManageBooking);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Booking Details</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
          <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Listing Information</Text>
        <View style={styles.card}>
          <Text style={styles.listingTitle}>{listing.title}</Text>
          <Text style={styles.listingAddress}>{listing.address}</Text>
          <Text style={styles.listingPrice}>${listing.price_per_hour}/hour</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Start: {formatDate(booking.start_time)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoText}>End: {formatDate(booking.end_time)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Total: ${booking.total_price}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Created: {formatDate(booking.created_at)}</Text>
          </View>
        </View>
      </View>

      {canManageBooking && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.button, styles.acceptButton]} 
            onPress={handleAcceptBooking}
            disabled={updating}
          >
            <Text style={styles.buttonText}>Accept Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.declineButton]} 
            onPress={handleDeclineBooking}
            disabled={updating}
          >
            <Text style={styles.buttonText}>Decline Booking</Text>
          </TouchableOpacity>
        </View>
      )}

      {isDriver && booking.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={handleCancelBooking}
            disabled={updating}
          >
            <Text style={styles.buttonText}>Cancel Booking</Text>
          </TouchableOpacity>
        </View>
      )}

      {updating && (
        <View style={styles.updatingContainer}>
          <ActivityIndicator size="small" color="#0000ff" />
          <Text style={styles.updatingText}>Updating booking...</Text>
        </View>
      )}

      {booking.status === 'confirmed' && (
        <View style={styles.messagesSection}>
          <View style={styles.messagesHeader}>
            <Text style={styles.sectionTitle}>Messages</Text>
            {!showMessages && (
              <TouchableOpacity
                style={styles.showMessagesButton}
                onPress={() => setShowMessages(true)}
              >
                <FontAwesome name="comments" size={16} color="#007AFF" />
                <Text style={styles.showMessagesButtonText}>
                  Show Messages
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {showMessages && (
            <View style={styles.messageThreadContainer}>
              <MessageThread
                bookingId={booking.id}
                otherUserId={user?.uid === booking.user_id ? listing.user_id : booking.user_id}
              />
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listingAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  declineButton: {
    backgroundColor: '#ef4444',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  updatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  updatingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  messagesSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageThreadContainer: {
    height: 400,
    marginTop: 12,
  },
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  showMessagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  showMessagesButtonText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
}); 