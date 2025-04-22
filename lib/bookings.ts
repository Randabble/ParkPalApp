import { db, auth } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { createNotification } from './notifications';

export type Booking = {
  id: string;
  user_id: string;
  host_id: string;
  listing_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  cancelled_at?: string;
};

// Define the BookingData type to match our security rules
export type BookingData = {
  listing_id: string;
  user_id: string;  // This must match the authenticated user's ID
  host_id?: string; // Optional host_id field
  start_time: string;
  end_time: string;
  total_price: number;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at?: string;
};

export const createBooking = async (bookingData: BookingData): Promise<string> => {
  try {
    // Log the booking data and current user for debugging
    console.log('Creating booking with data:', bookingData);
    const currentUser = auth.currentUser;
    console.log('Current user:', currentUser?.uid);

    if (!currentUser) {
      throw new Error('User must be authenticated to create a booking');
    }

    // Ensure all required fields are present and valid
    const validatedBookingData = {
      listing_id: bookingData.listing_id,
      user_id: currentUser.uid, // Always use the current user's ID
      host_id: bookingData.host_id || 'unknown', // Include the host_id
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      total_price: typeof bookingData.total_price === 'number' && !isNaN(bookingData.total_price) 
        ? bookingData.total_price 
        : 0,
      status: 'pending' as const,
      created_at: new Date().toISOString()
    };

    // Validate dates
    const startDate = new Date(validatedBookingData.start_time);
    const endDate = new Date(validatedBookingData.end_time);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }

    if (startDate >= endDate) {
      throw new Error('Start time must be before end time');
    }

    // Get the listing to find the host
    const listingDoc = await getDoc(doc(db, 'listings', validatedBookingData.listing_id));
    if (!listingDoc.exists()) {
      throw new Error('Listing not found');
    }

    const listingData = listingDoc.data();
    const hostId = listingData.host_id;

    // Update host_id if it wasn't provided or was set to 'unknown'
    if (!validatedBookingData.host_id || validatedBookingData.host_id === 'unknown') {
      validatedBookingData.host_id = hostId;
    }

    // Create the booking document
    console.log('Attempting to create booking with validated data:', validatedBookingData);
    const bookingRef = await addDoc(collection(db, 'bookings'), validatedBookingData);
    console.log('Booking created successfully with ID:', bookingRef.id);

    // Create notification for the host
    await createNotification(
      hostId,
      'booking_request',
      'New Booking Request',
      `A new booking request has been made for your listing. Please review and respond.`,
      bookingRef.id,
      validatedBookingData.listing_id
    );

    return bookingRef.id;
  } catch (error) {
    console.error('Error creating booking:', error);
    if (error instanceof FirebaseError) {
      console.error('Firebase error code:', error.code);
      console.error('Firebase error message:', error.message);
    }
    throw error;
  }
};

export const createBookingWithCloudFunction = async (bookingData: BookingData): Promise<string> => {
  try {
    // Log the booking data for debugging
    console.log('Creating booking with cloud function:', bookingData);
    
    // Ensure total_price is a valid number
    const validatedBookingData = {
      ...bookingData,
      total_price: typeof bookingData.total_price === 'number' && !isNaN(bookingData.total_price) 
        ? bookingData.total_price 
        : 0,
      created_at: new Date().toISOString()
    };
    
    // Call a Cloud Function to create the booking
    const response = await fetch('https://us-central1-parkpal-app.cloudfunctions.net/createBooking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedBookingData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.bookingId;
  } catch (error) {
    console.error('Error creating booking with cloud function:', error);
    throw error;
  }
};

export async function getOverlappingBookings(
  listingId: string,
  startTime: string,
  endTime: string
): Promise<Booking[]> {
  try {
    const bookingsRef = collection(db, 'bookings');
    // Use a simpler query that's allowed by the security rules
    const q = query(
      bookingsRef,
      where('listing_id', '==', listingId),
      where('status', 'in', ['pending', 'confirmed']),
      orderBy('start_time', 'asc')
    );

    try {
      const querySnapshot = await getDocs(q);
      // Filter the overlapping bookings in memory
      return querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Booking))
        .filter(booking => {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);
          const requestStart = new Date(startTime);
          const requestEnd = new Date(endTime);
          
          return bookingEnd > requestStart && bookingStart < requestEnd;
        });
    } catch (error) {
      // If the index is not ready yet, return an empty array
      if (error instanceof FirebaseError && error.code === 'failed-precondition') {
        console.warn('Index not ready yet, returning empty array for overlapping bookings');
        return [];
      }
      throw error;
    }
  } catch (error) {
    console.error('Error checking overlapping bookings:', error);
    throw error;
  }
}

