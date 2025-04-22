import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: Date;
}

export async function sendMessage(
  bookingId: string,
  senderId: string,
  receiverId: string,
  content: string
): Promise<Message> {
  try {
    const messagesRef = collection(db, 'messages');
    const messageData = {
      booking_id: bookingId,
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      created_at: serverTimestamp(),
    };

    const docRef = await addDoc(messagesRef, messageData);
    return {
      id: docRef.id,
      ...messageData,
      created_at: new Date(),
    } as Message;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function getMessages(bookingId: string): Promise<Message[]> {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('booking_id', '==', bookingId),
      orderBy('created_at', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate() || new Date(),
    } as Message));
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
} 