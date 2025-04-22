import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, Platform, Linking, Alert, SafeAreaView, Text, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, useRouter } from 'expo-router';
import { storage } from '@/lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { createBooking, getOverlappingBookings } from '@/lib/bookings';
import { createNotification } from '@/lib/notifications';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar } from '@/components/Calendar';
import { format, parseISO } from 'date-fns';
import { FirebaseError } from 'firebase/app';

export default function ListingDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ startTime: string; endTime: string; } | null>(null);

  useEffect(() => {
    loadListing();
  }, [id]);

  const loadListing = async () => {
    try {
      const listingDoc = await getDoc(doc(db, 'listings', id as string));
      if (!listingDoc.exists()) {
        Alert.alert('Error', 'Listing not found');
        router.back();
        return;
      }

      const listingData = listingDoc.data();
      
      // Log the listing data to check the user_id field
      console.log('Listing data from Firestore:', listingData);
      
      // Ensure user_id is set correctly
      const listing = {
        id: listingDoc.id,
        ...listingData,
        user_id: listingData.user_id || listingData.host_id || 'unknown',
        price_per_hour: listingData.price_per_hour || listingData.price || 0,
        // Ensure availability has the correct format
        availability: listingData.availability || {
          start_time: '09:00',
          end_time: '17:00'
        }
      };
      
      console.log('Processed listing data:', listing);
      
      setListing(listing);

      // Load image from Firebase Storage or use direct URL
      if (listingData.images?.[0]) {
        const imageUrl = listingData.images[0];
        if (imageUrl.startsWith('http')) {
          // If it's already a full URL, use it directly
          setImageUrl(imageUrl);
        } else {
          // If it's a storage path, get the download URL
          try {
            const imageRef = ref(storage, `listings/${imageUrl}`);
            const url = await getDownloadURL(imageRef);
            setImageUrl(url);
          } catch (error) {
            console.error('Error loading image from storage:', error);
            // Fallback to the original URL if storage fails
            setImageUrl(imageUrl);
          }
        }
      }
    } catch (error) {
      console.error('Error loading listing:', error);
      Alert.alert('Error', 'Failed to load listing details');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSlotSelect = (date: Date, timeSlot: { startTime: string; endTime: string; }) => {
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot);
  };

  const handleBooking = async () => {
    try {
      if (!user) {
        alert('Please sign in to make a booking');
        return;
      }

      if (!selectedDate || !selectedTimeSlot) {
        alert('Please select a date and time slot');
        return;
      }

      // Parse the time slot
      const startTimeStr = selectedTimeSlot.startTime;
      const endTimeStr = selectedTimeSlot.endTime;

      // Split hours and minutes
      const [startHours, startMinutes = '0'] = startTimeStr.split(':').map(Number);
      const [endHours, endMinutes = '0'] = endTimeStr.split(':').map(Number);

      // Create start and end dates
      const startDate = new Date(selectedDate);
      startDate.setHours(startHours, startMinutes, 0, 0);

      const endDate = new Date(selectedDate);
      endDate.setHours(endHours, endMinutes, 0, 0);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert('Invalid date or time chosen');
        return;
      }

      // Check if start time is before end time
      if (startDate >= endDate) {
        alert('Start time must be before end time');
        return;
      }

      const durationInHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      const totalPrice = durationInHours * (listing?.price_per_hour || 0);

      const bookingData = {
        listing_id: listing?.id || '',
        listing_title: listing?.title || 'Parking Space',
        user_id: user.uid,
        host_id: listing?.user_id || 'unknown',
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        total_price: totalPrice,
        status: 'pending',
      };

      try {
        const overlappingBookings = await getOverlappingBookings(
          listing?.id || '',
          startDate.toISOString(),
          endDate.toISOString()
        );

        if (overlappingBookings.length > 0) {
          alert('This time slot is already booked. Please choose another time.');
          return;
        }
      } catch (error) {
        console.error('Error checking overlapping bookings:', error);
        // Continue with booking creation even if check fails
      }

      console.log('Creating booking with data:', bookingData);
      const bookingId = await createBooking(bookingData);

      // Create notification for the host
      if (listing?.user_id) {
        await createNotification(
          listing.user_id,
          'booking_request',
          'New Booking Request',
          `A new booking request has been made for your listing "${listing?.title || 'Parking Space'}"`,
          bookingId,
          listing?.id || ''
        );
      }

      alert('Booking request sent successfully!');
      router.push('/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      if (error instanceof FirebaseError) {
        console.error('Firebase error code:', error.code);
        console.error('Firebase error message:', error.message);
      }
      alert('Failed to create booking. Please try again.');
    }
  };

  const handleCall = () => {
    const phoneNumber = '1234567890'; // TODO: Get actual phone number
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleMessage = () => {
    // TODO: Implement messaging functionality
    Alert.alert('Coming Soon', 'Messaging feature will be available soon');
  };

  const handleBack = () => {
    router.back();
  };

  const renderActionButtons = () => {
    if (!user) return null;

    const isHost = user.role === 'host';
    const isOwner = listing?.user_id === user.uid;

    return (
      <View style={styles.actionButtons}>
        {isOwner && (
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => router.push(`/(tabs)/edit-listing?id=${id}`)}
          >
            <Text style={styles.actionButtonText}>Edit Listing</Text>
          </TouchableOpacity>
        )}
        {!isHost && (
          <TouchableOpacity
            style={[styles.actionButton, styles.bookButton]}
            onPress={handleBooking}
          >
            <Text style={styles.actionButtonText}>Book Now</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.callButton]}
          onPress={handleCall}
        >
          <FontAwesome name="phone" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.messageButton]}
          onPress={handleMessage}
        >
          <FontAwesome name="comment" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText>Loading...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText>Listing not found</ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{listing.title}</ThemedText>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.container}>
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.content}>
          <ThemedText style={styles.title}>{listing.title}</ThemedText>
          <ThemedText style={styles.price}>${listing.price_per_hour}/hour</ThemedText>
          
          <View style={styles.hostInfo}>
            <FontAwesome name="user" size={20} color="#666" />
            <ThemedText style={styles.hostName}>{listing.host_name || 'Host'}</ThemedText>
            {listing.rating && (
              <View style={styles.rating}>
                <FontAwesome name="star" size={16} color="#FFD700" />
                <ThemedText style={styles.ratingText}>{listing.rating}</ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={styles.description}>{listing.description}</ThemedText>
          
          <View style={styles.location}>
            <FontAwesome name="map-marker" size={20} color="#666" />
            <ThemedText style={styles.locationText}>{listing.address}</ThemedText>
          </View>

          <View style={styles.bookingSection}>
            <ThemedText style={styles.sectionTitle}>Select Date and Time</ThemedText>
            
            <Calendar
              availability={listing.availability}
              onSelectTimeSlot={handleTimeSlotSelect}
              selectedDate={selectedDate}
              selectedTimeSlot={selectedTimeSlot}
              listingId={listing.id}
            />

            {selectedDate && selectedTimeSlot && (
              <View style={styles.selectedBookingInfo}>
                <ThemedText style={styles.selectedBookingText}>
                  Selected: {format(selectedDate, 'MMMM d, yyyy')}
                </ThemedText>
                <ThemedText style={styles.selectedBookingText}>
                  Time: {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                </ThemedText>
              </View>
            )}
          </View>

          {renderActionButtons()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 24,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  image: {
    width: Dimensions.get('window').width,
    height: 200,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    color: '#007AFF',
    marginBottom: 16,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hostName: {
    marginLeft: 8,
    fontSize: 16,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 16,
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 16,
  },
  bookingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  selectedBookingInfo: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  selectedBookingText: {
    fontSize: 16,
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButton: {
    backgroundColor: '#007AFF',
    flex: 1,
    marginRight: 8,
  },
  callButton: {
    backgroundColor: '#4CAF50',
    width: 50,
  },
  messageButton: {
    backgroundColor: '#FF9500',
    width: 50,
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 