export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  try {
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('user_id', '==', userId)
    );
    
    const querySnapshot = await getDocs(bookingsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Booking));
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    throw error;
  }
};

export const getHostBookings = async (hostId: string): Promise<Booking[]> => {
  try {
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('host_id', '==', hostId)
    );
    
    const querySnapshot = await getDocs(bookingsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Booking));
  } catch (error) {
    console.error('Error fetching host bookings:', error);
    throw error;
  }
};

export const updateBookingStatus = async (
  bookingId: string, 
  status: Booking['status'],
  userId: string
): Promise<void> => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    if (!bookingDoc.exists()) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingDoc.data();
    
    // Update the booking status
    const updateData: any = { 
      status,
      updated_at: serverTimestamp()
    };

    // Add cancelled_at timestamp if the booking is being cancelled
    if (status === 'cancelled') {
      updateData.cancelled_at = serverTimestamp();
    }

    await updateDoc(bookingRef, updateData);

    // Get listing details for the notification message
    let listingTitle = 'this listing';
    try {
      const listingDoc = await getDoc(doc(db, 'listings', bookingData.listing_id));
      if (listingDoc.exists()) {
        listingTitle = listingDoc.data().title || 'this listing';
      }
    } catch (error) {
      console.error('Error fetching listing details for notification:', error);
    }

    // Create notification for the user
    if (status === 'confirmed') {
      await createNotification({
        user_id: bookingData.user_id,
        type: 'booking_accepted',
        message: `Your booking for ${listingTitle} has been accepted!`,
        booking_id: bookingId,
        listing_id: bookingData.listing_id,
        listing_title: listingTitle
      });
    } else if (status === 'cancelled') {
      // If the user cancelling is the host, notify the driver
      if (userId === bookingData.host_id) {
        await createNotification({
          user_id: bookingData.user_id,
          type: 'booking_declined',
          message: `Your booking for ${listingTitle} has been declined.`,
          booking_id: bookingId,
          listing_id: bookingData.listing_id,
          listing_title: listingTitle
        });
      } 
      // If the user cancelling is the driver, notify the host
      else if (userId === bookingData.user_id) {
        await createNotification({
          user_id: bookingData.host_id,
          type: 'booking_cancelled',
          message: `Booking for ${listingTitle} has been cancelled by the driver.`,
          booking_id: bookingId,
          listing_id: bookingData.listing_id,
          listing_title: listingTitle
        });
      }
    }
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
};

export const getBookings = async (userId: string, role: 'driver' | 'host'): Promise<Booking[]> => {
  try {
    if (role === 'driver') {
      return await getUserBookings(userId);
    } else {
      return await getHostBookings(userId);
    }
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }
};

// Helper function to filter out old cancelled bookings
export const filterOldCancelledBookings = (bookings: Booking[]): Booking[] => {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  
  return bookings.filter(booking => {
    // Keep all non-cancelled bookings
    if (booking.status !== 'cancelled') {
      return true;
    }
    
    // For cancelled bookings, check if they're less than 15 days old
    const cancelledDate = booking.cancelled_at ? new Date(booking.cancelled_at) : null;
    if (!cancelledDate) {
      return true; // Keep bookings without cancelled_at timestamp for now
    }
    
    return cancelledDate > fifteenDaysAgo;
  });
}; 