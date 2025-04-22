import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, orderBy, updateDoc, doc, limit, serverTimestamp } from 'firebase/firestore';

export type NotificationType = 'booking_request' | 'booking_accepted' | 'booking_declined';

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  booking_id?: string;
  listing_id?: string;
  read: boolean;
  created_at: string;
};

export interface NotificationData {
  user_id: string;
  type: string;
  message: string;
  listing_id?: string;
  booking_id?: string;
  listing_title?: string;
  read?: boolean;
  created_at?: any;
}

export const createNotification = async (notificationData: NotificationData): Promise<string> => {
  try {
    console.log('Creating notification:', notificationData);
    
    const notificationWithTimestamp = {
      ...notificationData,
      created_at: serverTimestamp(),
      read: false
    };
    
    const docRef = await addDoc(collection(db, 'notifications'), notificationWithTimestamp);
    console.log('Notification created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    // First try with the composite index
    try {
      const q = query(
        collection(db, 'notifications'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          user_id: data.user_id,
          type: data.type,
          title: data.title || 'Notification',
          message: data.message || '',
          booking_id: data.booking_id || null,
          listing_id: data.listing_id || null,
          read: data.read || false,
          created_at: data.created_at || new Date().toISOString()
        } as Notification;
      });
    } catch (error) {
      console.error('Error with composite index query:', error);
      
      // If the error is due to a missing index, try a simpler query
      if (error instanceof Error && error.message.includes('requires an index')) {
        console.warn('The notifications query requires an index. Falling back to a simpler query.');
        
        // Fallback to a simpler query without ordering
        const fallbackQuery = query(
          collection(db, 'notifications'),
          where('user_id', '==', userId),
          limit(20) // Limit to 20 notifications to avoid performance issues
        );
        
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const notifications = fallbackSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            user_id: data.user_id,
            type: data.type,
            title: data.title || 'Notification',
            message: data.message || '',
            booking_id: data.booking_id || null,
            listing_id: data.listing_id || null,
            read: data.read || false,
            created_at: data.created_at || new Date().toISOString()
          } as Notification;
        });
        
        // Sort the results in memory
        return notifications.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB.getTime() - dateA.getTime(); // Descending order
        });
      }
      
      // For other errors, throw them
      throw error;
    }
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    // Return an empty array in case of any error
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}; 